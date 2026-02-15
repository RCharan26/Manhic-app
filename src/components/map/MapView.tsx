import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// css applied to the leaflet controls; kept as a plain string to avoid parser issues
const leafletCss = ".leaflet-control-attribution { background: hsl(var(--background) / 0.8) !important; backdrop-filter: blur(8px); border-radius: 8px !important; padding: 4px 8px !important; font-size: 10px !important; color: hsl(var(--muted-foreground)) !important; } .leaflet-control-attribution a { color: hsl(var(--primary)) !important; } .custom-marker { background: transparent !important; border: none !important; } .leaflet-control-zoom { border: none !important; box-shadow: var(--shadow-elevated) !important; } .leaflet-control-zoom a { background: hsl(var(--card)) !important; color: hsl(var(--foreground)) !important; border: 1px solid hsl(var(--border)) !important; } .leaflet-control-zoom a:hover { background: hsl(var(--accent)) !important; } @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } } .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }";

interface MapViewProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: Array<{
    id: string;
    lng: number;
    lat: number;
    type: "user" | "mechanic" | "customer" | "shop";
    isAvailable?: boolean;
    label?: string;
    popup?: string;
  }>;
  onLocationSelect?: (lng: number, lat: number) => void;
  interactive?: boolean;
  showUserLocation?: boolean;
  /**
   * When true the map will automatically adjust its view to include all markers whenever
   * the `markers` prop changes. Useful for ensuring out‑of‑bounds mechanics are visible.
   */
  fitBounds?: boolean;
  className?: string;
}

// Custom marker icons
const createUserIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-3 border-white animate-pulse-ring">
        <span class="text-white text-lg">📍</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const createMechanicIcon = (available: boolean = true) => {
  const bgClass = available ? "bg-accent" : "bg-gray-400";
  const animClass = available ? "animate-bounce-subtle" : "";
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="w-12 h-12 ${bgClass} rounded-full flex items-center justify-center shadow-lg border-3 border-white ${animClass}">
        <span class="text-xl">🔧</span>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};
// simple customer icon (different color to avoid confusion with user/mechanic)
const createCustomerIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
        <span class="text-xl">👤</span>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

// shop icon with building
const createShopIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center shadow-lg border-3 border-white">
        <span class="text-xl">🏪</span>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};
const MapView = ({
  center,
  zoom = 14,
  markers = [],
  onLocationSelect,
  interactive = true,
  showUserLocation = true,
  fitBounds = false,
  className = "",
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userLocationMarker = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center: NYC if not provided
    const defaultCenter: [number, number] = center 
      ? [center[1], center[0]] // Leaflet uses [lat, lng]
      : [40.7128, -74.006];

    map.current = L.map(mapContainer.current, {
      center: defaultCenter,
      zoom: zoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: true,
    });

    // Add OpenStreetMap tiles (free, no API key required)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);

    // Handle click for location selection
    if (onLocationSelect) {
      map.current.on("click", (e: L.LeafletMouseEvent) => {
        onLocationSelect(e.latlng.lng, e.latlng.lat);
      });
    }

    // Get user's current location
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map.current && !center) {
            map.current.setView([latitude, longitude], zoom);
          }
        },
        (error) => {
          console.log("Geolocation error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update center when it changes (for live tracking)
  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo([center[1], center[0]], zoom, {
        duration: 1,
      });
    }
  }, [center, zoom]);

  // Update markers when they change (live tracking) and optionally fit bounds
  useEffect(() => {
    if (!map.current) return;

    const currentMarkerIds = new Set(markers.map((m) => m.id));
    
    // Remove markers that are no longer in the list
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      const existingMarker = markersRef.current.get(markerData.id);
      const position: L.LatLngExpression = [markerData.lat, markerData.lng];
      
      if (existingMarker) {
        // Update existing marker position (live tracking)
        existingMarker.setLatLng(position);
      } else {
        // Create new marker
        let icon;
        if (markerData.type === "user") {
          icon = createUserIcon();
        } else if (markerData.type === "customer") {
          icon = createCustomerIcon();
        } else if (markerData.type === "shop") {
          icon = createShopIcon();
        } else {
          icon = createMechanicIcon(Boolean(markerData.isAvailable));
        }
        const newMarker = L.marker(position, { icon }).addTo(map.current!);
        
        // bind a popup if either popup text or label is provided
        const popupText = markerData.popup ?? markerData.label;
        if (popupText) {
          newMarker.bindPopup(popupText);
        }
        // show permanent tooltip only when explicit label is given
        if (markerData.label) {
          newMarker.bindTooltip(markerData.label, {
            permanent: true,
            direction: "top",
            offset: [0, -12],
            className: "text-xs bg-white/80 text-foreground rounded px-1 py-0.5 shadow",
          });
        }
        
        markersRef.current.set(markerData.id, newMarker);
      }
    });

    // optionally fit map to markers
    if (map.current && markers.length > 0 && (typeof fitBounds !== "undefined" ? fitBounds : false)) {
      const latlngs = markers.map((m) => [m.lat, m.lng] as [number, number]);
      try {
        map.current.fitBounds(latlngs as any, { padding: [50, 50] });
      } catch (e) {
        console.warn("Could not fit bounds", e);
      }
    }
  }, [markers, fitBounds]);

  return (
    <div className={"relative " + className}>
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl" />
      
      {/* Map overlay gradient for better UI integration */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/80 to-transparent pointer-events-none rounded-b-2xl" />
      
      {/* Attribution styling */}
      <style>{leafletCss}</style>
    </div>
  );
};

export default MapView;
