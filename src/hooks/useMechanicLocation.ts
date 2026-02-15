import { useEffect, useRef } from "react";
import { useGeolocation } from "./useGeolocation";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";

/**
 * Hook for mechanics to update their location in real-time
 * Updates location every 30 seconds when available
 */
export const useMechanicLocation = (isAvailable: boolean) => {
  const { lat, lng, error } = useGeolocation();
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  const updateLocation = async (latitude: number, longitude: number) => {
    if (!userId) return;
    
    try {
      const token = await getToken();
      if (!token) {
        console.error('No token available for location update');
        return;
      }
      
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
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        console.error("Failed to update mechanic location:", result.error);
      }
    } catch (err) {
      console.error("Error updating location:", err);
    }
  };

  useEffect(() => {
    if (!isAvailable || !lat || !lng || !userId) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      return;
    }

    // Update immediately
    updateLocation(lat, lng);

    // Then update every 30 seconds
    updateIntervalRef.current = setInterval(() => {
      if (lat && lng) {
        updateLocation(lat, lng);
      }
    }, 30000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isAvailable, lat, lng, userId]);

  return { lat, lng, error };
};
