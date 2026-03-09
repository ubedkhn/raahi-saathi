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

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { ride_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng } = body;

    if (!ride_id || !pickup_address || !drop_address) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate ride exists and has seats
    const { data: ride, error: rideError } = await admin.from("rides").select("*").eq("id", ride_id).single();
    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (ride.status !== "scheduled") {
      return new Response(JSON.stringify({ error: "Ride is no longer available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (ride.driver_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot book your own ride" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check existing booking
    const { data: existing } = await admin.from("bookings").select("id").eq("ride_id", ride_id).eq("rider_id", user.id).neq("status", "cancelled");
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Already booked on this ride" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check seats (count non-cancelled bookings)
    const { count } = await admin.from("bookings").select("id", { count: "exact" }).eq("ride_id", ride_id).neq("status", "cancelled");
    if ((count || 0) >= ride.seats_available) {
      return new Response(JSON.stringify({ error: "No seats available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Server-side fare calculation
    const R = 6371;
    const dLat = (drop_lat - pickup_lat) * Math.PI / 180;
    const dLon = (drop_lng - pickup_lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(pickup_lat * Math.PI / 180) * Math.cos(drop_lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const fare = Math.max(Math.round(distance * Number(ride.price_per_km)), 10);

    // Insert booking
    const { data: booking, error: bookingError } = await admin.from("bookings").insert({
      ride_id,
      rider_id: user.id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      drop_address,
      drop_lat,
      drop_lng,
      fare_amount: fare,
      status: "pending",
    }).select().single();

    if (bookingError) {
      return new Response(JSON.stringify({ error: bookingError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ booking, fare }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
