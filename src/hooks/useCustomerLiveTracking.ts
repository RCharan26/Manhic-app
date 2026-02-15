import { useEffect, useRef } from 'react';
import { useClerkAuthContext } from '@/contexts/ClerkAuthContext';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";
const UPDATE_INTERVAL_MS = 5000; // Update location every 5 seconds

interface UseCustomerLiveTrackingProps {
  enabled?: boolean; // Only track when true (e.g., when there's an active request)
  lat?: number;
  lng?: number;
}

export function useCustomerLiveTracking({ enabled = false, lat, lng }: UseCustomerLiveTrackingProps) {
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !userId || lat === undefined || lng === undefined) {
      // Cleanup interval
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    const updateLocation = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error('Failed to get authentication token for location update');
          return;
        }

        // Only update if location has changed significantly (avoid unnecessary updates)
        const minDistanceChange = 0.0001; // ~11 meters
        if (lastUpdateRef.current) {
          const latDiff = Math.abs(lat - lastUpdateRef.current.lat);
          const lngDiff = Math.abs(lng - lastUpdateRef.current.lng);
          if (latDiff < minDistanceChange && lngDiff < minDistanceChange) {
            return; // Skip update if movement is minimal
          }
        }

        // Use RLS-bypassing backend function to update customer location
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/update-customer-location`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              lat,
              lng,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to update customer location:', errorData);
          return;
        }

        lastUpdateRef.current = { lat, lng };
        console.log('Customer location updated:', { lat, lng });
      } catch (error) {
        console.error('Error updating customer location:', error);
      }
    };

    // Initial update
    updateLocation();

    // Set up interval for periodic updates
    intervalIdRef.current = setInterval(updateLocation, UPDATE_INTERVAL_MS);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, userId, lat, lng, getToken]);
}
