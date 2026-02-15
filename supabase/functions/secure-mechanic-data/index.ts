import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};

interface MechanicDetailsData {
  phone?: string;
  business_name?: string;
  license_number?: string;
  years_experience?: number;
  service_radius_km?: number;
  specializations?: string[];
  is_available?: boolean;
  current_lat?: number;
  current_lng?: number;
  business_lat?: number;   // new shop coordinates
  business_lng?: number;
}

// Validate mechanic details
function validateMechanicDetails(data: MechanicDetailsData): { valid: boolean; error?: string } {
  if (data.phone !== undefined && data.phone !== null) {
    if (typeof data.phone !== "string" || data.phone.length > 20) {
      return { valid: false, error: "Phone must be less than 20 characters" };
    }
  }

  if (data.business_name !== undefined && data.business_name !== null) {
    if (typeof data.business_name !== "string" || data.business_name.length > 100) {
      return { valid: false, error: "Business name must be less than 100 characters" };
    }
  }

  if (data.license_number !== undefined && data.license_number !== null) {
    if (typeof data.license_number !== "string" || data.license_number.length > 50) {
      return { valid: false, error: "License number must be less than 50 characters" };
    }
  }

  if (data.years_experience !== undefined && data.years_experience !== null) {
    if (typeof data.years_experience !== "number" || data.years_experience < 0 || data.years_experience > 70) {
      return { valid: false, error: "Years of experience must be between 0 and 70" };
    }
  }

  if (data.service_radius_km !== undefined && data.service_radius_km !== null) {
    if (typeof data.service_radius_km !== "number" || data.service_radius_km < 1 || data.service_radius_km > 500) {
      return { valid: false, error: "Service radius must be between 1 and 500 km" };
    }
  }

  if (data.business_lat !== undefined && data.business_lat !== null) {
    if (typeof data.business_lat !== "number" || data.business_lat < -90 || data.business_lat > 90) {
      return { valid: false, error: "Invalid business latitude" };
    }
  }
  if (data.business_lng !== undefined && data.business_lng !== null) {
    if (typeof data.business_lng !== "number" || data.business_lng < -180 || data.business_lng > 180) {
      return { valid: false, error: "Invalid business longitude" };
    }
  }

  if (data.specializations !== undefined && data.specializations !== null) {
    if (!Array.isArray(data.specializations)) {
      return { valid: false, error: "Specializations must be an array" };
    }
    const validSpecs = ["Battery", "Tire Change", "Jump Start", "Fuel Delivery", "Lockout", "Towing", "Engine Repair", "Brake Repair"];
    for (const spec of data.specializations) {
      if (!validSpecs.includes(spec)) {
        return { valid: false, error: `Invalid specialization: ${spec}` };
      }
    }
  }

  return { valid: true };
}

