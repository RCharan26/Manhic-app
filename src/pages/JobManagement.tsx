import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MobileLayout from "@/components/layout/MobileLayout";
import MapView from "@/components/map/MapView";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { useMechanicJobLocation } from "@/hooks/useMechanicJobLocation";
import { supabase } from "@/integrations/supabase/client";
import { formatDirectINR, convertToINR } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Phone, MessageSquare, MapPin, Clock, CheckCircle2, 
  XCircle, Navigation, Loader2, Battery, CircleDot, 
  Fuel, Wrench, ChevronLeft, Radio, X, Video
} from "lucide-react";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

interface ServiceRequest {
  id: string;
  customer_id: string;
  mechanic_id: string | null;
  service_type: string;
  status: string;
  description: string | null;
  customer_lat: number | string;
  customer_lng: number | string;
  customer_address: string | null;
  estimated_cost: number | string | null;
  final_cost?: number | string | null;
  created_at: string;
}

const serviceIcons: Record<string, typeof Battery> = {
  battery: Battery,
  tire: CircleDot,
  fuel: Fuel,
  lockout: Wrench,
  towing: Wrench,
  other: Wrench,
};

const statusLabels: Record<string, string> = {
  pending: "Accept this job",
  accepted: "Start driving to customer",
  en_route: "Mark as arrived",
  arrived: "Start working",
  in_progress: "Complete job",
};

const JobManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showFinalCostDialog, setShowFinalCostDialog] = useState(false);
  const [finalCost, setFinalCost] = useState("");
  const [finalCostError, setFinalCostError] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  // Determine if mechanic is actively on this job (not pending, not completed/cancelled)
  const isOnJob = !!request && 
    ["accepted", "en_route", "arrived", "in_progress"].includes(request.status) &&
    request.mechanic_id === userId;

  // Broadcast location every 10 seconds while on job
  const { lat: mechanicLat, lng: mechanicLng, isTracking } = useMechanicJobLocation(
    isOnJob,
    request?.id || null
  );

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchRequest = async () => {
      const requestId = location.state?.requestId;
      
      if (!requestId) {
        toast.error("No request specified");
        navigate("/mechanic-dashboard");
        return;
      }

      try {
        const token = await getToken();
        
        // First try to fetch as an assigned request (mechanic already has this job)
        const assignedResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request?id=${requestId}&role=mechanic`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (assignedResponse.ok) {
          const result = await assignedResponse.json();
          if (result.data) {
            setRequest(result.data as ServiceRequest);
            // Fetch customer profile for phone number
            fetchCustomerProfile(result.data.customer_id, token);
            setLoading(false);
            return;
          }
        }

        // If not assigned, try to fetch as a pending request (for accepting new jobs)
        const pendingResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/secure-service-request?id=${requestId}&role=mechanic&fetchPending=true`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (pendingResponse.ok) {
          const result = await pendingResponse.json();
          if (result.data) {
            setRequest(result.data as ServiceRequest);
            // Fetch customer profile for phone number
            fetchCustomerProfile(result.data.customer_id, token);
            setLoading(false);
            return;
          }
        }

        console.error("Could not load request from either endpoint. Assigned response:", assignedResponse.status, "Pending response:", pendingResponse.status);
        toast.error("Could not load request details");
        navigate("/mechanic-dashboard");
      } catch (error) {
        console.error("Error fetching request:", error);
        toast.error("Could not load request details");
        navigate("/mechanic-dashboard");
      }
    };

    const fetchCustomerProfile = async (customerId: string, token: string) => {
      try {
        // Try to fetch from profiles first
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", customerId)
          .single();

        if (profile) {
          setCustomerName(profile.full_name || "Customer");
          if (profile.phone) {
            setCustomerPhone(profile.phone);
            return;
          }
        }

        // If no phone in profiles, try customer_details for emergency contact
        const { data: customerDetails } = await supabase
          .from("customer_details")
          .select("emergency_contact_phone")
          .eq("user_id", customerId)
          .single();

        if (customerDetails?.emergency_contact_phone) {
          setCustomerPhone(customerDetails.emergency_contact_phone);
        } else {
          setCustomerPhone(null);
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        // Set default name even if fetch fails
        setCustomerName("Customer");
        setCustomerPhone(null);
      }
    };

    fetchRequest();

    // Real-time updates for this request
    const requestId = location.state?.requestId;
    if (requestId) {
      const channel = supabase
        .channel(`job-${requestId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "service_requests",
            filter: `id=eq.${requestId}`,
          },
          (payload) => {
            setRequest(payload.new as ServiceRequest);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, navigate, location.state, getToken]);

  const updateStatus = async (newStatus: string) => {
    if (!request || !userId) return;

    // Show final cost dialog before completing
    if (newStatus === "completed" && !finalCost) {
      setShowFinalCostDialog(true);
      return;
    }

    setActionLoading(true);

    try {
      const token = await getToken();
      
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "completed") {
        updateData.final_cost = parseFloat(finalCost || String(request.estimated_cost));
      }

      // Use edge function for all status updates (including accept)
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/secure-service-request?id=${request.id}&role=mechanic`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update status");
      }

      const statusMessages: Record<string, string> = {
        accepted: "Job accepted! Head to the customer now.",
        en_route: "Customer notified you're on your way.",
        arrived: "Customer notified you've arrived.",
        in_progress: "Good luck with the repair!",
        completed: "Great job! Payment will be processed.",
      };

      toast.success(statusMessages[newStatus] || "Status updated!");

      if (newStatus === "completed") {
        navigate("/mechanic-dashboard");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const declineRequest = async () => {
    if (!request) return;

    setActionLoading(true);

    // Just navigate away - another mechanic can take it
    toast.info("Request declined");
    navigate("/mechanic-dashboard");
  };

  const callCustomer = async () => {
    if (!request?.customer_id) {
      toast.error("Customer not found");
      return;
    }

    try {
      // Fetch customer phone from profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", request.customer_id)
        .single();

      if (error || !profile?.phone) {
        toast.error("Customer phone number not available");
        return;
      }

      // Open phone dialer
      const phoneUrl = `tel:${profile.phone}`;
      window.location.href = phoneUrl;
      toast.success(`Calling ${profile.phone}...`);
    } catch (error) {
      console.error("Error calling customer:", error);
      toast.error("Failed to initiate call");
    }
  };

  const openNavigation = () => {
    if (!request) return;
    const lat = Number(request.customer_lat);
    const lng = Number(request.customer_lng);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  const getNextStatus = (): string | null => {
    if (!request) return null;
    const statusFlow: Record<string, string> = {
      pending: "accepted",
      accepted: "en_route",
      en_route: "arrived",
      arrived: "in_progress",
      in_progress: "completed",
    };
    return statusFlow[request.status] || null;
  };

  const getTimeAgo = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
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

  const Icon = serviceIcons[request.service_type] || Wrench;
  const customerLat = Number(request.customer_lat);
  const customerLng = Number(request.customer_lng);
  const nextStatus = getNextStatus();

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col">
        {/* Map */}
        <div className="relative h-56 flex-shrink-0">
          <MapView
            center={[customerLng, customerLat]}
            zoom={15}
            markers={[
              { id: "customer", lat: customerLat, lng: customerLng, type: "user", label: "Customer location" },
              ...(isTracking && mechanicLat && mechanicLng 
                ? [{ id: "mechanic", lat: mechanicLat, lng: mechanicLng, type: "mechanic" as const, label: "Your location" }]
                : []
              ),
            ]}
            className="h-full"
          />

          {/* Back button */}
          <button
            onClick={() => navigate("/mechanic-dashboard")}
            className="absolute top-4 left-4 w-11 h-11 bg-card rounded-full shadow-lg flex items-center justify-center z-10 border border-border"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Navigate button */}
          {request.status !== "pending" && (
            <Button
              onClick={openNavigation}
              className="absolute bottom-4 right-4 shadow-lg"
              size="sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate
            </Button>
          )}

          {/* Floating action button - centered at top of map */}
          {!request ? null : request.status === "pending" ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 w-full">
              {showDeclineConfirm ? (
                <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-2xl p-5 shadow-lg space-y-4 max-w-sm mx-auto">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    Are you sure you want to decline this request?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => setShowDeclineConfirm(false)}
                    >
                      Keep
                    </Button>
                    <Button
                      className="flex-1 h-11 bg-red-600 hover:bg-red-700 rounded-xl font-semibold"
                      onClick={declineRequest}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Decline"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 max-w-sm mx-auto">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 bg-white dark:bg-slate-900 rounded-xl font-semibold"
                    onClick={() => setShowDeclineConfirm(true)}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Decline
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 rounded-xl font-semibold text-white"
                    onClick={() => updateStatus("accepted")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Accept Job
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 flex flex-col">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-3 mb-4" />

          {/* Service info */}
          <div className="px-6 pb-4 border-b border-border">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold capitalize">{request.service_type} Service</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  <span>Requested {getTimeAgo(request.created_at)}</span>
                </div>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatDirectINR(request.estimated_cost)}
              </span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  request.status === "pending" ? "bg-yellow-500 animate-pulse" : 
                  request.status === "completed" ? "bg-green-500" : "bg-primary animate-pulse"
                }`} />
                <span className="font-semibold capitalize">{request.status.replace("_", " ")}</span>
              </div>
              {/* Location broadcasting indicator */}
              {isTracking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Radio className="w-3 h-3 text-primary animate-pulse" />
                  <span>Broadcasting location</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Customer</h3>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{customerName || "Customer"}</p>
                {customerPhone ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{customerPhone}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>No phone available</span>
                  </p>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>~2.3 km away</span>
                </div>
              </div>
              {request.status !== "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => navigate("/messaging")}
                    title="Message"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  {customerPhone && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      onClick={callCustomer}
                      title="Call customer"
                    >
                      <Phone className="w-5 h-5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => toast.info("Video call feature coming soon")}
                    title="Video call"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Problem Description</h3>
              <p className="text-foreground">{request.description}</p>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="px-0 py-0 space-y-0 safe-area-inset bg-background border-t border-border">
            {request.status === "pending" ? (
              <div className="px-4 py-6 space-y-3">
                {!showDeclineConfirm ? (
                  <>
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Accept or decline request to proceed.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl font-semibold"
                        onClick={() => setShowDeclineConfirm(true)}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Decline
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 rounded-xl font-semibold text-white"
                        onClick={() => updateStatus("accepted")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                        )}
                        Accept
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-4">
                      Are you sure you want to decline this request?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                        onClick={() => setShowDeclineConfirm(false)}
                      >
                        Keep
                      </Button>
                      <Button
                        className="flex-1 h-11 bg-red-600 hover:bg-red-700 rounded-xl font-semibold"
                        onClick={declineRequest}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : nextStatus ? (
              <>
                <Button
                  className="w-full h-14 text-base bg-red-600 hover:bg-red-700 font-semibold rounded-none shadow-none"
                  onClick={() => updateStatus(nextStatus)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  {statusLabels[request.status] || "Next Step"}
                </Button>
                {request.status === "accepted" && (
                  <Button
                    className="w-full h-14 text-base bg-slate-700 hover:bg-slate-800 font-semibold rounded-none shadow-none border-t border-background"
                    onClick={() => navigate(`/messaging?requestId=${request.id}`)}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Message Customer
                  </Button>
                )}
              </>
            ) : !nextStatus ? (
              <div className="px-4 py-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => navigate("/mechanic-dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Final cost dialog */}
        {showFinalCostDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-background rounded-t-3xl p-6 w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Final Cost</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowFinalCostDialog(false);
                    setFinalCost("");
                  }}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="bg-muted rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Estimated Cost</p>
                <p className="text-2xl font-bold">{formatDirectINR(request?.estimated_cost)}</p>
              </div>

              <div className="mb-6">
                <Label htmlFor="finalCostInput" className="mb-2 block">Enter Final Cost</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">₹</span>
                  <Input
                    id="finalCostInput"
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalCost}
                    onChange={(e) => {
                      setFinalCost(e.target.value);
                      const v = parseFloat(e.target.value || "0");
                      if (isNaN(v) || v < 0) setFinalCostError("Please enter a valid cost");
                      else setFinalCostError(null);
                    }}
                    placeholder={String(request?.estimated_cost || "0")}
                    className="text-2xl font-bold h-14"
                    autoFocus
                  />
                  {finalCostError && <p className="text-sm text-destructive mt-2">{finalCostError}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    setShowFinalCostDialog(false);
                    setFinalCost("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={() => {
                    if (!finalCost || parseFloat(finalCost) < 0) {
                      toast.error("Please enter a valid cost");
                      return;
                    }
                    setShowFinalCostDialog(false);
                    updateStatus("completed");
                  }}
                  disabled={!finalCost || !!finalCostError || parseFloat(finalCost || "0") < 0}
                >
                  Complete Job
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default JobManagement;
