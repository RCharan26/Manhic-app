import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

interface ServiceRequestData {
  service_type: "battery" | "tire" | "fuel" | "lockout" | "towing" | "other";
  customer_lat: number;
  customer_lng: number;
  description?: string;
  photo_urls?: string[];
  estimated_cost?: number;
}

const validServiceTypes = ["battery", "tire", "fuel", "lockout", "towing", "other"];

// Validate service request data
function validateServiceRequestData(data: ServiceRequestData): { valid: boolean; error?: string } {
  if (!data.service_type || !validServiceTypes.includes(data.service_type)) {
    return { valid: false, error: "Valid service type is required" };
  }

  if (data.customer_lat === undefined || data.customer_lat === null || 
      typeof data.customer_lat !== "number" || 
      data.customer_lat < -90 || data.customer_lat > 90) {
    return { valid: false, error: "Valid latitude is required (-90 to 90)" };
  }

  if (data.customer_lng === undefined || data.customer_lng === null || 
      typeof data.customer_lng !== "number" || 
      data.customer_lng < -180 || data.customer_lng > 180) {
    return { valid: false, error: "Valid longitude is required (-180 to 180)" };
  }

  if (data.description && (typeof data.description !== "string" || data.description.length > 500)) {
    return { valid: false, error: "Description must be less than 500 characters" };
  }

  return { valid: true };
}

