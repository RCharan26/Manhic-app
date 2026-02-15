import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.0.0/jwt/verify.ts";
import { createRemoteJWKSet } from "https://deno.land/x/jose@v5.0.0/jwks/remote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SAFE JSON PARSE
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Missing JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, role, full_name, phone } = body;

    // user_id is required for POST (creating profile), but not for PATCH (updating profile)
    if (req.method === "POST" && !user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify Authorization token (Clerk JWT)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.split(" ")[1];
    
    // Extract user ID from token payload without full verification
    let userId: string | null = null;
    try {
      console.log("=== Starting JWT extraction ===");
      const payloadB64 = token.split('.')[1];
      const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(padded);
      const decodedPayload = JSON.parse(json);
      userId = decodedPayload?.sub;
      console.log("JWT Payload extracted. User ID:", userId);
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.error('Failed to decode token payload', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle GET: Fetch profile (for mechanic name display)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const profileId = url.searchParams.get("id");

      if (!profileId) {
        return new Response(
          JSON.stringify({ error: "id parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, role, phone")
        .eq("user_id", profileId)
        .single();

      if (error || !data) {
        console.error("Profile fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PATCH: Update profile (full_name and/or phone)
    if (req.method === "PATCH") {
      const updateData: Record<string, any> = {};
      
      if (full_name !== undefined) {
        updateData.full_name = full_name;
      }
      if (phone !== undefined) {
        updateData.phone = phone || null;
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: "No fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (error) {
        console.error("PATCH error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle POST: Create profile
    if (req.method === "POST") {
      if (!role) {
        return new Response(
          JSON.stringify({ error: "role required for POST" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing profile
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert profile
      const { error } = await supabase.from("profiles").insert({
        user_id,
        full_name,
        role,
        phone: phone || null,
      });

      if (error) throw error;

      // Insert role
      await supabase.from("user_roles").insert({
        user_id,
        role,
      });

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
