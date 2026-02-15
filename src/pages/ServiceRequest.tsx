import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MobileLayout from "@/components/layout/MobileLayout";
import MapView from "@/components/map/MapView";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatDirectINR } from "@/lib/utils";
import { toast } from "sonner";
import { Battery, CircleDot, Fuel, Key, Truck, Wrench, Camera, MapPin, Loader2, X } from "lucide-react";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";
const MAX_DESCRIPTION_LENGTH = 500;

type ServiceType = "battery" | "tire" | "fuel" | "lockout" | "towing" | "other";

interface ServiceOption {
  icon: typeof Battery;
  label: string;
  type: ServiceType;
  priceDisplay: string;
  estimatedCost: number; // estimated cost in rupees
}

const serviceOptions: ServiceOption[] = [
  { icon: Battery, label: "Dead Battery", type: "battery", priceDisplay: "₹500-1500", estimatedCost: 500 },
  { icon: CircleDot, label: "Flat Tire", type: "tire", priceDisplay: "₹400-1200", estimatedCost: 400 },
  { icon: Fuel, label: "Out of Fuel", type: "fuel", priceDisplay: "₹700-1800", estimatedCost: 700 },
  { icon: Key, label: "Locked Out", type: "lockout", priceDisplay: "₹800-2000", estimatedCost: 800 },
  { icon: Truck, label: "Towing", type: "towing", priceDisplay: "₹2000-6000", estimatedCost: 2000 },
  { icon: Wrench, label: "Other", type: "other", priceDisplay: "₹1000-3500", estimatedCost: 1000 },
];

const ServiceRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useClerkAuthContext();
  const { getToken } = useAuth();
  const { lat, lng, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedType, setSelectedType] = useState<ServiceType>(
    (searchParams.get("type") as ServiceType) || "battery"
  );
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    // Clear any cached estimated cost on mount
    sessionStorage.removeItem("estimatedCost");
  }, [userId, navigate]);

  const getEstimatedCost = () => {
    const service = serviceOptions.find(s => s.type === selectedType);
    return service?.estimatedCost || 500;
  };

  const getDisplayPrice = () => {
    const service = serviceOptions.find(s => s.type === selectedType);
    return service?.priceDisplay || "₹500-1500";
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max 5MB.`);
        return;
      }

      // Read file and convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target?.result as string]);
          toast.success(`Photo added (${photos.length + 1})`);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Please sign in to request assistance");
      return;
    }

    if (!lat || !lng) {
      toast.error("Unable to get your location. Please enable location services.");
      return;
    }

    setIsSubmitting(true);

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
      
      // Create the service request via secure edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-service-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_type: selectedType,
          customer_lat: lat,
          customer_lng: lng,
          description: description || null,
          photo_urls: photos.length > 0 ? photos : null,
          estimated_cost: getEstimatedCost(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.existingRequestId) {
          toast.warning("You already have an active request");
          navigate("/request-tracking", { state: { requestId: result.existingRequestId } });
          return;
        }
        throw new Error(result.error || "Failed to create request");
      }

      if (result.mechanicAssigned) {
        toast.success("Mechanic assigned! Tracking now...");
      } else {
        toast.success("Request created! Finding nearest mechanic...");
      }

      navigate("/request-tracking", { state: { requestId: result.data.id } });
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error(error.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapCenter: [number, number] | undefined = 
    lat && lng ? [lng, lat] : undefined;

  return (
    <MobileLayout showHeader headerTitle="Request Assistance" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Map with location confirmation */}
        <div className="relative h-48 flex-shrink-0">
          <MapView
            center={mapCenter}
            zoom={16}
            markers={lat && lng ? [{ id: "user", lat, lng, type: "user" }] : []}
            interactive={false}
            className="h-full"
          />
          
          {/* Location overlay */}
          <div className="absolute bottom-3 left-3 right-3 bg-card rounded-xl p-3 shadow-lg border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                locationLoading ? "bg-muted" : lat && lng ? "bg-green-100" : "bg-destructive/10"
              }`}>
                {locationLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <MapPin className={`w-5 h-5 ${lat && lng ? "text-green-600" : "text-destructive"}`} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {locationLoading ? "Detecting location..." : lat && lng ? "Location confirmed" : "Location unavailable"}
                </p>
                {locationError && (
                  <button 
                    onClick={requestLocation}
                    className="text-xs text-primary underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Service type selection */}
          <h3 className="font-semibold mb-3">What's the problem?</h3>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {serviceOptions.map((service) => (
              <button
                key={service.type}
                onClick={() => setSelectedType(service.type)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedType === service.type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <service.icon className={`w-6 h-6 mb-1.5 ${
                  selectedType === service.type ? "text-primary" : "text-muted-foreground"
                }`} />
                <p className="text-sm font-medium">{service.label}</p>
                <p className="text-xs text-muted-foreground">{service.priceDisplay}</p>
              </button>
            ))}
          </div>

          {/* Problem description */}
          <div className="mb-5">
            <label className="text-sm font-medium mb-2 block">
              Describe the issue (optional)
            </label>
            <Textarea
              placeholder="Tell us more about the problem..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/{MAX_DESCRIPTION_LENGTH} characters
            </p>
          </div>

          {/* Photo upload */}
          <div className="mb-5">
            <label className="text-sm font-medium mb-2 block">
              Add photos (optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePhotoUpload}
                type="button"
                className="h-20 bg-muted rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/80 hover:border-primary/50 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">From Gallery</span>
              </button>
              <button
                onClick={handleOpenCamera}
                type="button"
                className="h-20 bg-muted rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/80 hover:border-primary/50 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Open Camera</span>
              </button>
            </div>
            <input 
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input 
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {photos.length > 0 ? `${photos.length} photo(s) added` : "Max 5MB per photo"}
            </p>
          </div>
        </div>

        {/* Bottom submit section */}
        <div className="px-5 py-4 bg-card border-t border-border safe-area-inset">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-muted-foreground">Estimated cost</span>
              <p className="text-xl font-bold">{formatDirectINR(getEstimatedCost())}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Est. arrival</span>
              <p className="text-lg font-semibold">10-15 min</p>
            </div>
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-semibold" 
            size="lg" 
            onClick={handleSubmit}
            disabled={isSubmitting || !lat || !lng}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Assistance"
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ServiceRequest;