// Verify JWT and extract user ID
async function verifyClerkJWT(token: string): Promise<{ userId: string } | null> {
  try {
    console.log("=== Starting JWT verification ===");
    console.log("Token length:", token.length);
    
    const parts = token.split(".");
    console.log("Token parts:", parts.length);
    
    if (parts.length < 2) {
      console.error("Malformed JWT: missing parts. Expected 3 parts, got", parts.length);
      return null;
    }

    let payloadJson: any;
    try {
      const decodedPayload = atob(parts[1]);
      console.log("Decoded payload length:", decodedPayload.length);
      payloadJson = JSON.parse(decodedPayload);
      console.log("JWT Payload keys:", Object.keys(payloadJson));
    } catch (e) {
      console.error("Failed to parse JWT payload:", e instanceof Error ? e.message : String(e));
      return null;
    }

    // Try multiple possible claim names for user ID
    const sub = payloadJson.sub || payloadJson.user_id || payloadJson.uid || payloadJson.id;
    
    console.log("Extracted user ID candidates - sub:", payloadJson.sub, "user_id:", payloadJson.user_id, "uid:", payloadJson.uid);
    
    if (!sub || typeof sub !== "string") {
      console.error("No valid user ID found in JWT. Available claims:", Object.keys(payloadJson).join(", "));
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
    const authHeader = req.headers.get("Authorization");
    console.log("=== secure-service-request called ===");
    console.log("Method:", req.method);
    console.log("Authorization header present:", !!authHeader);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authResult = await verifyClerkJWT(token);

    if (!authResult) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = authResult;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const userRole = profile?.role;
    const url = new URL(req.url);
    const requestId = url.searchParams.get("id");
    const role = url.searchParams.get("role"); // 'customer' or 'mechanic'
    const pending = url.searchParams.get("pending"); // 'true' to fetch pending requests for mechanics
    const fetchPending = url.searchParams.get("fetchPending"); // 'true' to fetch a single pending request by ID

    // GET - Fetch service requests based on role
    if (req.method === "GET") {
      // If mechanic wants to fetch a specific pending request (to accept/view it)
      if (fetchPending === "true" && requestId && (role === "mechanic" || userRole === "mechanic")) {
        console.log("Fetching specific pending request:", requestId);
        const { data, error } = await supabaseAdmin
          .from("service_requests")
          .select("*")
          .eq("id", requestId)
          .eq("status", "pending")
          .is("mechanic_id", null)  // Only unassigned requests
          .single();

        if (error) {
          console.error("Error fetching pending request:", error);
          return new Response(
            JSON.stringify({ error: "Could not load request details" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Fetched pending request:", requestId);
        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If mechanic wants to see pending requests (unassigned requests)
      if (pending === "true" && (role === "mechanic" || userRole === "mechanic")) {
        console.log("Fetching pending requests for mechanic:", userId);
        const { data, error } = await supabaseAdmin
          .from("service_requests")
          .select("id, service_type, customer_lat, customer_lng, description, estimated_cost, created_at, status")
          .eq("status", "pending")
          .is("mechanic_id", null)  // Only unassigned requests
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching pending requests:", error);
          throw error;
        }

        console.log("Fetched pending requests:", data?.length || 0);
        return new Response(
          JSON.stringify({ data: data || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (role === "mechanic" || userRole === "mechanic") {
        // Mechanic fetching assigned requests
        if (requestId) {
          const { data, error } = await supabaseAdmin
            .from("service_requests")
            .select("*")
            .eq("id", requestId)
            .eq("mechanic_id", userId)
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Get all requests assigned to this mechanic
          const { data, error } = await supabaseAdmin
            .from("service_requests")
            .select("*")
            .eq("mechanic_id", userId)
            .order("created_at", { ascending: false });

          if (error) throw error;

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Customer fetching their own requests
        if (requestId) {
          const { data, error } = await supabaseAdmin
            .from("service_requests")
            .select("*")
            .eq("id", requestId)
            .eq("customer_id", userId)
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const { data, error } = await supabaseAdmin
            .from("service_requests")
            .select("*")
            .eq("customer_id", userId)
            .order("created_at", { ascending: false });

          if (error) throw error;

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // POST - Create a new service request (customers only)
    if (req.method === "POST") {
      // Allow customers to create requests or submit ratings via action
      const body = await req.json();

      // If the customer is submitting a rating for a completed request
      if (body.action === "rate") {
        if (userRole !== "customer") {
          return new Response(JSON.stringify({ error: "Only customers can submit ratings" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const requestIdForRate = url.searchParams.get("id") || body.request_id;
        if (!requestIdForRate) {
          return new Response(JSON.stringify({ error: "Request id required for rating" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Fetch the request to validate ownership and status
        const { data: srvReq, error: srvErr } = await supabaseAdmin
          .from("service_requests")
          .select("id, customer_id, mechanic_id, status")
          .eq("id", requestIdForRate)
          .single();

        if (srvErr || !srvReq) {
          return new Response(JSON.stringify({ error: "Service request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (srvReq.customer_id !== userId) {
          return new Response(JSON.stringify({ error: "Not allowed to rate this request" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (srvReq.status !== "completed") {
          return new Response(JSON.stringify({ error: "Can only rate completed requests" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Prevent duplicate rating (assumes unique constraint on request_id)
        const { data: existing, error: existErr } = await supabaseAdmin
          .from("service_ratings")
          .select("id")
          .eq("request_id", requestIdForRate)
          .limit(1);

        if (existErr) {
          console.error("Error checking existing rating:", existErr);
        }

        if (existing && existing.length > 0) {
          return new Response(JSON.stringify({ error: "Request already rated" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Insert rating
        const ratingValue = Number(body.rating) || null;
        const reviewText = body.review || null;
        const tags = Array.isArray(body.tags) ? body.tags : null;

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("service_ratings")
          .insert({
            request_id: requestIdForRate,
            customer_id: userId,
            mechanic_id: srvReq.mechanic_id,
            rating: ratingValue,
            review: reviewText,
            tags: tags,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Error inserting rating:", insertErr);
          return new Response(JSON.stringify({ error: insertErr.message || "Failed to insert rating" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ data: inserted }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Default: create a service request (existing behavior)
      if (userRole !== "customer") {
        return new Response(
          JSON.stringify({ error: "Only customers can create service requests" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const svcBody: ServiceRequestData = body as ServiceRequestData;
      const validation = validateServiceRequestData(svcBody);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for active requests to prevent duplicates
      const { data: activeRequests } = await supabaseAdmin
        .from("service_requests")
        .select("id")
        .eq("customer_id", userId)
        .in("status", ["pending", "accepted", "en_route", "arrived", "in_progress"])
        .limit(1);

      if (activeRequests && activeRequests.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: "You already have an active service request",
            existingRequestId: activeRequests[0].id
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("service_requests")
        .insert({
          customer_id: userId,
          service_type: svcBody.service_type,
          customer_lat: svcBody.customer_lat,
          customer_lng: svcBody.customer_lng,
          description: svcBody.description || null,
          photo_urls: svcBody.photo_urls || null,
          estimated_cost: svcBody.estimated_cost || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating service request:", error);
        throw error;
      }

      // Auto-allocate mechanic (existing behavior)
      try {
        const { data: mechanics, error: mechanicsError } = await supabaseAdmin
          .rpc("find_nearby_mechanics", {
            customer_lat: svcBody.customer_lat,
            customer_lng: svcBody.customer_lng,
            max_distance_km: 50,
          });

        if (!mechanicsError && mechanics && mechanics.length > 0) {
          // Filter by specialization if possible
          let bestMechanic = mechanics[0];
          const mechanicsWithSpecialization = mechanics.filter((m: any) =>
            m.specializations?.includes(svcBody.service_type)
          );

          if (mechanicsWithSpecialization.length > 0) {
            bestMechanic = mechanicsWithSpecialization[0];
          }

          // Assign the mechanic
          const { data: assigned } = await supabaseAdmin
            .rpc("assign_mechanic_to_request", {
              request_id: data.id,
              mechanic_user_id: bestMechanic.user_id,
            });

          if (assigned) {
            // Fetch the updated request
            const { data: updatedRequest } = await supabaseAdmin
              .from("service_requests")
              .select("*")
              .eq("id", data.id)
              .single();

            return new Response(
              JSON.stringify({ 
                data: updatedRequest || data,
                mechanicAssigned: true,
                mechanicId: bestMechanic.user_id
              }),
              { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (allocationError) {
        console.error("Allocation error (non-fatal):", allocationError);
      }

      return new Response(
        JSON.stringify({ data, mechanicAssigned: false }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT/PATCH - Update service request
    if ((req.method === "PUT" || req.method === "PATCH") && requestId) {
      try {
        const { data: existingRequest } = await supabaseAdmin
          .from("service_requests")
          .select("customer_id, mechanic_id, status")
          .eq("id", requestId)
          .single();

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ error: "Request not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body = await req.json();
        const isCustomer = existingRequest.customer_id === userId;
        const isMechanic = existingRequest.mechanic_id === userId;
      
      // Check if this is a mechanic trying to accept a pending request (mechanic_id is null)
      const isAcceptingPendingRequest = 
        existingRequest.status === "pending" && 
        existingRequest.mechanic_id === null && 
        body.status === "accepted" &&
        userRole === "mechanic";

      if (!isCustomer && !isMechanic && !isAcceptingPendingRequest) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mechanic accepting a pending request
      if (isAcceptingPendingRequest) {
        console.log(`Mechanic ${userId} accepting pending request ${requestId}`);
        console.log("User role:", userRole);
        console.log("Request status:", existingRequest.status);
        console.log("Mechanic ID before:", existingRequest.mechanic_id);
        
        try {
          const { data, error } = await supabaseAdmin
            .from("service_requests")
            .update({
              status: "accepted",
              mechanic_id: userId,
            })
            .eq("id", requestId)
            .select()
            .single();

          if (error) {
            console.error("Database error accepting request:", error);
            return new Response(
              JSON.stringify({ error: error.message || "Failed to accept request" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log("Request accepted successfully:", requestId);
          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("Exception accepting request:", err);
          return new Response(
            JSON.stringify({ error: "Failed to accept request", details: String(err) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Customer cancellation
      if (isCustomer && body.status === "cancelled") {
        if (!["pending", "accepted", "en_route"].includes(existingRequest.status)) {
          return new Response(
            JSON.stringify({ error: "Cannot cancel request in current status" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from("service_requests")
          .update({
            status: "cancelled",
            cancellation_reason: body.cancellation_reason || "Cancelled by customer",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", requestId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mechanic status updates
      if (isMechanic) {
        const validTransitions: Record<string, string[]> = {
          accepted: ["en_route"],
          en_route: ["arrived"],
          arrived: ["in_progress"],
          in_progress: ["completed"],
        };

        const allowedStatuses = validTransitions[existingRequest.status] || [];
        
        if (body.status && !allowedStatuses.includes(body.status)) {
          return new Response(
            JSON.stringify({ error: `Cannot transition from ${existingRequest.status} to ${body.status}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (body.status) updateData.status = body.status;
        if (body.mechanic_lat !== undefined) updateData.mechanic_lat = body.mechanic_lat;
        if (body.mechanic_lng !== undefined) updateData.mechanic_lng = body.mechanic_lng;
        if (body.final_cost !== undefined) updateData.final_cost = body.final_cost;
        
        if (body.status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }
        if (body.status === "in_progress") {
          updateData.started_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
          .from("service_requests")
          .update(updateData)
          .eq("id", requestId)
          .select()
          .single();

        if (error) {
          console.error("Error updating status:", error);
          return new Response(
            JSON.stringify({ error: error.message || "Failed to update status" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid update operation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      } catch (patchError) {
        console.error("Error in PATCH handler:", patchError);
        return new Response(
          JSON.stringify({ error: "Failed to update request", details: String(patchError) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in secure-service-request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
