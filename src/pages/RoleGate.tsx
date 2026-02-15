import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

export default function RoleGate() {
  const navigate = useNavigate();
  const { profile, isLoaded, profileLoaded } = useClerkAuthContext();

  useEffect(() => {
    if (!isLoaded || !profileLoaded) return;

    if (!profile) {
      navigate("/profile-setup", { replace: true });
      return;
    }

    if (profile.role === "customer") {
      navigate("/customer-dashboard", { replace: true });
      return;
    }

    if (profile.role === "mechanic") {
      navigate("/mechanic-dashboard", { replace: true });
      return;
    }
  }, [isLoaded, profileLoaded, profile]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading…" />
    </div>
  );
}
