import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "customer" | "mechanic";

interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface ClerkAuthContextType {
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  profile: Profile | null;
  profileLoaded: boolean;
  fullName: string | null;
  email: string | null;
  imageUrl: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load profile ONCE after login
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }

      setProfileLoaded(true);
    };

    loadProfile();
  }, [isLoaded, isSignedIn, user?.id]);

  const refreshProfile = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) setProfile(data as Profile);
  };

  const signOut = async () => {
    await clerkSignOut();
    setProfile(null);
    setProfileLoaded(false);
  };

  return (
    <ClerkAuthContext.Provider
      value={{
        userId: user?.id ?? null,
        isLoaded,
        isSignedIn: isSignedIn ?? false,
        profile,
        profileLoaded,
        fullName: user?.fullName ?? null,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        imageUrl: user?.imageUrl ?? null,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </ClerkAuthContext.Provider>
  );
};

export const useClerkAuthContext = () => {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error("useClerkAuthContext must be used within ClerkAuthProvider");
  }
  return context;
};
