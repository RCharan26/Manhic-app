import { useEffect, useRef, useCallback } from "react";
import { useGeolocation } from "./useGeolocation";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

const UPDATE_INTERVAL_MS = 10000; // 10 seconds

/**
 * Hook for mechanics to broadcast their location every 10 seconds while on a job.
 * Updates both mechanic_details (for availability) and service_requests (for customer tracking).
 */
export const useMechanicJobLocation = (
  isOnJob: boolean,
  activeRequestId: string | null
) => {
  const { lat, lng, error, requestLocation } = useGeolocation();
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateLocation = useCallback(async (latitude: number, longitude: number) => {
    if (!userId) return;
    
    // Skip update if location hasn't changed significantly (within ~10 meters)
    if (lastUpdateRef.current) {
      const latDiff = Math.abs(latitude - lastUpdateRef.current.lat);
      const lngDiff = Math.abs(longitude - lastUpdateRef.current.lng);
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        console.log("Location unchanged, skipping update");
        return;
      }
    }

    try {
      const token = await getToken();
      if (!token) {
        console.error('No token available for mechanic location update');
        return;
      }
      
      // Update mechanic_details via secure edge function
      const response = await fetch(
        `https://xspqodyttbwiagpcualr.supabase.co/functions/v1/secure-mechanic-data`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_lat: latitude,
            current_lng: longitude,
            last_location_update: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        console.error("Failed to update mechanic location:", result.error);
        return;
      }

      // Also update service_requests.mechanic_lat/lng for customer real-time tracking
      if (activeRequestId) {
        const { error: requestError } = await supabase
          .from("service_requests")
          .update({
            mechanic_lat: latitude,
            mechanic_lng: longitude,
          })
          .eq("id", activeRequestId)
          .eq("mechanic_id", userId);

        if (requestError) {
          console.error("Failed to update request location:", requestError);
        } else {
          console.log("Broadcast location to customer:", { lat: latitude, lng: longitude });
        }
      }

      lastUpdateRef.current = { lat: latitude, lng: longitude };
    } catch (err) {
      console.error("Error broadcasting location:", err);
    }
  }, [userId, activeRequestId, getToken]);

  useEffect(() => {
    // Clear any existing interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = undefined;
    }

    // Only broadcast when on a job with valid location
    if (!isOnJob || !lat || !lng || !userId) {
      lastUpdateRef.current = null;
      return;
    }

    // Request fresh location
    requestLocation();

    // Update immediately
    updateLocation(lat, lng);

    // Then update every 10 seconds
    updateIntervalRef.current = setInterval(() => {
      if (lat && lng) {
        updateLocation(lat, lng);
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isOnJob, lat, lng, userId, updateLocation, requestLocation]);

  return { lat, lng, error, isTracking: isOnJob && !!lat && !!lng };
};
