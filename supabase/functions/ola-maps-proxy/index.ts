import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user — prevents anonymous abuse of OLA Maps quota
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OLA_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OLA_MAPS_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    let url: string;
    let method = "GET";

    switch (action) {
      case "autocomplete":
        url = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(params.input)}&api_key=${apiKey}`;
        break;
      case "geocode":
        url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(params.address)}&api_key=${apiKey}`;
        break;
      case "reverse-geocode":
        url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${params.lat},${params.lng}&api_key=${apiKey}`;
        break;
      case "directions":
        url = `https://api.olamaps.io/routing/v1/directions?origin=${params.origin}&destination=${params.destination}&api_key=${apiKey}`;
        method = "POST";
        break;
      case "distance-matrix":
        url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${params.origins}&destinations=${params.destinations}&api_key=${apiKey}`;
        break;
      case "map-style":
        // Return only the style URL — never expose the API key to clients.
        return new Response(
          JSON.stringify({
            styleUrl: `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(url, { method });
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
