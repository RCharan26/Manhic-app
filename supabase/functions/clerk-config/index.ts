import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  const publishableKey = Deno.env.get("VITE_CLERK_PUBLISHABLE_KEY") ?? "";

  if (!publishableKey) {
    return new Response(
      JSON.stringify({ error: "Missing VITE_CLERK_PUBLISHABLE_KEY" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ publishableKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
