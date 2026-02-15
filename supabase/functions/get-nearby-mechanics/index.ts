import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // Get latitude and longitude from query parameters
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "0");
    const lng = parseFloat(url.searchParams.get("lng") || "0");
    const radius = parseFloat(url.searchParams.get("radius") || "50"); // Default 50km
    const mechanicId = url.searchParams.get("mechanicId");

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "lat and lng parameters required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all mechanics with location info (availability filtering is done client-side)
    const { data: mechanics, error } = await supabase
      .from("mechanic_details")
      .select("user_id, business_name, rating, total_reviews, current_lat, current_lng, business_lat, business_lng, is_available")
      .eq("is_verified", true)
      // mechanic should have either current or business coordinates to show up
      .or("current_lat.is.not.null,current_lng.is.not.null,business_lat.is.not.null,business_lng.is.not.null");

    if (error) {
      console.error("Error fetching mechanics:", error);
      throw error;
    }

    // if a specific mechanic ID was provided, ensure they are included even if outside radius
    if (mechanicId) {
      const { data: extra, error: extraErr } = await supabase
        .from("mechanic_details")
        .select("user_id, business_name, rating, total_reviews, current_lat, current_lng, business_lat, business_lng, is_available")
        .eq("user_id", mechanicId)
        .maybeSingle();
      if (extraErr) {
        console.error("Error fetching mechanic by id:", extraErr);
      } else if (extra) {
        if (!mechanics.find((m: any) => m.user_id === extra.user_id)) {
          mechanics.push(extra);
        }
      }
    }

    if (error) {
      console.error("Error fetching mechanics:", error);
      throw error;
    }

    if (!mechanics || mechanics.length === 0) {
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate distance for each mechanic and filter by radius
    const mechanicsWithDistance = mechanics
      .map((m: any) => {
        // pick business coords if available otherwise fallback to current
        const cLat = m.business_lat ?? m.current_lat;
        const cLng = m.business_lng ?? m.current_lng;
        const distance = calculateDistance(lat, lng, cLat, cLng);
        return { ...m, distance, display_lat: cLat, display_lng: cLng };
      })
      .filter((m) => {
        if (mechanicId && m.user_id === mechanicId) return true;
        return m.distance <= radius;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Limit to 10 closest mechanics

    // include business coords and display coords in the response
    return new Response(
      JSON.stringify({ data: mechanicsWithDistance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
