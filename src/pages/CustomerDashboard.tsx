import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import MapView from "@/components/map/MapView";
import BottomNavigation, { NavItem } from "@/components/navigation/BottomNavigation";
import BottomPanel from "@/components/panels/BottomPanel";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import EmptyState from "@/components/empty/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCustomerVehicles } from "@/hooks/useCustomerVehicles";
import { useCustomerLiveTracking } from "@/hooks/useCustomerLiveTracking";
import { useAuth } from "@clerk/clerk-react";
import { Battery, CircleDot, Fuel, Wrench, Settings, Home, History, MessageSquare, User, Car } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

interface ServiceRequest {
  id: string;
  service_type: string;
  status: string;
  created_at: string;
  estimated_cost: number | null;
  customer_lat?: number;
  customer_lng?: number;
  mechanic_id?: string; // added so dashboard knows assigned mechanic
}

interface NearbyMechanic {
  user_id: string;
  business_name?: string;
  rating?: number;
  total_reviews?: number;
  current_lat?: number;
  current_lng?: number;
  business_lat?: number;
  business_lng?: number;
  display_lat?: number;
  display_lng?: number;
  distance?: number;
  is_available?: boolean;
}

const serviceTypes = [
  { icon: Battery, label: "Battery", type: "battery" },
  { icon: CircleDot, label: "Tire", type: "tire" },
  { icon: Fuel, label: "Fuel", type: "fuel" },
  { icon: Wrench, label: "Other", type: "other" },
];

const customerNavItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/customer-dashboard" },
  { icon: History, label: "History", to: "/service-history" },
  { icon: MessageSquare, label: "Messages", to: "/messaging" },
  { icon: User, label: "Profile", to: "/settings" },
];

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { userId, isLoaded } = useClerkAuthContext();
  const { getToken } = useAuth();
  const { lat, lng, error: locationError } = useGeolocation();
  const { hasVehicles, loading: vehiclesLoading, vehicles } = useCustomerVehicles();
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [mechanics, setMechanics] = useState<NearbyMechanic[]>([]);

  // Enable live location tracking once a mechanic has accepted the request
  const trackingEnabled = activeRequest && ["accepted", "en_route", "arrived", "in_progress"].includes(activeRequest.status);
  useCustomerLiveTracking({
    enabled: !!trackingEnabled,
    lat,
    lng,
  });

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/login");
    }
  }, [userId, isLoaded, navigate]);

  // Redirect to vehicle onboarding if no vehicles saved
  useEffect(() => {
    if (isLoaded && !vehiclesLoading && userId && !hasVehicles) {
      navigate("/vehicle-onboarding");
    }
  }, [isLoaded, vehiclesLoading, userId, hasVehicles, navigate]);

  // helper to load recent requests and determine active request
  const loadRequests = async () => {
    if (!userId) return;

    try {
      const token = await getToken();
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/secure-service-request`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const data: ServiceRequest[] = result.data || [];
        setRecentRequests(data.slice(0, 5));
        const active = data.find((r) =>
          ["pending", "accepted", "en_route", "arrived", "in_progress"].includes(r.status)
        );
        if (active) {
          setActiveRequest(active);
        } else {
          // clear if there is no longer an active request
          setActiveRequest(null);
        }
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadRequests();
  }, [userId, getToken]);

  // if there is an pending request with no mechanic yet, poll until assignment
  useEffect(() => {
    if (!activeRequest || activeRequest.mechanic_id || activeRequest.status !== "pending") return;

    const interval = setInterval(() => {
      loadRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRequest, userId, getToken]);

  // Fetch nearby mechanics
  useEffect(() => {
    if (!lat || !lng) return;

    const fetchMechanics = async () => {
      try {
        const token = await getToken();
        
        // append mechanicId param if we have an assigned mechanic
        let url = `${SUPABASE_URL}/functions/v1/get-nearby-mechanics?lat=${lat}&lng=${lng}`;
        if (activeRequest?.mechanic_id) {
          url += `&mechanicId=${activeRequest.mechanic_id}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Fetched nearby mechanics:", result.data);
          setMechanics((result.data || []) as NearbyMechanic[]);
        } else {
          console.error("Failed to fetch mechanics:", response.status);
        }
      } catch (error) {
        console.error("Error fetching mechanics:", error);
      }
    };

    fetchMechanics();
  }, [lat, lng, getToken, activeRequest]);

  // Get primary vehicle for display
  const primaryVehicle = vehicles.find(v => v.is_primary) || vehicles[0];

  if (!isLoaded) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  // If no vehicles and we've finished loading vehicles, redirect to onboarding
  if (!vehiclesLoading && userId && !hasVehicles) {
    // This will be handled by the useEffect above
  }

  const mapCenter: [number, number] | undefined = 
    lat && lng ? [lng, lat] : undefined;

  // Build markers including user location and mechanics (shop or current location)
  const mapMarkers: Array<{
    id: string;
    lng: number;
    lat: number;
    type: "user" | "mechanic";
    label?: string;
  }> = [];

  if (lat && lng) {
    mapMarkers.push({ id: "user", lat, lng, type: "user" });
  }

  mechanics.forEach((mechanic) => {
    // primary marker uses display coordinates (business or current)
    const latCoord = mechanic.display_lat ?? mechanic.current_lat;
    const lngCoord = mechanic.display_lng ?? mechanic.current_lng;
    if (latCoord && lngCoord) {
      mapMarkers.push({
        id: `mechanic-${mechanic.user_id}`,
        lat: latCoord,
        lng: lngCoord,
        type: "mechanic",
        popup: mechanic.business_name || "Mechanic",
        isAvailable: mechanic.is_available !== undefined ? mechanic.is_available : true,
      });
    }

    // if business coordinates exist and are different, show a separate shop pin
    if (
      mechanic.business_lat &&
      mechanic.business_lng &&
      (mechanic.business_lat !== latCoord || mechanic.business_lng !== lngCoord)
    ) {
      mapMarkers.push({
        id: `mechanic-shop-${mechanic.user_id}`,
        lat: mechanic.business_lat,
        lng: mechanic.business_lng,
        type: "mechanic",
        popup: mechanic.business_name ? `${mechanic.business_name} (shop)` : "Shop",
        isAvailable: mechanic.is_available !== undefined ? mechanic.is_available : true,
      });
    }
  });

  return (
    <>
      <MobileLayout>
        <div className="flex-1 flex flex-col bg-background">
        {/* Map view in box - fixed height */}
        <div className="h-80 m-4 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <MapView
            center={mapCenter}
            zoom={15}
            markers={mapMarkers}
            fitBounds={true}        
            className="w-full h-full"
          />
        </div>

        {/* Settings button overlay */}
        <div className="absolute top-6 left-6 right-6 flex justify-between z-10">
          <Link 
            to="/settings" 
            className="w-11 h-11 bg-card rounded-full shadow-lg flex items-center justify-center border border-border hover:border-primary/50 transition-all"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-foreground" aria-hidden="true" />
          </Link>
          <div className="bg-card rounded-full shadow-lg border border-border">
            <NotificationBell />
          </div>
        </div>

        {/* Active request banner */}
        {activeRequest && (
          <div className="absolute top-28 right-6 left-6 bg-primary text-primary-foreground rounded-xl p-4 shadow-lg z-10 space-y-3">
            <button 
              className="w-full text-left hover:opacity-90 transition-opacity"
              onClick={() => navigate("/request-tracking")}
              aria-label="View active request"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Active Request</p>
                  <p className="text-xs opacity-80 capitalize">{activeRequest.status.replace("_", " ")}</p>
                </div>
                <span className="text-sm font-medium">View →</span>
              </div>
            </button>
            {activeRequest.status === 'accepted' && (
              <button 
                className="w-full bg-white/20 hover:bg-white/30 text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                onClick={() => navigate(`/messaging?requestId=${activeRequest.id}`)}
                aria-label="Message mechanic"
              >
                <MessageSquare className="inline w-4 h-4 mr-2" />
                Message Mechanic
              </button>
            )}
          </div>
        )}

        {/* Scrollable bottom content */}
        <div className="flex-1 overflow-y-auto">
          <BottomPanel showDragIndicator={false}>
            <div className="px-6 pb-4">
            {/* Location status */}
            {locationError && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm" role="alert">
                {locationError}
              </div>
            )}

            {/* My Car quick info */}
            {primaryVehicle && (
              <Link 
                to="/my-cars"
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 mb-4 hover:border-primary/50 transition-all hover:shadow-md"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {primaryVehicle.vehicle_make} {primaryVehicle.vehicle_model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {primaryVehicle.vehicle_year} • {primaryVehicle.license_plate || 'No plate'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary flex-shrink-0">Manage →</span>
              </Link>
            )}

            {/* Quick service types */}
            <h2 className="text-sm font-semibold text-foreground mb-4">Quick Services</h2>
            <div className="grid grid-cols-4 gap-3 mb-6" role="navigation" aria-label="Service types">
              {serviceTypes.map((service) => (
                <Link 
                  key={service.type} 
                  to={`/service-request?type=${service.type}`}
                  className="text-center group focus:outline-none focus:ring-2 focus:ring-primary rounded-xl transition-all"
                  aria-label={`Request ${service.label} service`}
                >
                  <div className="w-14 h-14 bg-card border border-border rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:border-primary group-hover:bg-primary/10 transition-all shadow-sm">
                    <service.icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{service.label}</span>
                </Link>
              ))}
            </div>

            {/* Request button */}
            <Button 
              asChild 
              className="w-full h-14 text-lg font-semibold shadow-lg" 
              size="lg"
              disabled={!!activeRequest}
            >
              <Link to="/service-request">
                {activeRequest ? "Request in Progress" : "Request Assistance"}
              </Link>
            </Button>

            {/* Recent history */}
            <section className="mt-5" aria-labelledby="recent-services-heading">
              <div className="flex justify-between items-center mb-3">
                <h2 id="recent-services-heading" className="font-semibold">Recent Services</h2>
                <Link to="/service-history" className="text-sm text-primary">
                  View all
                </Link>
              </div>
              
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequests.slice(0, 2).map((request) => (
                    <article 
                      key={request.id}
                      className="bg-card border border-border rounded-xl p-4 flex justify-between items-center hover:border-primary/50 transition-all shadow-sm"
                    >
                      <div>
                        <p className="font-semibold capitalize text-foreground">{request.service_type} Service</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={History} 
                  title="No recent services" 
                  className="py-8 bg-card border border-border rounded-xl"
                />
              )}
            </section>
          </div>
        </BottomPanel>
        </div>
        </div>
      </MobileLayout>

      {/* Bottom navigation - rendered outside MobileLayout */}
      <BottomNavigation items={customerNavItems} />
    </>
  );
};

export default CustomerDashboard;
