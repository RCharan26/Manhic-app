import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignIn, useUser } from "@clerk/clerk-react";
import MobileLayout from "@/components/layout/MobileLayout";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { Wrench } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const { profile, isLoaded: profileLoaded } = useClerkAuthContext();

  // Redirect after successful login
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

  // Login UI
  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-8 bg-gradient-radial from-muted/50 via-background to-background">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
              <Wrench className="w-9 h-9 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-2 text-center">Welcome back</h2>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          Sign in to continue to Manhic
        </p>

        {/* Clerk SignIn */}
        <div className="w-full max-w-sm">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
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

        <p className="text-center text-sm text-muted-foreground mt-8">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-semibold">
            Create Account
          </Link>
        </p>
      </div>
    </MobileLayout>
  );
};

export default Login;
