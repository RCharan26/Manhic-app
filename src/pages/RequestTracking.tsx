import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import MobileLayout from "@/components/layout/MobileLayout";
import MapView from "@/components/map/MapView";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDirectINR, convertToINR } from "@/lib/utils";
import { toast } from "sonner";
import { Phone, MessageSquare, ChevronLeft, Clock, CheckCircle2, Truck, Wrench, XCircle, Radio, Play } from "lucide-react";
import EmergencyContact from "@/components/emergency/EmergencyContact";
import { useMechanicRealtimeLocation } from "@/hooks/useMechanicRealtimeLocation";
import { useDemoMechanicSimulation } from "@/hooks/useDemoMechanicSimulation";
import { Progress } from "@/components/ui/progress";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

interface ServiceRequest {
  id: string;
  service_type: string;
  status: string;
  customer_lat: number | string;
  customer_lng: number | string;
  mechanic_lat: number | string | null;
  mechanic_lng: number | string | null;
  mechanic_id: string | null;
  estimated_cost: number | string | null;
  eta_minutes: number | null;
  created_at: string;
}

interface MechanicProfile {
  id: string;
  business_name?: string;
  full_name?: string;
  rating?: number;
  total_reviews?: number;
  business_lat?: number;
  business_lng?: number;
}

const statusSteps = [
  { status: "pending", label: "Finding mechanic", icon: Clock },
  { status: "accepted", label: "Mechanic assigned", icon: CheckCircle2 },
  { status: "en_route", label: "On the way", icon: Truck },
  { status: "arrived", label: "Arrived", icon: CheckCircle2 },
  { status: "in_progress", label: "Working on it", icon: Wrench },
  { status: "completed", label: "Completed", icon: CheckCircle2 },
];

const RequestTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [mechanicProfile, setMechanicProfile] = useState<MechanicProfile | null>(null);
  
  // Demo mode state - can be enabled via ?demo=true query param or toggle
  const [demoMode, setDemoMode] = useState(() => searchParams.get("demo") === "true");

  // Real-time mechanic location tracking (for real mechanics)
  const { mechanicLocation, isTracking, lastUpdate } = useMechanicRealtimeLocation({
    requestId: request?.id || null,
    mechanicId: request?.mechanic_id || null,
    enabled: !demoMode && !!request && ["accepted", "en_route", "arrived", "in_progress"].includes(request.status),
  });

  // Demo simulation (for testing without real mechanic)
  const customerLat = request ? Number(request.customer_lat) : 0;
  const customerLng = request ? Number(request.customer_lng) : 0;
  
  const {
    simulatedLocation,
    isSimulating,
    progress: demoProgress,
    startSimulation,
    resetSimulation,
  } = useDemoMechanicSimulation({
    enabled: demoMode && !!request,
    customerLat,
    customerLng,
    startDistance: 3,
    speed: 0.3,
    updateInterval: 2000,
  });

  // Toggle demo mode
  const handleDemoToggle = (enabled: boolean) => {
    setDemoMode(enabled);
    if (enabled) {
      setSearchParams({ demo: "true" });
      toast.info("Demo mode enabled - simulating mechanic movement");
    } else {
      searchParams.delete("demo");
      setSearchParams(searchParams);
      resetSimulation();
      toast.info("Demo mode disabled");
    }
  };

  const handleCallMechanic = async () => {
    if (!request?.mechanic_id) {
      toast.error("Mechanic not found");
      return;
    }

    try {
      // Fetch mechanic phone from profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", request.mechanic_id)
        .single();

      if (error || !profile?.phone) {
        toast.error("Mechanic phone number not available");
        return;
      }

      // Open phone dialer
      const phoneUrl = `tel:${profile.phone}`;
      window.location.href = phoneUrl;
      toast.success(`Calling mechanic...`);
    } catch (error) {
      console.error("Error calling mechanic:", error);
      toast.error("Failed to initiate call");
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchRequest = async () => {
      try {
        let token: string | null = null;
        let retries = 3;
        
        while (!token && retries > 0) {
          try {
            token = await getToken();
            if (token) break;
          } catch (e) {
            console.warn(`Token fetch attempt failed, retries left: ${retries - 1}`, e);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        if (!token) {
          throw new Error('Failed to obtain authentication token after multiple attempts');
        }
        
        const requestId = location.state?.requestId;
        
        // Use secure edge function to fetch request
        const url = requestId 
          ? `${SUPABASE_URL}/functions/v1/secure-service-request?id=${requestId}`
          : `${SUPABASE_URL}/functions/v1/secure-service-request`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch request');
        }

        const result = await response.json();
        let data = result.data;
        
        // If we got an array, find the active request
        if (Array.isArray(data)) {
          data = data.find((r: ServiceRequest) => 
            ["pending", "accepted", "en_route", "arrived", "in_progress"].includes(r.status)
          ) || null;
        }

        if (!data) {
          toast.info("No active requests found");
          navigate("/customer-dashboard");
          return;
        }

        setRequest(data);
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching request:", error);
        toast.error("Could not load request details");
        navigate("/customer-dashboard");
      }
    };

    fetchRequest();

    // Set up real-time subscription for request status updates
    const channel = supabase
      .channel("request-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          setRequest(payload.new as ServiceRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fetch mechanic profile when mechanic_id changes
  useEffect(() => {
    if (!request?.mechanic_id) {
      setMechanicProfile(null);
      return;
    }

    const fetchMechanicProfile = async () => {
      try {
        let token: string | null = null;
        try {
          token = await getToken();
        } catch (e) {
          console.warn("Could not get token for mechanic profile fetch", e);
        }

        // Use secure API if token available, otherwise fall back to direct query
        if (token) {
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/secure-mechanic-data`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.data) {
              setMechanicProfile({
                id: result.data.id || request.mechanic_id,
                full_name: result.data.full_name,
                business_name: result.data.business_name,
                business_lat: result.data.business_lat,
                business_lng: result.data.business_lng,
              });
              return;
            }
          }
        }

        // Fallback: query profiles and mechanic_details tables directly using regular Supabase client
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('user_id', request.mechanic_id)
          .single();

        if (profileError) {
          console.error('Error fetching mechanic profile:', profileError);
          return;
        }

        // Also fetch mechanic_details for business location
        const { data: mechanicDetails, error: detailsError } = await supabase
          .from('mechanic_details')
          .select('business_name, business_lat, business_lng')
          .eq('user_id', request.mechanic_id)
          .single();

        if (profile) {
          setMechanicProfile({
            id: profile.id || request.mechanic_id,
            full_name: profile.full_name,
            business_name: mechanicDetails?.business_name,
            business_lat: mechanicDetails?.business_lat,
            business_lng: mechanicDetails?.business_lng,
          });
        }
      } catch (error) {
        console.error('Error fetching mechanic profile:', error);
      }
    };

    fetchMechanicProfile();
  }, [request?.mechanic_id, getToken]);

  const handleCancel = async () => {
    if (!request) return;

    try {
      let token: string | null = null;
      let retries = 3;
      
      while (!token && retries > 0) {
        try {
          token = await getToken();
          if (token) break;
        } catch (e) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-service-request?id=${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: 'Cancelled by customer',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel request');
      }

      toast.success("Request cancelled");
      navigate("/customer-dashboard");
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error(error.message || "Failed to cancel request");
    }
  };

  const getCurrentStepIndex = () => {
    if (!request) return 0;
    return statusSteps.findIndex((step) => step.status === request.status);
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!request) {
    return null;
  }

  // Use location from either real tracking or demo simulation
  const effectiveLocation = demoMode && simulatedLocation 
    ? simulatedLocation 
    : mechanicLocation;

  const markers: Array<{
    id: string;
    lat: number;
    lng: number;
    type: "user" | "mechanic" | "shop";
    label?: string;
  }> = [
    { id: "user", lat: customerLat, lng: customerLng, type: "user" },
  ];

  if (effectiveLocation && (request.status !== "pending" || demoMode)) {
    markers.push({
      id: "mechanic",
      lat: effectiveLocation.lat,
      lng: effectiveLocation.lng,
      type: "mechanic",
      label: demoMode ? "Demo mechanic" : "Your mechanic",
    });
  }

  // Add mechanic shop location if available
  if (mechanicProfile?.business_lat && mechanicProfile?.business_lng) {
    markers.push({
      id: "shop",
      lat: mechanicProfile.business_lat,
      lng: mechanicProfile.business_lng,
      type: "shop",
      label: mechanicProfile.business_name || "Shop",
    });
  }

  const currentStep = getCurrentStepIndex();

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col bg-background relative">
        {/* Map - Fixed height */}
        <div className="h-80 m-4 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <MapView
            center={[customerLng, customerLat]}
            zoom={14}
            markers={markers}
            className="w-full h-full"
          />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate("/customer-dashboard")}
          className="absolute top-6 left-6 w-11 h-11 bg-card rounded-full shadow-lg flex items-center justify-center z-20 border border-border hover:border-primary/50 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Demo mode toggle (top right) */}
        <div className="absolute top-6 right-6 z-20">
          <label className="flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-full px-3 py-1.5 shadow-lg cursor-pointer hover:border-primary/50 transition-all">
            <Play className={`w-4 h-4 ${demoMode ? "text-accent" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium">Demo</span>
            <Switch
              checked={demoMode}
              onCheckedChange={handleDemoToggle}
              aria-label="Toggle demo mode"
              className="scale-75"
            />
          </label>
        </div>

        {/* Scrollable bottom content */}
        <div className="flex-1 overflow-y-auto">
          {/* Bottom panel */}
          <div className="bg-card rounded-t-3xl -mt-6 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-4" />

          {/* Status timeline */}
          <div className="px-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                request.status === "pending" ? "bg-accent animate-pulse" : "bg-primary"
              }`} />
              <span className="font-semibold text-lg">
                {statusSteps[currentStep]?.label || "Processing"}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="flex gap-1 mb-3">
              {statusSteps.slice(0, 5).map((step, i) => (
                <div
                  key={step.status}
                  className={`flex-1 h-1 rounded-full ${
                    i <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {request.status === "en_route" && request.eta_minutes && !demoMode && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated arrival</span>
                <span className="font-semibold">{request.eta_minutes} minutes</span>
              </div>
            )}

            {/* Demo mode indicator and controls */}
            {demoMode && (
              <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">Demo Mode</span>
                  </div>
                  <Switch
                    checked={demoMode}
                    onCheckedChange={handleDemoToggle}
                    aria-label="Toggle demo mode"
                  />
                </div>
                {isSimulating && (
                  <>
                    <Progress value={demoProgress} className="h-2 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Simulated mechanic: {demoProgress.toFixed(0)}% to destination
                    </p>
                  </>
                )}
                {!isSimulating && demoProgress >= 100 && (
                  <p className="text-xs text-success">Demo mechanic arrived!</p>
                )}
              </div>
            )}

            {/* Real-time tracking indicator */}
            {!demoMode && isTracking && mechanicLocation && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Radio className="w-3 h-3 text-primary animate-pulse" />
                <span>Live tracking active</span>
                {lastUpdate && (
                  <span className="text-muted-foreground/60">
                    • Updated {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mechanic info */}
          {request.status !== "pending" && (
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">👨‍🔧</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{mechanicProfile?.business_name || mechanicProfile?.full_name || "Mechanic"}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-accent">★ {mechanicProfile?.rating?.toFixed(1) || "N/A"}</span>
                    <span className="text-sm text-muted-foreground">({mechanicProfile?.total_reviews || 0} reviews)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="rounded-full"
                    onClick={() => navigate(`/messaging?requestId=${request.id}`)}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="rounded-full"
                    onClick={handleCallMechanic}
                    title="Call mechanic"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="px-6 py-2 border-b border-border">
            <EmergencyContact />
          </div>

          {/* Service details */}
          <div className="px-6 py-4">
            <h3 className="font-semibold mb-3">Service Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service type</span>
                <span className="font-medium capitalize">{request.service_type} Service</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-medium">{formatDirectINR(request.estimated_cost)}</span>
              </div>
            </div>

            {/* Cancel button */}
            {["pending", "accepted", "en_route"].includes(request.status) && (
              <>
                {showCancelConfirm ? (
                  <div className="mt-5 p-4 bg-destructive/10 rounded-xl">
                    <p className="text-sm text-destructive mb-3">
                      Are you sure you want to cancel this request?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowCancelConfirm(false)}
                      >
                        Keep Request
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleCancel}
                      >
                        Cancel Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-5 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Request
                  </Button>
                )}
              </>
            )}

            {request.status === "completed" && (
              <Button
                className="w-full mt-5"
                onClick={() => navigate("/payment", { 
                  state: { 
                    requestId: request.id,
                    mechanicId: request.mechanic_id,
                    estimatedCost: request.estimated_cost,
                    finalCost: request.final_cost || request.estimated_cost,
                  } 
                })}
              >
                Proceed to Payment
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </MobileLayout>
  );
};

export default RequestTracking;
