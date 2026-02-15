import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import OnboardingSlides from "@/components/onboarding/OnboardingSlides";
import LoadingSpinner from "@/components/loading/LoadingSpinner";
import { useUser } from "@clerk/clerk-react";
import { useClerkAuthContext } from "@/contexts/ClerkAuthContext";
import { Wrench } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const { profile } = useClerkAuthContext();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      if (profile) {
        if (profile.role === "mechanic") {
          navigate("/mechanic-dashboard");
        } else {
          navigate("/customer-dashboard");
        }
      } else {
        navigate("/profile-setup");
      }
    }
  }, [isLoaded, isSignedIn, profile, navigate]);

  if (!isLoaded) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <LoadingSpinner size="lg" text="Checking your session..." />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gradient-radial from-muted via-background to-background">
        {/* Animated Logo */}
        <div className="relative animate-bounce-in">
          <div className="w-28 h-28 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary animate-float">
            <Wrench className="w-12 h-12 text-primary-foreground" />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        </div>
        
        <h1 className="text-4xl font-extrabold text-foreground mt-8 mb-2 text-center animate-fade-in">
          Manhic
        </h1>
        <p className="text-muted-foreground text-center mb-8 animate-fade-in animation-delay-100 max-w-xs">
          Real-time roadside assistance at your fingertips
        </p>

        {/* Onboarding slides */}
        <div className="w-full max-w-sm animate-fade-in animation-delay-200">
          <OnboardingSlides />
        </div>

        <div className="w-full max-w-sm space-y-3 mt-10 animate-slide-up animation-delay-300">
          <Button 
            asChild 
            className="w-full h-14 text-base font-semibold shadow-primary hover-lift press-effect" 
            size="lg"
          >
            <Link to="/register">Get Started</Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            className="w-full h-14 text-base font-medium border-2 hover:bg-muted/50 hover:border-primary/50 transition-all press-effect" 
            size="lg"
          >
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      </div>
    </MobileLayout>
  );
};

export default Welcome;
