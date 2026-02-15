import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import VehicleOnboardingWizard from "@/components/vehicle/VehicleOnboardingWizard";
import MapView from "@/components/map/MapView";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { getSafeToken } from "@/lib/tokenUtils";
import { Camera, User, Car, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

const mechanicSchema = z.object({
  phone: z.string().regex(/^[\d\s+\-()]+$/, "Invalid phone number").max(20).optional().or(z.literal("")),
  businessName: z.string().max(100).optional(),
  businessLat: z.number().min(-90).max(90).optional(),
  businessLng: z.number().min(-180).max(180).optional(),
  licenseNumber: z.string().min(1, "License number is required").max(50),
  yearsExperience: z.string().min(1, "Years of experience is required"),
  serviceRadius: z.string().default("25"),
  specializations: z.array(z.string()).min(1, "Select at least one specialization"),
});

type MechanicFormData = z.infer<typeof mechanicSchema>;

const specializationOptions = [
  "Battery",
  "Tire Change",
  "Jump Start",
  "Fuel Delivery",
  "Lockout",
  "Towing",
  "Engine Repair",
  "Brake Repair",
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { userId, profile, fullName, refreshProfile, isLoaded, profileLoaded, isSignedIn, signOut } = useClerkAuthContext();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const forceRole = searchParams.get("forceRole") === "true" || searchParams.has("forceRole");
  const [isLoading, setIsLoading] = useState(false);
  const [actionsEnabled, setActionsEnabled] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedRole, setSelectedRole] = useState<"customer" | "mechanic" | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [step, setStep] = useState<"role" | "phone" | "vehicle" | "details">("role");

  // If profile exists, get role from it
  const isMechanic = profile?.role === "mechanic" || selectedRole === "mechanic";

  const mechanicForm = useForm<MechanicFormData>({
    resolver: zodResolver(mechanicSchema),
    defaultValues: {
      phone: "",
      businessName: "",
      businessLat: undefined,
      businessLng: undefined,
      licenseNumber: "",
      yearsExperience: "",
      serviceRadius: "25",
      specializations: [],
    },
  });

  // Helper to perform authenticated fetches with retries on 401.
  const doAuthFetch = async (
    input: RequestInfo,
    init: RequestInit,
    maxAttempts = 5,
    initialDelay = 800
  ): Promise<Response> => {
    let lastResp: Response | null = null;

    // Optional initial wait to allow Clerk session propagation for brand-new emails
    if (initialDelay > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, initialDelay));
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const token = await getSafeToken(() => getToken({ forceRefresh: true }), { retries: 3, delayMs: 700 });
        const headers = new Headers(init.headers ?? {});
        headers.set("Authorization", `Bearer ${token}`);

        const resp = await fetch(input, { ...init, headers });
        if (resp.status === 401) {
          lastResp = resp;
          // exponential backoff before retry
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        return resp;
      } catch (err) {
        // If token fetch failed, wait and retry with backoff
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    // If we get here, either lastResp was a 401 or all attempts failed
    if (lastResp) return lastResp;
    throw new Error("Authentication failed while fetching. Please refresh and try again.");
  };

  useEffect(() => {
    if (!isLoaded || !profileLoaded) return;

    // If user isn't signed in, send them to login
    if (!isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }

    // If developer wants to force the role selector, skip redirects
    if (forceRole) {
      setStep("role");
      return;
    }

    // Allow phone/details steps to show during setup - only redirect after setup is complete
    if (step === "phone" || step === "vehicle" || step === "details") {
      return; // Stay on current step
    }

    if (profile?.role === "customer") {
      navigate("/customer-dashboard", { replace: true });
      return;
    }

    if (profile?.role === "mechanic") {
      navigate("/mechanic-dashboard", { replace: true });
      return;
    }

    // NO profile yet → stay on role page
    setStep("role");
  }, [isLoaded, profileLoaded, profile, navigate, isSignedIn, forceRole, step]);

  // Enable role/action buttons shortly after sign-in to allow sessions to propagate
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (isLoaded && profileLoaded && isSignedIn) {
      // short delay to allow Clerk session propagation for new emails
      setActionsEnabled(false);
      t = setTimeout(() => setActionsEnabled(true), 1400);
    } else {
      setActionsEnabled(false);
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [isLoaded, profileLoaded, isSignedIn]);

  const handleRoleSelection = async (role: "customer" | "mechanic") => {
    if (!userId) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    
    setIsLoading(true);
    setSelectedRole(role);

    try {
      // Use centralized authenticated fetch with retries
      const response = await doAuthFetch(`${SUPABASE_URL}/functions/v1/secure-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: role, full_name: fullName }),
      }, 5, 1000);

      const result = await response.json();

      // Debug: log response status and result
      // eslint-disable-next-line no-console
      console.log("secure-profile status:", response.status, result);

      if (!response.ok) {
        if (response.status === 409) {
          console.log("Profile already exists, continuing...");
        } else {
          const msg = result?.error || result?.message || "Failed to create profile";
          const err = new Error(msg);
          // @ts-ignore
          err.status = response.status;
          throw err;
        }
      }

      await refreshProfile();
      
      // Move to phone details step
      setStep("phone");
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Error creating profile:", error);

      // If token issues, give actionable message
      const message = error instanceof Error ? error.message : "Failed to save role. Please try again.";
      // @ts-ignore
      if (error && (error as any).status === 401) {
        // Avoid force-signing out immediately for transient/new-email sessions.
        toast.error("Authentication failed (invalid/expired token). Please refresh or re-login if the problem persists.");
      } else {
        toast.error(message);
      }

      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVehicleComplete = async () => {
    await refreshProfile();
    toast.success("Profile completed!");
    navigate("/customer-dashboard", { replace: true });
  };

  const onMechanicSubmit = async (data: MechanicFormData) => {
    if (!userId) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use centralized authenticated fetch with retries
      const response = await doAuthFetch(`${SUPABASE_URL}/functions/v1/secure-mechanic-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: data.phone || null,
          business_name: data.businessName || null,
      business_lat: data.businessLat ?? null,
      business_lng: data.businessLng ?? null,
          license_number: data.licenseNumber,
          years_experience: parseInt(data.yearsExperience),
          service_radius_km: parseInt(data.serviceRadius),
          specializations: data.specializations,
        }),
      }, 5, 1000);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save profile");
      }
      
      toast.success("Profile completed!");
      navigate("/mechanic-dashboard");
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("Error saving mechanic profile:", error);

      const message = error instanceof Error ? error.message : "Failed to save profile. Please try again.";
      // @ts-ignore
      if (error && (error as any).status === 401) {
        // Avoid force-signing out immediately — allow user to refresh and retry.
        toast.error("Authentication failed (invalid/expired token). Please refresh or re-login if the problem persists.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      </MobileLayout>
    );
  }

  // Role selection step
  if (step === "role" && !profile) {
    return (
      <MobileLayout showHeader headerTitle="Choose Your Role" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 px-6 py-8">
          <p className="text-muted-foreground text-center mb-8">
            How will you be using Manhic?
          </p>

          <div className="grid grid-cols-1 gap-4">
            <button
              type="button"
              onClick={() => handleRoleSelection("customer")}
              disabled={isLoading || !actionsEnabled}
              className="p-6 border-2 rounded-xl text-center transition-all border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Car className="w-12 h-12 mx-auto mb-3 text-primary" />
              <span className="font-semibold text-lg block">I'm a Customer</span>
              <p className="text-sm text-muted-foreground mt-2">
                I need roadside assistance for my vehicle
              </p>
            </button>
            
            <button
              type="button"
              onClick={() => handleRoleSelection("mechanic")}
              disabled={isLoading || !actionsEnabled}
              className="p-6 border-2 rounded-xl text-center transition-all border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Wrench className="w-12 h-12 mx-auto mb-3 text-primary" />
              <span className="font-semibold text-lg block">I'm a Mechanic</span>
              <p className="text-sm text-muted-foreground mt-2">
                I want to provide roadside assistance services
              </p>
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center mt-6">
              <LoadingSpinner size="sm" text="Saving..." />
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  // Vehicle onboarding step for customers
  if (step === "vehicle" && selectedRole === "customer") {
    return (
      <MobileLayout showHeader headerTitle="Add Your Car" showBackButton onBack={() => setStep("role")}>
        <div className="flex-1 p-4 overflow-auto">
          <VehicleOnboardingWizard
            onComplete={handleVehicleComplete}
            onSkip={handleVehicleComplete}
          />
        </div>
      </MobileLayout>
    );
  }

  // Phone details step
  if (step === "phone") {
    const handlePhoneSubmit = async () => {
      if (!userId) {
        toast.error("User not authenticated. Please log in again.");
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Use centralized authenticated fetch with retries
        const response = await doAuthFetch(`${SUPABASE_URL}/functions/v1/secure-profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: customerPhone || null }),
        }, 5, 1000);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to save phone number");
        }

        // Move to next step based on role
        if (selectedRole === "customer") {
          setStep("vehicle");
        } else {
          setStep("details");
        }
      } catch (error) {
        console.error("Error saving phone:", error);
        const message = error instanceof Error ? error.message : "Failed to save phone number. Please try again.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <MobileLayout showHeader headerTitle="Your Phone Number" showBackButton onBack={() => setStep("role")}>
        <div className="flex-1 px-6 py-8 flex flex-col">
          <p className="text-muted-foreground text-center mb-8">
            {selectedRole === "customer" 
              ? "Add your phone number so mechanics can contact you"
              : "Add your phone number so customers can reach you"}
          </p>

          <Input
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="h-12 mb-4"
          />
          
          <p className="text-xs text-muted-foreground mb-8">
            We'll keep your information secure and only share it with verified users.
          </p>

          <Button
            onClick={handlePhoneSubmit}
            className="w-full h-12 mt-auto"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Continue"}
          </Button>

          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              if (selectedRole === "customer") {
                setStep("vehicle");
              } else {
                setStep("details");
              }
            }}
          >
            Skip for now
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="Complete Your Profile" showBackButton onBack={() => setStep("phone")}>
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Profile photo upload */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Client-side preview
                const url = URL.createObjectURL(file);
                setAvatarPreview(url);

                if (!userId) {
                  toast.error("User not authenticated. Please log in again.");
                  return;
                }

                setUploading(true);
                try {
                  // Validate file size (limit ~5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    throw new Error("File is too large. Max 5MB.");
                  }

                  const ext = file.name.split(".").pop();
                  const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

                  const { data, error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
                  if (uploadError) throw uploadError;

                  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
                  const publicUrl = urlData.publicUrl;

                  // Send avatar_url to secure profile endpoint
                  const resp = await doAuthFetch(`${SUPABASE_URL}/functions/v1/secure-profile`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ avatar_url: publicUrl }),
                  }, 5, 1000);

                  if (!resp.ok) {
                    const r = await resp.json().catch(() => ({}));
                    throw new Error(r?.error || r?.message || "Failed to save avatar");
                  }

                  await refreshProfile();
                  toast.success("Photo uploaded");
                } catch (err: any) {
                  console.error("Avatar upload error:", err);
                  toast.error(err.message || "Failed to upload photo");
                } finally {
                  setUploading(false);
                  // clear input so same file can be picked again
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />

            <button
              className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center shadow-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Mechanic form */}
        <Form {...mechanicForm}>
          <form onSubmit={mechanicForm.handleSubmit(onMechanicSubmit)} className="space-y-4">
            <FormField
              control={mechanicForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mechanicForm.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Auto Services" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shop location picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Shop Location (optional)</p>
              <div className="h-40 w-full rounded-lg overflow-hidden">
                <MapView
                  center={
                    mechanicForm.watch("businessLat") && mechanicForm.watch("businessLng")
                      ? [mechanicForm.watch("businessLng") as number, mechanicForm.watch("businessLat") as number]
                      : undefined
                  }
                  markers={
                    mechanicForm.watch("businessLat") && mechanicForm.watch("businessLng")
                      ? [
                          {
                            id: "shop",
                            lat: mechanicForm.watch("businessLat") as number,
                            lng: mechanicForm.watch("businessLng") as number,
                            type: "mechanic",
                            label: mechanicForm.watch("businessName") || "Shop",
                          },
                        ]
                      : []
                  }
                  interactive={true}
                  onLocationSelect={(lng, lat) => {
                    mechanicForm.setValue("businessLat", lat);
                    mechanicForm.setValue("businessLng", lng);
                  }}
                  showUserLocation={false}
                  className="w-full h-full"
                />
              </div>
              <div className="flex gap-2">
                <FormField
                  control={mechanicForm.control}
                  name="businessLat"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          className="h-12"
                          placeholder="e.g. 12.9716"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mechanicForm.control}
                  name="businessLng"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          className="h-12"
                          placeholder="e.g. 77.5946"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={mechanicForm.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License/Certification Number</FormLabel>
                  <FormControl>
                    <Input placeholder="ASE-12345" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mechanicForm.control}
              name="yearsExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mechanicForm.control}
              name="serviceRadius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Radius (km)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mechanicForm.control}
              name="specializations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specializations</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {specializationOptions.map((spec) => (
                      <label
                        key={spec}
                        className={`px-4 py-2 border rounded-full text-sm cursor-pointer transition-colors ${
                          field.value.includes(spec)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={field.value.includes(spec)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, spec]);
                            } else {
                              field.onChange(field.value.filter((s) => s !== spec));
                            }
                          }}
                        />
                        {spec}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 mt-6" size="lg" disabled={isLoading}>
              {isLoading ? "Saving..." : "Complete Setup"}
            </Button>
          </form>
        </Form>

        <Button 
          variant="ghost" 
          className="w-full mt-4" 
          onClick={() => navigate("/mechanic-dashboard")}
        >
          Skip for now
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ProfileSetup;
