import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NearbyRide {
  id: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_address: string;
  destination_address: string;
}

interface NearbyRidesMapProps {
  userLocation: { lat: number; lng: number };
  nearbyRides: NearbyRide[];
}

const NearbyRidesMap = ({ userLocation, nearbyRides }: NearbyRidesMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const expandedMapRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ styleUrl: string; apiKey: string } | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const expandedMapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ola-maps-proxy", {
          body: { action: "map-style" },
        });
        if (error) throw error;
        setMapConfig(data);
      } catch {
        setMapError(true);
      }
    };
    fetchConfig();
  }, []);

  const buildMap = useCallback(async (container: HTMLDivElement) => {
    if (!mapConfig) return null;
    try {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      const map = new maplibregl.default.Map({
        container,
        style: `${mapConfig.styleUrl}?api_key=${mapConfig.apiKey}`,
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        attributionControl: false,
      });

      map.on("load", () => {
        // User marker
        const el = document.createElement("div");
        el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)";
        new maplibregl.default.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);

        // Ride markers
        nearbyRides.forEach((ride) => {
          const rideEl = document.createElement("div");
          rideEl.style.cssText = "font-size:18px;cursor:pointer";
          rideEl.textContent = "🚗";

          new maplibregl.default.Marker({ element: rideEl })
            .setLngLat([Number(ride.origin_lng), Number(ride.origin_lat)])
            .setPopup(
              new maplibregl.default.Popup({ offset: 25 }).setHTML(
                `<div style="font-size:12px;max-width:180px"><strong>${ride.origin_address}</strong><br>→ ${ride.destination_address}</div>`
              )
            )
            .addTo(map);
        });
      });

      return map;
    } catch {
      setMapError(true);
      return null;
    }
  }, [mapConfig, userLocation, nearbyRides]);

  useEffect(() => {
    if (mapRef.current && mapConfig && !mapInstanceRef.current) {
      buildMap(mapRef.current).then((m) => { mapInstanceRef.current = m; });
    }
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [buildMap, mapConfig]);

  useEffect(() => {
    if (expanded && expandedMapRef.current && mapConfig) {
      buildMap(expandedMapRef.current).then((m) => { expandedMapInstanceRef.current = m; });
    }
    return () => {
      expandedMapInstanceRef.current?.remove();
      expandedMapInstanceRef.current = null;
    };
  }, [expanded, buildMap, mapConfig]);

  if (mapError) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              Your Location
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs">Expand</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={mapRef} className="w-full h-36 rounded-b-lg" />
        </CardContent>
      </Card>

      {expanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold">Nearby Rides Map</span>
            <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div ref={expandedMapRef} className="flex-1 w-full" />
        </div>
      )}
    </>
  );
};

export default NearbyRidesMap;
