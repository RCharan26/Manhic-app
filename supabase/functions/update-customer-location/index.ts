import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.0.0/jwt/verify.ts";
import { createRemoteJWKSet } from "https://deno.land/x/jose@v5.0.0/jwks/remote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Verify JWT and extract user ID
async function verifyJWTAndGetUserId(token: string): Promise<string | null> {
  try {
    console.log("=== Starting JWT extraction ===");
    // Decode payload to get user ID (sub claim)
    const payloadB64 = token.split('.')[1];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const decodedPayload = JSON.parse(json);
    const userId = decodedPayload?.sub;
    
    if (!userId) {
      console.error("No sub claim in JWT");
      return null;
    }
    
    console.log("JWT extracted successfully. User ID:", userId);
    return userId;
  } catch (error) {
    console.error("JWT extraction failed:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userId = await verifyJWTAndGetUserId(token);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { lat, lng } = body;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return new Response(
          JSON.stringify({ error: "lat and lng must be numbers" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Upsert the customer's live location
      const { data, error } = await supabaseAdmin
        .from("customer_live_location")
        .upsert(
          {
            user_id: userId,
            lat,
            lng,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error updating customer location:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-customer-location:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
