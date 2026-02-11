import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!MAPBOX_TOKEN) {
    return new Response(JSON.stringify({ error: "MAPBOX_ACCESS_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { type, query, lat, lng } = await req.json();

    let url: string;
    if (type === "reverse" && lat !== undefined && lng !== undefined) {
      url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=in`;
    } else if (type === "forward" && query) {
      url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=in&types=place,locality,neighborhood,address,poi`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid params. Need {type:'forward',query} or {type:'reverse',lat,lng}" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mapbox API error [${res.status}]: ${text}`);
    }

    const data = await res.json();
    
    const results = (data.features || []).map((f: any) => ({
      address: f.place_name,
      displayName: f.place_name,
      latitude: f.center[1],
      longitude: f.center[0],
    }));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Mapbox geocode error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
