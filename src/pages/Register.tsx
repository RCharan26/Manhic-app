import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignUp, useUser } from "@clerk/clerk-react";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const { profile, isLoaded: profileLoaded } = useClerkAuthContext();

  // Redirect AFTER signup/login only
  useEffect(() => {
    if (isLoaded && isSignedIn && profileLoaded) {
      if (profile) {
        if (profile.role === "mechanic") {
          navigate("/mechanic-dashboard", { replace: true });
        } else {
          navigate("/customer-dashboard", { replace: true });
        }
      } else {
        navigate("/profile-setup", { replace: true });
      }
    }
  }, [isLoaded, isSignedIn, profile, profileLoaded, navigate]);

  // Loading state
  if (!isLoaded || (isSignedIn && !profileLoaded)) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      </MobileLayout>
    );
  }

  // Signup UI
  return (
    <MobileLayout showHeader headerTitle="Create Account" showBackButton onBack={() => navigate(-1)}>
      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">

        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl text-primary-foreground font-bold">M</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            appearance={{
              baseTheme: "light",
              elements: {
                rootBox: "w-full",
                card: "shadow-lg border border-border bg-card p-6 w-full rounded-lg",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                formButtonPrimary: "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-md transition-colors",
                formFieldInput: "w-full px-4 py-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground",
                formFieldLabel: "text-sm font-medium text-foreground mb-1.5 block",
                footerAction: "text-sm text-muted-foreground",
                footerActionLink: "text-primary font-semibold hover:underline",
                socialButtonsBlockButton: "w-full px-4 py-2.5 border border-input rounded-md bg-background hover:bg-muted text-foreground font-medium transition-colors",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-sm",
              },
            }}
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </MobileLayout>
  );
};

export default Register;