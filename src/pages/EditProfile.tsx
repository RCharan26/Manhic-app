import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MapView from "@/components/map/MapView";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

const SUPABASE_URL = "https://xspqodyttbwiagpcualr.supabase.co";

const EditProfile = () => {
  const navigate = useNavigate();
  const { userId, profile, refreshProfile } = useClerkAuthContext();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    businessName: "",
    businessLat: undefined as number | undefined,
    businessLng: undefined as number | undefined,
  });

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    // Load current profile data
    if (profile?.full_name) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile.full_name || "",
        phone: profile.phone || "",
      }));
    }

    // if mechanic, fetch additional details including shop location and business name
    if (profile?.role === "mechanic") {
      (async () => {
        try {
          const token = await getToken();
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/secure-mechanic-data`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (resp.ok) {
            const result = await resp.json();
            const data = result.data || {};
            setFormData((prev) => ({
              ...prev,
              businessName: data.business_name || "",
              businessLat: data.business_lat || undefined,
              businessLng: data.business_lng || undefined,
            }));
          }
        } catch (e) {
          console.error("Failed to load mechanic details", e);
        }
      })();
    }

    setLoading(false);
  }, [userId, profile, navigate, getToken]);

  const handleSave = async () => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSaving(true);

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
        throw new Error('Failed to obtain authentication token');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.fullName || null,
          phone: formData.phone || null,
          business_name: profile?.role === "mechanic" ? formData.businessName || null : undefined,
          business_lat: profile?.role === "mechanic" ? formData.businessLat ?? null : undefined,
          business_lng: profile?.role === "mechanic" ? formData.businessLng ?? null : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile");
      }

      // if mechanic update mechanic_details as well
      if (profile?.role === "mechanic") {
        const mechResp = await fetch(`${SUPABASE_URL}/functions/v1/secure-mechanic-data`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_name: formData.businessName || null,
            business_lat: formData.businessLat ?? null,
            business_lng: formData.businessLng ?? null,
          }),
        });
        if (!mechResp.ok) {
          console.warn("Failed to update mechanic details", await mechResp.text());
        }
      }

      await refreshProfile();
      toast.success("Profile updated successfully");
      navigate("/settings");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout showHeader headerTitle="Edit Profile" showBackButton onBack={() => navigate(-1)}>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader headerTitle="Edit Profile" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 p-4 flex flex-col">
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <Input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Your full name"
              className="w-full"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Your phone number"
              className="w-full"
            />
          </div>

          {profile?.role === "mechanic" && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <Input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Your shop name"
                  className="w-full"
                />
              </div>
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Shop Location</p>
                <div className="h-40 w-full rounded-lg overflow-hidden mb-2">
                  <MapView
                    center={
                      formData.businessLat && formData.businessLng
                        ? [formData.businessLng, formData.businessLat]
                        : undefined
                    }
                    markers={
                      formData.businessLat && formData.businessLng
                        ? [
                            {
                              id: "shop",
                              lat: formData.businessLat,
                              lng: formData.businessLng,
                              type: "mechanic",
                              label: formData.businessName || "Shop",
                            },
                          ]
                        : []
                    }
                    interactive={true}
                    showUserLocation={false}
                    onLocationSelect={(lng, lat) => {
                      setFormData({ ...formData, businessLat: lat, businessLng: lng });
                    }}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={formData.businessLat || ""}
                    onChange={(e) => setFormData({ ...formData, businessLat: parseFloat(e.target.value) || undefined })}
                    placeholder="Latitude"
                    className="flex-1 h-12"
                  />
                  <Input
                    type="number"
                    step="any"
                    value={formData.businessLng || ""}
                    onChange={(e) => setFormData({ ...formData, businessLng: parseFloat(e.target.value) || undefined })}
                    placeholder="Longitude"
                    className="flex-1 h-12"
                  />
                </div>
              </div>
            </>
          )}

          {profile?.role && (
            <div className="mb-6 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-semibold capitalize">{profile.role}</p>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-6 text-lg font-semibold"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default EditProfile;
