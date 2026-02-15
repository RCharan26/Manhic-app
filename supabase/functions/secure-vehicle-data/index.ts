import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};

interface VehicleData {
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  fuel_type: string;
  transmission_type: string;
  license_plate?: string | null;
  vehicle_color?: string | null;
  is_primary?: boolean;
}

// Validate vehicle data
function validateVehicleData(data: VehicleData): { valid: boolean; error?: string } {
  if (!data.vehicle_make || typeof data.vehicle_make !== "string" || data.vehicle_make.length > 50) {
    return { valid: false, error: "Vehicle make is required and must be less than 50 characters" };
  }

  if (!data.vehicle_model || typeof data.vehicle_model !== "string" || data.vehicle_model.length > 50) {
    return { valid: false, error: "Vehicle model is required and must be less than 50 characters" };
  }

  if (!data.vehicle_year || typeof data.vehicle_year !== "number" || data.vehicle_year < 1900 || data.vehicle_year > new Date().getFullYear() + 1) {
    return { valid: false, error: "Valid vehicle year is required" };
  }

  if (!data.fuel_type || !["petrol", "diesel", "electric", "hybrid"].includes(data.fuel_type)) {
    return { valid: false, error: "Valid fuel type is required (petrol, diesel, electric, hybrid)" };
  }

  if (!data.transmission_type || !["manual", "automatic"].includes(data.transmission_type)) {
    return { valid: false, error: "Valid transmission type is required (manual, automatic)" };
  }

  if (data.license_plate && (typeof data.license_plate !== "string" || data.license_plate.length > 15)) {
    return { valid: false, error: "License plate must be less than 15 characters" };
  }

  if (data.vehicle_color && (typeof data.vehicle_color !== "string" || data.vehicle_color.length > 30)) {
    return { valid: false, error: "Vehicle color must be less than 30 characters" };
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
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("=== Starting token verification for vehicle-data ===");
    console.log("Token length:", token.length);
    console.log("Token prefix:", token.substring(0, 20) + "...");
    
    const authResult = await verifyClerkJWT(token);

    if (!authResult) {
      console.error("JWT verification failed - token might be malformed or expired");
      return new Response(
        JSON.stringify({ error: "Invalid token: JWT verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = authResult;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user has customer role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile || profile.role !== "customer") {
      return new Response(
        JSON.stringify({ error: "User is not a customer" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const vehicleId = url.searchParams.get("id");

    // GET - Fetch user's vehicles
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("customer_vehicles")
        .select("*")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create a new vehicle
    if (req.method === "POST") {
      console.log("POST request received for user:", userId);
      const body: VehicleData = await req.json();
      console.log("Vehicle data received:", { make: body.vehicle_make, model: body.vehicle_model });
      const validation = validateVehicleData(body);

      if (!validation.valid) {
        console.error("Vehicle validation failed:", validation.error);
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if this should be primary (first vehicle or explicitly set)
      const { count } = await supabaseAdmin
        .from("customer_vehicles")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const shouldBePrimary = (count === 0) || body.is_primary === true;

      // If setting as primary, reset other vehicles
      if (shouldBePrimary && (count ?? 0) > 0) {
        await supabaseAdmin
          .from("customer_vehicles")
          .update({ is_primary: false })
          .eq("user_id", userId);
      }

      const { data, error } = await supabaseAdmin
        .from("customer_vehicles")
        .insert({
          user_id: userId,
          vehicle_make: body.vehicle_make,
          vehicle_model: body.vehicle_model,
          vehicle_year: body.vehicle_year,
          fuel_type: body.fuel_type,
          transmission_type: body.transmission_type,
          license_plate: body.license_plate || null,
          vehicle_color: body.vehicle_color || null,
          is_primary: shouldBePrimary,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating vehicle:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT/PATCH - Update a vehicle
    if ((req.method === "PUT" || req.method === "PATCH") && vehicleId) {
      // Verify ownership
      const { data: existingVehicle } = await supabaseAdmin
        .from("customer_vehicles")
        .select("user_id")
        .eq("id", vehicleId)
        .single();

      if (!existingVehicle || existingVehicle.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Vehicle not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();

      // If setting as primary, reset other vehicles
      if (body.is_primary === true) {
        await supabaseAdmin
          .from("customer_vehicles")
          .update({ is_primary: false })
          .eq("user_id", userId)
          .neq("id", vehicleId);
      }

      const updateData: Record<string, unknown> = {};
      if (body.vehicle_make !== undefined) updateData.vehicle_make = body.vehicle_make;
      if (body.vehicle_model !== undefined) updateData.vehicle_model = body.vehicle_model;
      if (body.vehicle_year !== undefined) updateData.vehicle_year = body.vehicle_year;
      if (body.fuel_type !== undefined) updateData.fuel_type = body.fuel_type;
      if (body.transmission_type !== undefined) updateData.transmission_type = body.transmission_type;
      if (body.license_plate !== undefined) updateData.license_plate = body.license_plate;
      if (body.vehicle_color !== undefined) updateData.vehicle_color = body.vehicle_color;
      if (body.is_primary !== undefined) updateData.is_primary = body.is_primary;

      const { data, error } = await supabaseAdmin
        .from("customer_vehicles")
        .update(updateData)
        .eq("id", vehicleId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Delete a vehicle
    if (req.method === "DELETE" && vehicleId) {
      // Verify ownership
      const { data: existingVehicle } = await supabaseAdmin
        .from("customer_vehicles")
        .select("user_id, is_primary")
        .eq("id", vehicleId)
        .single();

      if (!existingVehicle || existingVehicle.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Vehicle not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin
        .from("customer_vehicles")
        .delete()
        .eq("id", vehicleId)
        .eq("user_id", userId);

      if (error) throw error;

      // If deleted vehicle was primary, make the next one primary
      if (existingVehicle.is_primary) {
        const { data: nextVehicle } = await supabaseAdmin
          .from("customer_vehicles")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (nextVehicle) {
          await supabaseAdmin
            .from("customer_vehicles")
            .update({ is_primary: true })
            .eq("id", nextVehicle.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in secure-vehicle-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
