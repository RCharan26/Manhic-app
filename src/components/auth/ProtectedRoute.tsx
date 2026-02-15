import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useUser();

  // Still checking Clerk
  if (!isLoaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not signed in → redirect
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // Signed in → allow access
  return <>{children}</>;
}