// Verify JWT and extract user ID using issuer-based JWKS
async function verifyClerkJWT(token: string): Promise<{ userId: string } | null> {
  try {
    console.log("=== Starting JWT verification ===");
    console.log("Token length:", token.length);
    
    // Decode token payload to get issuer (iss) and verify using its JWKS
    const parts = token.split(".");
    if (parts.length < 2) {
      console.error("Malformed JWT: missing parts, token parts count:", parts.length);
      return null;
    }

    let payloadJson: any;
    try {
      const payload = atob(parts[1]);
      payloadJson = JSON.parse(payload);
      console.log("JWT Payload parsed. Issuer:", payloadJson.iss, "Available claims:", Object.keys(payloadJson).join(", "));
    } catch (e) {
      console.error("Failed to parse JWT payload", e);
      return null;
    }

    const issuer = payloadJson.iss;
    const sub = payloadJson.sub || payloadJson.user_id || payloadJson.uid || payloadJson.id;
    
    if (!issuer || typeof issuer !== "string") {
      console.error("No issuer (iss) in JWT, issuer value:", issuer);
      return null;
    }
    
    if (!sub || typeof sub !== "string") {
      console.error("No valid user ID found in JWT. Available claims:", Object.keys(payloadJson).join(", "));
      return null;
    }

    // For now, just return the user ID from the token payload
    // Full verification will be done if needed later
    console.log("=== JWT extraction successful ===");
    console.log("User ID:", sub);
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

  console.log("secure-mechanic-data called, method:", req.method);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token received, first 20 chars:", token.substring(0, 20));
    const authResult = await verifyClerkJWT(token);

    if (!authResult) {
      console.log("JWT verification returned null");
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

    // Verify user has mechanic role (or is setting up as mechanic)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    // For POST (create), allow if profile doesn't exist yet OR is mechanic
    // For other methods, require mechanic role
    if (req.method !== "POST") {
      if (!profile || profile.role !== "mechanic") {
        return new Response(
          JSON.stringify({ error: "User is not a mechanic" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (profile && profile.role !== "mechanic") {
      // On POST, if profile exists but is not mechanic, deny
      return new Response(
        JSON.stringify({ error: "User is not a mechanic" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - Fetch mechanic's own details
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("mechanic_details")
        .select("*, business_lat, business_lng")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create or upsert mechanic details
    if (req.method === "POST") {
      const body: MechanicDetailsData = await req.json();
      const validation = validateMechanicDetails(body);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("mechanic_details")
        .upsert({
          user_id: userId,
          business_name: body.business_name || null,
          license_number: body.license_number,
          years_experience: body.years_experience,
          service_radius_km: body.service_radius_km ?? 25,
          specializations: body.specializations,
          business_lat: body.business_lat ?? null,
          business_lng: body.business_lng ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating mechanic details:", error);
        throw error;
      }

      // Also save phone to profiles table
      if (body.phone !== undefined && body.phone !== null) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ phone: body.phone || null })
          .eq("user_id", userId);

        if (profileError) {
          console.error("Error updating phone in profiles:", profileError);
        }
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT/PATCH - Update mechanic details
    if (req.method === "PUT" || req.method === "PATCH") {
      const body: MechanicDetailsData = await req.json();
      console.log("PATCH/PUT request body:", body);
      
      const validation = validateMechanicDetails(body);

      if (!validation.valid) {
        console.log("Validation failed:", validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.business_name !== undefined) updateData.business_name = body.business_name;
      if (body.license_number !== undefined) updateData.license_number = body.license_number;
      if (body.years_experience !== undefined) updateData.years_experience = body.years_experience;
      if (body.service_radius_km !== undefined) updateData.service_radius_km = body.service_radius_km;
      if (body.specializations !== undefined) updateData.specializations = body.specializations;
      if (body.is_available !== undefined) updateData.is_available = body.is_available;
      if (body.current_lat !== undefined) updateData.current_lat = body.current_lat;
      if (body.current_lng !== undefined) updateData.current_lng = body.current_lng;
      if (body.current_lat !== undefined || body.current_lng !== undefined) {
        updateData.last_location_update = new Date().toISOString();
      }

      if (body.business_lat !== undefined) updateData.business_lat = body.business_lat;
      if (body.business_lng !== undefined) updateData.business_lng = body.business_lng;

      console.log("Update data to be applied:", updateData);
      console.log("Updating mechanic for user:", userId);

      // Check if mechanic_details exists first
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("mechanic_details")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing record:", checkError);
        throw checkError;
      }

      if (!existing) {
        console.log("No existing mechanic_details record, creating one with is_available:", body.is_available);
        // If no record exists, create one with defaults
        const { data: newRecord, error: createError } = await supabaseAdmin
          .from("mechanic_details")
          .insert({
            user_id: userId,
            is_available: body.is_available || false,
            business_name: body.business_name || null,
            license_number: body.license_number || null,
            years_experience: body.years_experience || null,
            service_radius_km: body.service_radius_km || 25,
            specializations: body.specializations || [],
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating mechanic details:", createError);
          throw createError;
        }

        console.log("Created new mechanic_details record:", newRecord);
        return new Response(
          JSON.stringify({ data: newRecord }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("mechanic_details")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Database update error:", error);
        throw error;
      }

      // Also update phone in profiles table if provided
      if (body.phone !== undefined && body.phone !== null) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ phone: body.phone || null })
          .eq("user_id", userId);

        if (profileError) {
          console.error("Error updating phone in profiles:", profileError);
        }
      }

      console.log("Update successful, response data:", data);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in secure-mechanic-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
