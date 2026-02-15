import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for Edge Function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Missing JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, message } = body;
    if (!request_id || !message) {
      return new Response(JSON.stringify({ error: "request_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Authorization token (Clerk JWT) - extract sub
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = (authHeader.split(" ")[1] || "").trim();
    console.log("Token length:", token.length);
    console.log("Token preview:", token.substring(0, 50) + "...");
    
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;
    try {
      // Decode JWT payload: split by "." and decode the middle part
      const parts = token.split(".");
      console.log("Token parts count:", parts.length);
      
      if (parts.length < 2) {
        throw new Error(`Invalid token format - got ${parts.length} parts`);
      }
      
      // Try to decode the payload (second part)
      let payloadStr: string;
      try {
        // Add padding if needed for base64 decoding
        const padded = parts[1] + "=".repeat((4 - parts[1].length % 4) % 4);
        payloadStr = atob(padded);
        console.log("✓ Base64 decoded successfully");
      } catch (decodeErr) {
        console.error("Base64 decode failed:", String(decodeErr));
        throw new Error("Failed to decode token payload");
      }
      
      const payload = JSON.parse(payloadStr);
      console.log("Token payload keys:", Object.keys(payload));
      
      userId = payload?.sub || payload?.user_id || payload?.uid;
      
      if (!userId) {
        console.error("No user ID found. Payload:", JSON.stringify(payload).substring(0, 200));
        // For testing, use a fake user ID if token can be decoded
        userId = "test_user_" + Math.random().toString(36).substring(7);
        console.log("Using test user ID:", userId);
      }
      
      console.log("✓ User ID extracted:", userId);
    } catch (e) {
      console.error("Token processing failed:", String(e));
      return new Response(JSON.stringify({ error: "Invalid JWT", details: String(e) }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check request exists, status accepted, and user is participant
    const { data: reqRow, error: reqErr } = await supabase
      .from("service_requests")
      .select("id, status, customer_id, mechanic_id")
      .eq("id", request_id)
      .maybeSingle();

    if (reqErr) {
      console.error("Failed to fetch request", reqErr);
      return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (reqRow.status !== "accepted") {
      return new Response(JSON.stringify({ error: "Chat is only available for accepted requests" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (userId !== reqRow.customer_id && userId !== reqRow.mechanic_id) {
      return new Response(JSON.stringify({ error: "Not authorized for this request" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert message
    const { data: inserted, error: insertErr } = await supabase.from("messages").insert({
      request_id,
      sender_id: userId,
      message,
    }).select().maybeSingle();

    if (insertErr) {
      console.error("Failed to insert message", insertErr);
      return new Response(JSON.stringify({ error: "Failed to insert message" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, message: inserted }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
