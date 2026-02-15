import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
import BottomNavigation, { NavItem } from "@/components/navigation/BottomNavigation";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import EmptyState from "@/components/empty/EmptyState";
import MapView from "@/components/map/MapView";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useMechanicLocation } from "@/hooks/useMechanicLocation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, convertToINR } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Home, DollarSign, MessageSquare, User, MapPin, Clock, 
  Battery, CircleDot, Fuel, Wrench, ChevronRight, Bell
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
};

interface PendingRequest {
  id: string;
  service_type: string;
  customer_lat: number | string;
  customer_lng: number | string;
  description: string | null;
  estimated_cost: number | string | null;
  created_at: string;
  distance?: number;
}

interface ServiceRequest extends PendingRequest {
  customer_id: string;
  mechanic_id: string | null;
  status: string;
  customer_address: string | null;
}

interface MechanicDetails {
  is_available: boolean;
  rating: number | string;
  total_reviews: number;
  business_name?: string | null;
  business_lat?: number | null;
  business_lng?: number | null;
}

const serviceIcons: Record<string, typeof Battery> = {
  battery: Battery,
  tire: CircleDot,
  fuel: Fuel,
  lockout: Wrench,
  towing: Wrench,
  other: Wrench,
};

const mechanicNavItems: NavItem[] = [
  { icon: Home, label: "Home", to: "/mechanic-dashboard" },
  { icon: DollarSign, label: "Earnings", to: "/earnings" },
  { icon: MessageSquare, label: "Messages", to: "/messaging" },
  { icon: User, label: "Profile", to: "/settings" },
];

