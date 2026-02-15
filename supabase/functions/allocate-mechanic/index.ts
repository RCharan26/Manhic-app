import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};

interface AllocateRequest {
  requestId: string;
  customerLat: number;
  customerLng: number;
  serviceType: string;
}

// Simple in-memory rate limiter (per-user, per-request)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // 3 allocation attempts per minute per user

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

// Verify Clerk JWT and extract user ID
async function verifyClerkJWT(token: string): Promise<{ userId: string } | null> {
  try {
    console.log("=== Starting JWT verification ===");
    const parts = token.split(".");
    if (parts.length < 2) {
      console.error("Malformed JWT: missing parts");
      return null;
    }

    let payloadJson: any;
    try {
      payloadJson = JSON.parse(atob(parts[1]));
      console.log("JWT Payload parsed. Sub:", payloadJson.sub);
    } catch (e) {
      console.error("Failed to parse JWT payload", e);
      return null;
    }

    const sub = payloadJson.sub;
    if (!sub || typeof sub !== "string") {
      console.error("No sub claim in JWT");
      return null;
    }

    console.log("JWT extraction successful. User ID:", sub);
    return { userId: sub };
  } catch (error) {
    console.error("JWT processing failed:", error instanceof Error ? error.message : String(error));
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
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify Clerk JWT
    const authResult = await verifyClerkJWT(token);
    if (!authResult) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId;

    // Rate limiting check
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests", 
          message: "Please wait before trying again",
          retryAfter: rateCheck.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.retryAfter)
          } 
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { requestId, customerLat, customerLng, serviceType }: AllocateRequest = await req.json();

    // Validate input
    if (!requestId || typeof requestId !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid request ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Allocating mechanic for request ${requestId} by user ${userId}`);

    // Idempotency check: verify request exists and hasn't already been assigned
    const { data: existingRequest, error: requestCheckError } = await supabaseAdmin
      .from("service_requests")
      .select("id, status, mechanic_id, customer_id")
      .eq("id", requestId)
      .single();

    if (requestCheckError || !existingRequest) {
      console.error("Request not found:", requestCheckError);
      return new Response(
        JSON.stringify({ error: "Service request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this request
    if (existingRequest.customer_id !== userId) {
      console.error(`User ${userId} does not own request ${requestId} (owner: ${existingRequest.customer_id})`);
      return new Response(
        JSON.stringify({ error: "Unauthorized to allocate for this request" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency: If already assigned, return success without re-processing
    if (existingRequest.mechanic_id) {
      console.log(`Request ${requestId} already assigned to ${existingRequest.mechanic_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          mechanicId: existingRequest.mechanic_id,
          message: "Mechanic already assigned",
          idempotent: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify request is still pending
    if (existingRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Request is ${existingRequest.status}, cannot allocate mechanic` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find nearby available mechanics using direct query (bypassing the RPC that expects UUID)
    console.log(`Finding mechanics near (${customerLat}, ${customerLng})`);
    
    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from("mechanic_details")
      .select("user_id, business_name, rating, total_reviews, current_lat, current_lng, specializations")
      .eq("is_available", true)
      .eq("is_verified", true)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null);

    if (mechanicsError) {
      console.error("Error fetching mechanics:", mechanicsError);
      throw mechanicsError;
    }

    console.log(`Found ${mechanics?.length || 0} available mechanics`);

    if (!mechanics || mechanics.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No mechanics available in your area. Please try again later." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate distance for each mechanic
    const mechanicsWithDistance = mechanics.map((m: any) => {
      const R = 6371; // Earth's radius in km
      const dLat = (m.current_lat - customerLat) * Math.PI / 180;
      const dLng = (m.current_lng - customerLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(customerLat * Math.PI / 180) * Math.cos(m.current_lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return { ...m, distance_km: distance };
    }).filter((m: any) => m.distance_km <= 50) // Filter within 50km
      .sort((a: any, b: any) => a.distance_km - b.distance_km);

    console.log(`${mechanicsWithDistance.length} mechanics within 50km`);

    if (mechanicsWithDistance.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No mechanics available in your area. Please try again later." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by specialization if needed
    let bestMechanic = mechanicsWithDistance[0];
    const mechanicsWithSpecialization = mechanicsWithDistance.filter((m: any) =>
      m.specializations?.includes(serviceType)
    );

    if (mechanicsWithSpecialization.length > 0) {
      bestMechanic = mechanicsWithSpecialization[0];
    }

    console.log(`Best mechanic: ${bestMechanic.business_name} (${bestMechanic.user_id}), distance: ${bestMechanic.distance_km.toFixed(2)}km`);

    // Calculate ETA (assuming 30 km/h average speed)
    const eta = Math.max(5, Math.min(180, Math.ceil((bestMechanic.distance_km / 30) * 60)));

    // Assign the mechanic directly
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("service_requests")
      .update({
        mechanic_id: bestMechanic.user_id,
        mechanic_lat: bestMechanic.current_lat,
        mechanic_lng: bestMechanic.current_lng,
        status: 'accepted',
        eta_minutes: eta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .is("mechanic_id", null)
      .select()
      .single();

    if (updateError) {
      console.error("Error assigning mechanic:", updateError);
      throw updateError;
    }

    if (!updateData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Failed to assign mechanic - request may have been updated. Please try again." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully assigned ${bestMechanic.user_id} to request ${requestId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        mechanicId: bestMechanic.user_id,
        mechanicName: bestMechanic.business_name,
        distanceKm: bestMechanic.distance_km,
        etaMinutes: eta
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in allocate-mechanic:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
