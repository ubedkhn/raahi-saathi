import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { vehicle_id, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, start_time, seats_available, price_per_km } = body;

    if (!vehicle_id || !origin_address || !destination_address || !start_time || !seats_available || !price_per_km) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate vehicle belongs to user and is verified
    const { data: vehicle, error: vErr } = await admin.from("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user.id).single();
    if (vErr || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle not found or not yours" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!vehicle.verified) {
      return new Response(JSON.stringify({ error: "Vehicle not verified yet" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate KYC
    const { data: profile } = await admin.from("profiles").select("kyc_status").eq("id", user.id).single();
    if (!profile || profile.kyc_status !== "verified") {
      return new Response(JSON.stringify({ error: "KYC not verified" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate start_time is in the future
    if (new Date(start_time) < new Date()) {
      return new Response(JSON.stringify({ error: "Start time must be in the future" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate price range
    if (price_per_km < 1 || price_per_km > 100) {
      return new Response(JSON.stringify({ error: "Price must be between ₹1 and ₹100 per km" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert ride
    const { data: ride, error: rideError } = await admin.from("rides").insert({
      driver_id: user.id,
      vehicle_id,
      origin_address,
      origin_lat,
      origin_lng,
      destination_address,
      destination_lat,
      destination_lng,
      start_time,
      seats_available,
      price_per_km,
      status: "scheduled",
    }).select().single();

    if (rideError) {
      return new Response(JSON.stringify({ error: rideError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ride }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
