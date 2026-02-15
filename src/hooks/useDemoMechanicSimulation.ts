import { useState, useEffect, useRef, useCallback } from "react";

interface SimulatedLocation {
  lat: number;
  lng: number;
  lastUpdated: Date;
}

interface UseDemoSimulationOptions {
  enabled: boolean;
  customerLat: number;
  customerLng: number;
  startDistance?: number; // km from customer
  speed?: number; // km per update interval
  updateInterval?: number; // ms
}

interface UseDemoSimulationReturn {
  simulatedLocation: SimulatedLocation | null;
  isSimulating: boolean;
  progress: number; // 0-100
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
}

/**
 * Hook for simulating mechanic movement for demo/testing purposes.
 * Moves the simulated mechanic towards the customer location.
 */
export const useDemoMechanicSimulation = ({
  enabled,
  customerLat,
  customerLng,
  startDistance = 3, // 3km away
  speed = 0.3, // 0.3km per update (~18km/h)
  updateInterval = 2000, // every 2 seconds
}: UseDemoSimulationOptions): UseDemoSimulationReturn => {
  const [simulatedLocation, setSimulatedLocation] = useState<SimulatedLocation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const startLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const totalDistanceRef = useRef(0);
  const traveledDistanceRef = useRef(0);

  // Calculate distance between two points in km (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Generate a random starting point at specified distance from customer
  const generateStartPoint = useCallback((): { lat: number; lng: number } => {
    // Random angle in radians
    const angle = Math.random() * 2 * Math.PI;
    
    // Approximate degrees per km (varies by latitude, but close enough for demo)
    const degPerKm = 1 / 111;
    
    // Calculate offset
    const latOffset = startDistance * degPerKm * Math.cos(angle);
    const lngOffset = startDistance * degPerKm * Math.sin(angle) / Math.cos(customerLat * Math.PI / 180);
    
    return {
      lat: customerLat + latOffset,
      lng: customerLng + lngOffset,
    };
  }, [customerLat, customerLng, startDistance]);

  const startSimulation = useCallback(() => {
    if (!enabled) return;

    // Generate start point
    const startPoint = generateStartPoint();
    startLocationRef.current = startPoint;
    totalDistanceRef.current = calculateDistance(
      startPoint.lat, startPoint.lng,
      customerLat, customerLng
    );
    traveledDistanceRef.current = 0;

    setSimulatedLocation({
      lat: startPoint.lat,
      lng: startPoint.lng,
      lastUpdated: new Date(),
    });
    setIsSimulating(true);
    setProgress(0);

    console.log("Demo simulation started:", {
      start: startPoint,
      destination: { lat: customerLat, lng: customerLng },
      distance: totalDistanceRef.current.toFixed(2) + "km",
    });
  }, [enabled, generateStartPoint, calculateDistance, customerLat, customerLng]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setIsSimulating(false);
  }, []);

  const resetSimulation = useCallback(() => {
    stopSimulation();
    setSimulatedLocation(null);
    setProgress(0);
    startLocationRef.current = null;
    totalDistanceRef.current = 0;
    traveledDistanceRef.current = 0;
  }, [stopSimulation]);

  // Simulation movement logic
  useEffect(() => {
    if (!isSimulating || !simulatedLocation || !startLocationRef.current) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setSimulatedLocation(prev => {
        if (!prev || !startLocationRef.current) return prev;

        // Calculate current distance to customer
        const currentDistance = calculateDistance(
          prev.lat, prev.lng,
          customerLat, customerLng
        );

        // If close enough, we've arrived
        if (currentDistance < 0.05) { // Within 50 meters
          stopSimulation();
          setProgress(100);
          console.log("Demo mechanic arrived at customer location!");
          return {
            lat: customerLat,
            lng: customerLng,
            lastUpdated: new Date(),
          };
        }

        // Calculate movement towards customer
        traveledDistanceRef.current += speed;
        const newProgress = Math.min(100, (traveledDistanceRef.current / totalDistanceRef.current) * 100);
        setProgress(newProgress);

        // Interpolate position
        const t = Math.min(1, traveledDistanceRef.current / totalDistanceRef.current);
        const newLat = startLocationRef.current!.lat + (customerLat - startLocationRef.current!.lat) * t;
        const newLng = startLocationRef.current!.lng + (customerLng - startLocationRef.current!.lng) * t;

        // Add some random wobble to make it look realistic
        const wobble = 0.0001;
        const wobbledLat = newLat + (Math.random() - 0.5) * wobble;
        const wobbledLng = newLng + (Math.random() - 0.5) * wobble;

        console.log("Demo mechanic moving:", {
          lat: wobbledLat.toFixed(6),
          lng: wobbledLng.toFixed(6),
          progress: newProgress.toFixed(1) + "%",
        });

        return {
          lat: wobbledLat,
          lng: wobbledLng,
          lastUpdated: new Date(),
        };
      });
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSimulating, simulatedLocation, customerLat, customerLng, speed, updateInterval, calculateDistance, stopSimulation]);

  // Auto-start when enabled changes to true
  useEffect(() => {
    if (enabled && !isSimulating && !simulatedLocation) {
      startSimulation();
    } else if (!enabled) {
      resetSimulation();
    }
  }, [enabled, isSimulating, simulatedLocation, startSimulation, resetSimulation]);

  return {
    simulatedLocation,
    isSimulating,
    progress,
    startSimulation,
    stopSimulation,
    resetSimulation,
  };
};