const MechanicDashboard = () => {
  const navigate = useNavigate();
  const { userId, profile, isLoaded } = useClerkAuthContext();
  const { getToken } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeJob, setActiveJob] = useState<PendingRequest | null>(null);
  const [liveCustomerLocation, setLiveCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const customerLocationChannelRef = useRef<any>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayJobs, setTodayJobs] = useState(0);
  const [mechanicDetails, setMechanicDetails] = useState<MechanicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { lat: mechanicLat, lng: mechanicLng, error: locationError } = useMechanicLocation(isOnline);

  // compute map center and markers based on either stored "current" location
  // from mechanicDetails or live GPS location from the hook.
  const mapCenter: [number, number] | undefined =
    mechanicDetails?.current_lat && mechanicDetails?.current_lng
      ? [mechanicDetails.current_lng, mechanicDetails.current_lat]
      : mechanicLat && mechanicLng
      ? [mechanicLng, mechanicLat]
      : undefined;

  const shopMarkers =
    mechanicDetails?.current_lat && mechanicDetails?.current_lng
      ? [
          {
            id: "mechanic-shop",
            lat: mechanicDetails.current_lat,
            lng: mechanicDetails.current_lng,
            type: "mechanic",
            popup: mechanicDetails.business_name || "My Shop",
          },
        ]
      : mechanicLat && mechanicLng
      ? [
          {
            id: "mechanic-current",
            lat: mechanicLat,
            lng: mechanicLng,
            type: "mechanic",
            popup: mechanicDetails?.business_name || "Your location",
          },
        ]
      : [];

  // when there is an active job, also show the customer's location on the map

  // Use live location if available, else fallback to static job location
  const customerMarkers = activeJob
    ? [
        {
          id: "customer-location",
          lat: liveCustomerLocation?.lat ?? Number(activeJob.customer_lat),
          lng: liveCustomerLocation?.lng ?? Number(activeJob.customer_lng),
          type: "customer",
          popup: "Customer",
        },
      ]
    : [];

  const mapMarkers = [...shopMarkers, ...customerMarkers];
  
  useEffect(() => {
    if (locationError) {
      toast.error("Location services required to receive jobs");
    }
  }, [locationError]);

  useEffect(() => {
    if (isLoaded && !userId) {
      navigate("/login");
    }
  }, [userId, isLoaded, navigate]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time customer location updates
    if (activeJob && activeJob.customer_id) {
      // Clean up previous channel if any
      if (customerLocationChannelRef.current) {
        supabase.removeChannel(customerLocationChannelRef.current);
        customerLocationChannelRef.current = null;
      }
      const channel = supabase
        .channel(`customer-location-${activeJob.customer_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'customer_live_location',
            filter: `user_id=eq.${activeJob.customer_id}`,
          },
          (payload) => {
            if (payload.new && payload.new.lat && payload.new.lng) {
              setLiveCustomerLocation({ lat: payload.new.lat, lng: payload.new.lng });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'customer_live_location',
            filter: `user_id=eq.${activeJob.customer_id}`,
          },
          (payload) => {
            if (payload.new && payload.new.lat && payload.new.lng) {
              setLiveCustomerLocation({ lat: payload.new.lat, lng: payload.new.lng });
            }
          }
        )
        .subscribe();
      customerLocationChannelRef.current = channel;
    } else {
      // No active job, clear subscription and live location
      if (customerLocationChannelRef.current) {
        supabase.removeChannel(customerLocationChannelRef.current);
        customerLocationChannelRef.current = null;
      }
      setLiveCustomerLocation(null);
    }

    // Cleanup on unmount or job change
    return () => {
      if (customerLocationChannelRef.current) {
        supabase.removeChannel(customerLocationChannelRef.current);
        customerLocationChannelRef.current = null;
      }
    };
  }, [activeJob]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Failed to get authentication token');
        }
        
        // Fetch mechanic details via secure API
        const detailsResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-mechanic-data`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (detailsResponse.ok) {
          const detailsResult = await detailsResponse.json();
          if (detailsResult.data) {
            setMechanicDetails(detailsResult.data);
            setIsOnline(detailsResult.data.is_available ?? false);
          }
        }

        // Fetch assigned requests for this mechanic via secure API
        const requestsResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request?role=mechanic`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (requestsResponse.ok) {
          const requestsResult = await requestsResponse.json();
          const data = requestsResult.data || [];
          
          // Count today's completed jobs and earnings
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const completedToday = data.filter((r: any) => 
            r.status === "completed" && 
            new Date(r.completed_at) >= today
          );
          
          setTodayJobs(completedToday.length);
          const earnings = completedToday.reduce(
            (sum: number, job: any) => sum + (Number(job.final_cost) || 0), 
            0
          );
          setTodayEarnings(earnings);
        }

        // Fetch pending requests via secure API (unassigned requests)
        console.log("Fetching pending requests...");
        const pendingResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request?role=mechanic&pending=true`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (pendingResponse.ok) {
          const pendingResult = await pendingResponse.json();
          const requests = pendingResult.data || [];
          console.log("Fetched pending requests:", requests.length);

          if (requests.length > 0 && mechanicLat && mechanicLng) {
            // Calculate distance for each request and filter by service radius
            const serviceRadius = mechanicDetails?.service_radius_km || 25;
            const requestsWithDistance = requests
              .map((req: any) => ({
                ...req,
                distance: calculateDistance(
                  mechanicLat,
                  mechanicLng,
                  Number(req.customer_lat),
                  Number(req.customer_lng)
                ),
              }))
              .filter((req: any) => req.distance <= serviceRadius)
              .sort((a: any, b: any) => a.distance - b.distance)
              .slice(0, 10);
            
            console.log("Requests after filtering by distance:", requestsWithDistance.length);
            setPendingRequests(requestsWithDistance);
          } else if (requests.length > 0) {
            setPendingRequests(requests.slice(0, 10));
          }
        } else {
          console.error("Failed to fetch pending requests:", pendingResponse.status);
        }

        // Fetch mechanic's currently assigned/active job
        console.log("Fetching assigned requests...");
        const assignedResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request?role=mechanic`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (assignedResponse.ok) {
          const assignedResult = await assignedResponse.json();
          const assignedRequests = assignedResult.data || [];
          console.log("Fetched assigned requests:", assignedRequests.length);

          // Find the currently active job (not completed, not cancelled)
          const activeJobRequest = assignedRequests.find((req: any) =>
            ["accepted", "en_route", "arrived", "in_progress"].includes(req.status)
          );

          if (activeJobRequest) {
            console.log("Found active job:", activeJobRequest.id);
            setActiveJob(activeJobRequest);
          }
        } else {
          console.error("Failed to fetch assigned requests:", assignedResponse.status);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime subscription for new pending requests
    const channel = supabase
      .channel("mechanic-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_requests",
          filter: "status=eq.pending",
        },
        (payload) => {
          setPendingRequests((prev) => [payload.new as PendingRequest, ...prev]);
          toast.info("New service request available!", {
            action: {
              label: "View",
              onClick: () => navigate("/job-management", { state: { requestId: payload.new.id } }),
            },
          });
        }
      )
      // Also subscribe to updates on assigned requests (for when status changes)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
        },
        (payload) => {
          const updated = payload.new as ServiceRequest;
          // Update active job if it changed
          if (activeJob && updated.id === activeJob.id) {
            if (["completed", "cancelled"].includes(updated.status)) {
              setActiveJob(null);
            } else {
              setActiveJob(updated as PendingRequest);
            }
          }
          // Remove from pending if someone else accepted it
          setPendingRequests((prev) => prev.filter(req => req.id !== updated.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, navigate, getToken]);

  const toggleAvailability = async () => {
    if (!userId) return;

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      console.log("Updating availability to:", newStatus);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/secure-mechanic-data`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ is_available: newStatus }),
        }
      );

      console.log("Availability update response status:", response.status);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        responseData = { error: `HTTP ${response.status}` };
      }
      console.log("Availability update response:", responseData);

      if (!response.ok) {
        throw new Error(responseData?.error || `HTTP ${response.status}`);
      }

      toast.success(newStatus ? "You're now online" : "You're now offline");
    } catch (error) {
      setIsOnline(!newStatus);
      const errorMsg = error instanceof Error ? error.message : "Failed to update availability";
      console.error("Availability update error:", errorMsg);
      toast.error(errorMsg);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!isLoaded || loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <MobileLayout>
        <div className="flex-1 flex flex-col bg-gradient-radial from-muted/30 via-background to-background">
          {/* Header with availability toggle */}
        <header className="bg-card border-b border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Hello, {profile?.full_name?.split(" ")[0] || "Mechanic"}!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isOnline ? "✓ You're available for requests" : "• You're currently offline"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-full px-3 py-1.5 shadow-sm hover:border-primary/50 transition-all">
                <span className={`text-xs font-bold ${isOnline ? "text-success" : "text-muted-foreground"}`}>
                  {isOnline ? "Online" : "Offline"}
                </span>
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={toggleAvailability}
                  aria-label="Toggle availability"
                />
              </label>
            </div>
          </div>
        </header>

        {/* Shop map (shows your garage/business) */}
        <section className="p-4" aria-labelledby="map-heading">
          <div className="h-48 mb-4 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <MapView
              center={mapCenter}
              zoom={14}
              markers={mapMarkers}
              fitBounds={!!activeJob}
              className="w-full h-full"
              interactive={true}
              showUserLocation={false}
            />
          </div>
        </section>

        {/* Earnings summary */}
        <section className="p-4" aria-labelledby="earnings-heading">
          <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-6 shadow-primary border border-primary/40 relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <p id="earnings-heading" className="text-sm opacity-90 font-semibold">Today's Earnings</p>
              <p className="text-4xl font-extrabold mt-2">{formatINR(todayEarnings)}</p>
              <div className="flex items-center gap-6 mt-5">
                <div>
                  <p className="text-xs opacity-80 font-medium">Jobs completed</p>
                  <p className="text-2xl font-bold mt-1">{todayJobs}</p>
                </div>
                <div className="w-px h-12 bg-white/30" aria-hidden="true" />
                <div>
                  <p className="text-xs opacity-80 font-medium">Rating</p>
                  <p className="text-2xl font-bold flex items-center gap-1 mt-1">
                    <span className="text-warning">★</span> 
                    {mechanicDetails?.rating ? Number(mechanicDetails.rating).toFixed(1) : "N/A"}
                  </p>
                </div>
              </div>
              <Link to="/earnings" className="inline-flex items-center gap-1 text-sm mt-5 opacity-90 hover:opacity-100 font-semibold transition-opacity">
                View details →
              </Link>
            </div>
          </div>
        </section>

        {/* Current job / Incoming requests */}
        <section className="flex-1 px-4 pb-4 overflow-y-auto" aria-labelledby="requests-heading">
          {activeJob ? (
            <>
              <h2 id="requests-heading" className="font-semibold mb-3">Current Job</h2>
              <div className="mb-6">
                {(() => {
                  const Icon = serviceIcons[activeJob.service_type] || Wrench;
                  return (
                    <article
                      className="bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/60 rounded-xl p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all"
                      onClick={() => navigate("/job-management", { state: { requestId: activeJob.id } })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && navigate("/job-management", { state: { requestId: activeJob.id } })}
                      aria-label={`Current ${activeJob.service_type} service job`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/30" aria-hidden="true">
                          <Icon className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="font-bold capitalize text-lg text-foreground">{activeJob.service_type} Service</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Clock className="w-4 h-4" aria-hidden="true" />
                                <span>Started {getTimeAgo(activeJob.created_at)}</span>
                              </div>
                            </div>
                            <span className="font-bold text-primary text-lg flex-shrink-0">
                              {formatINR(activeJob.estimated_cost)}
                            </span>
                          </div>
                          {activeJob.description && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                              {activeJob.description}
                            </p>
                          )}
                          <div className="mt-4 pt-4 border-t border-primary/20">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">
                              ✓ Assigned to you • Click to continue
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })()}
              </div>

              {pendingRequests.length > 0 && (
                <>
                  <h3 className="font-semibold mb-3">Available Requests</h3>
                  <ul className="space-y-3">
                    {pendingRequests.map((request) => {
                      const Icon = serviceIcons[request.service_type] || Wrench;
                      return (
                        <li key={request.id}>
                          <article
                            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
                            onClick={() => navigate("/job-management", { state: { requestId: request.id } })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && navigate("/job-management", { state: { requestId: request.id } })}
                            aria-label={`${request.service_type} service request`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary/20" aria-hidden="true">
                                <Icon className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="font-semibold capitalize text-foreground">{request.service_type}</p>
                                  <span className="font-semibold text-primary text-sm flex-shrink-0">
                                    {formatINR(request.estimated_cost)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">~{request.distance?.toFixed(1) || "0"} km away</p>
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 id="requests-heading" className="font-semibold">Incoming Requests</h2>
                {pendingRequests.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {pendingRequests.length} new
                  </span>
                )}
              </div>

              {!isOnline ? (
                <EmptyState
                  icon={Bell}
                  title="You're offline"
                  description="Turn on availability to receive requests"
                  action={
                    <Button onClick={toggleAvailability}>Go Online</Button>
                  }
                  className="bg-muted rounded-xl"
                />
              ) : pendingRequests.length > 0 ? (
                <ul className="space-y-3">
                  {pendingRequests.map((request) => {
                    const Icon = serviceIcons[request.service_type] || Wrench;
                    return (
                      <li key={request.id}>
                        <article
                          className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
                          onClick={() => navigate("/job-management", { state: { requestId: request.id } })}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && navigate("/job-management", { state: { requestId: request.id } })}
                          aria-label={`${request.service_type} service request`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20" aria-hidden="true">
                              <Icon className="w-7 h-7 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <p className="font-semibold capitalize text-foreground">{request.service_type} Service</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Clock className="w-4 h-4" aria-hidden="true" />
                                    <span>{getTimeAgo(request.created_at)}</span>
                                  </div>
                                </div>
                                <span className="font-bold text-primary text-lg flex-shrink-0">
                                  {formatINR(request.estimated_cost)}
                                </span>
                              </div>
                              {request.description && (
                                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                  {request.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4" aria-hidden="true" />
                                  <span>~{request.distance?.toFixed(1) || "0"} km away</span>
                                </div>
                                <div className="flex items-center gap-1 text-primary text-sm font-semibold">
                                  <span>View Details</span>
                                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="No incoming requests"
                  description="New requests will appear here"
                  className="bg-muted rounded-xl"
                />
              )}
            </>
          )}
        </section>

        {/* Stats cards */}
        <section className="px-4 pb-4" aria-label="Statistics">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-sm">
              <p className="text-3xl font-bold text-foreground">{todayJobs}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Jobs Today</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-sm">
              <p className="text-3xl font-bold text-primary">
                {mechanicDetails?.rating ? `${Number(mechanicDetails.rating).toFixed(1)}` : "-"}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Rating</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-sm">
              <p className="text-3xl font-bold text-foreground">{mechanicDetails?.total_reviews || 0}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">Reviews</p>
            </div>
          </div>
        </section>
      </div>
    </MobileLayout>

    {/* Bottom navigation - rendered outside MobileLayout */}
    <BottomNavigation items={mechanicNavItems} />
    </>
  );
};

export default MechanicDashboard;
