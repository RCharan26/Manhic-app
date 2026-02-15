import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface MechanicLocation {
  lat: number;
  lng: number;
  lastUpdated: Date;
}

interface UseMechanicRealtimeLocationOptions {
  requestId: string | null;
  mechanicId: string | null;
  enabled?: boolean;
}

interface UseMechanicRealtimeLocationReturn {
  mechanicLocation: MechanicLocation | null;
  isTracking: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export const useMechanicRealtimeLocation = ({
  requestId,
  mechanicId,
  enabled = true,
}: UseMechanicRealtimeLocationOptions): UseMechanicRealtimeLocationReturn => {
  const [mechanicLocation, setMechanicLocation] = useState<MechanicLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial mechanic location from service_requests
  const fetchInitialLocation = useCallback(async () => {
    if (!requestId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("service_requests")
        .select("mechanic_lat, mechanic_lng")
        .eq("id", requestId)
        .single();

      if (fetchError) {
        console.error("Error fetching mechanic location:", fetchError);
        setError("Could not fetch mechanic location");
        return;
      }

      if (data?.mechanic_lat && data?.mechanic_lng) {
        const now = new Date();
        setMechanicLocation({
          lat: Number(data.mechanic_lat),
          lng: Number(data.mechanic_lng),
          lastUpdated: now,
        });
        setLastUpdate(now);
      }
    } catch (err) {
      console.error("Error in fetchInitialLocation:", err);
      setError("Failed to load mechanic location");
    }
  }, [requestId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enabled || !requestId) {
      setIsTracking(false);
      return;
    }

    // Fetch initial location
    fetchInitialLocation();

    // Set up real-time subscription for location updates on service_requests
    const channel = supabase
      .channel(`mechanic-location-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newData = payload.new as {
            mechanic_lat?: number | string | null;
            mechanic_lng?: number | string | null;
          };

          if (newData.mechanic_lat != null && newData.mechanic_lng != null) {
            const now = new Date();
            setMechanicLocation({
              lat: Number(newData.mechanic_lat),
              lng: Number(newData.mechanic_lng),
              lastUpdated: now,
            });
            setLastUpdate(now);
            setError(null);
            console.log("Real-time mechanic location update:", {
              lat: Number(newData.mechanic_lat),
              lng: Number(newData.mechanic_lng),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsTracking(true);
          setError(null);
          console.log("Subscribed to mechanic location updates for request:", requestId);
        } else if (status === "CHANNEL_ERROR") {
          setError("Failed to connect to location updates");
          setIsTracking(false);
        }
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      if (channelRef.current) {
        console.log("Unsubscribing from mechanic location updates");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, requestId, fetchInitialLocation]);

  // Also subscribe to mechanic_details for more frequent updates if mechanic is online
  useEffect(() => {
    if (!enabled || !mechanicId) return;

    const detailsChannel = supabase
      .channel(`mechanic-details-${mechanicId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mechanic_details",
          filter: `user_id=eq.${mechanicId}`,
        },
        (payload) => {
          const newData = payload.new as {
            current_lat?: number | string | null;
            current_lng?: number | string | null;
          };

          if (newData.current_lat != null && newData.current_lng != null) {
            const now = new Date();
            setMechanicLocation({
              lat: Number(newData.current_lat),
              lng: Number(newData.current_lng),
              lastUpdated: now,
            });
            setLastUpdate(now);
            console.log("Real-time mechanic details location update:", {
              lat: Number(newData.current_lat),
              lng: Number(newData.current_lng),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to mechanic details updates for:", mechanicId);
        }
      });

    return () => {
      supabase.removeChannel(detailsChannel);
    };
  }, [enabled, mechanicId]);

  return {
    mechanicLocation,
    isTracking,
    error,
    lastUpdate,
  };
};
