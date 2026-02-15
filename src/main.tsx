import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

type ClerkConfigResponse = {
  publishableKey?: string;
  error?: string;
};

function ClerkBootstrap() {
  const [publishableKey, setPublishableKey] = useState<string | null>(
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKey() {
      // If Vite env already has it, we’re done.
      if (publishableKey) return;

      try {
        const { data, error } = await supabase.functions.invoke<ClerkConfigResponse>(
          "clerk-config",
        );

        if (error) throw error;
        const key = data?.publishableKey;
        if (!key) throw new Error(data?.error || "Missing Clerk publishable key");

        if (!cancelled) setPublishableKey(key);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load Clerk config";
        if (!cancelled) setError(message);
      }
    }

    loadKey();
    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  if (error) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-card text-card-foreground p-5">
          <h1 className="text-lg font-semibold">Configuration needed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clerk couldn’t start because the publishable key wasn’t available.
          </p>
          <p className="mt-3 text-xs text-muted-foreground break-words">
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  if (!publishableKey) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <App />
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(<ClerkBootstrap />);
