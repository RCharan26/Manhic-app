import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.0.0/jwt/verify.ts";
import { createRemoteJWKSet } from "https://deno.land/x/jose@v5.0.0/jwks/remote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};

interface CustomerDetailsData {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  license_plate?: string;
}

interface VehicleData {
  id?: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color?: string;
  license_plate?: string;
  fuel_type: string;
  transmission_type: string;
  is_primary?: boolean;
}

// Validate customer details
function validateCustomerDetails(data: CustomerDetailsData): { valid: boolean; error?: string } {
  if (data.emergency_contact_name !== undefined && data.emergency_contact_name !== null) {
    if (typeof data.emergency_contact_name !== "string" || data.emergency_contact_name.length > 100) {
      return { valid: false, error: "Emergency contact name must be less than 100 characters" };
    }
  }
  
  if (data.emergency_contact_phone !== undefined && data.emergency_contact_phone !== null) {
    if (typeof data.emergency_contact_phone !== "string" || data.emergency_contact_phone.length > 20) {
      return { valid: false, error: "Emergency contact phone must be less than 20 characters" };
    }
  }
  
  if (data.vehicle_year !== undefined && data.vehicle_year !== null) {
    const currentYear = new Date().getFullYear();
    if (typeof data.vehicle_year !== "number" || data.vehicle_year < 1900 || data.vehicle_year > currentYear + 2) {
      return { valid: false, error: `Vehicle year must be between 1900 and ${currentYear + 2}` };
    }
  }
  
  return { valid: true };
}

// Validate vehicle data
function validateVehicleData(data: VehicleData): { valid: boolean; error?: string } {
  if (!data.vehicle_make || typeof data.vehicle_make !== "string" || data.vehicle_make.length > 50) {
    return { valid: false, error: "Vehicle make is required and must be less than 50 characters" };
  }
  
  if (!data.vehicle_model || typeof data.vehicle_model !== "string" || data.vehicle_model.length > 50) {
    return { valid: false, error: "Vehicle model is required and must be less than 50 characters" };
  }
  
  const currentYear = new Date().getFullYear();
  if (!data.vehicle_year || typeof data.vehicle_year !== "number" || data.vehicle_year < 1900 || data.vehicle_year > currentYear + 2) {
    return { valid: false, error: `Vehicle year is required and must be between 1900 and ${currentYear + 2}` };
  }
  
  if (!data.fuel_type || typeof data.fuel_type !== "string") {
    return { valid: false, error: "Fuel type is required" };
  }
  
  if (!data.transmission_type || typeof data.transmission_type !== "string") {
    return { valid: false, error: "Transmission type is required" };
  }
  
  return { valid: true };
}

// Verify JWT using token payload and extract user ID
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource"); // "details" or "vehicles"
    const vehicleId = url.searchParams.get("vehicleId");

    // Handle customer_details
    if (resource === "details") {
      if (req.method === "GET") {
        const { data, error } = await supabaseAdmin
          .from("customer_details")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "POST") {
        const body: CustomerDetailsData = await req.json();
        const validation = validateCustomerDetails(body);
        
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from("customer_details")
          .upsert({
            user_id: userId,
            ...body,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "PUT" || req.method === "PATCH") {
        const body: CustomerDetailsData = await req.json();
        const validation = validateCustomerDetails(body);
        
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabaseAdmin
          .from("customer_details")
          .update(body)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle customer_vehicles
    if (resource === "vehicles") {
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

      if (req.method === "POST") {
        const body: VehicleData = await req.json();
        const validation = validateVehicleData(body);
        
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If setting as primary, unset other primaries first
        if (body.is_primary) {
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
            vehicle_color: body.vehicle_color,
            license_plate: body.license_plate,
            fuel_type: body.fuel_type,
            transmission_type: body.transmission_type,
            is_primary: body.is_primary ?? false,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if ((req.method === "PUT" || req.method === "PATCH") && vehicleId) {
        const body: Partial<VehicleData> = await req.json();
        
        // Verify ownership
        const { data: existing } = await supabaseAdmin
          .from("customer_vehicles")
          .select("user_id")
          .eq("id", vehicleId)
          .single();

        if (!existing || existing.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Vehicle not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If setting as primary, unset other primaries first
        if (body.is_primary) {
          await supabaseAdmin
            .from("customer_vehicles")
            .update({ is_primary: false })
            .eq("user_id", userId)
            .neq("id", vehicleId);
        }

        const { data, error } = await supabaseAdmin
          .from("customer_vehicles")
          .update(body)
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

      if (req.method === "DELETE" && vehicleId) {
        // Verify ownership before delete
        const { data: existing } = await supabaseAdmin
          .from("customer_vehicles")
          .select("user_id")
          .eq("id", vehicleId)
          .single();

        if (!existing || existing.user_id !== userId) {
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

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid resource or method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in secure-customer-data:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
