import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  pickup_address: string;
  drop_address: string;
  rider_current_lat?: number;
  rider_current_lng?: number;
  distance_remaining?: number;
  rides: {
    driver_id: string;
    profiles: {
      name: string;
    };
    vehicles: {
      brand: string;
      model: string;
    };
  };
}

interface TripInProgressMapProps {
  booking: Booking;
  isDriver?: boolean;
  onEndRide?: () => void;
}

const TripInProgressMap = ({ booking, isDriver = false, onEndRide }: TripInProgressMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const [mapConfig, setMapConfig] = useState<{ styleUrl: string; apiKey: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ola-maps-proxy", {
          body: { action: "map-style" },
        });
        if (error) throw error;
        setMapConfig(data);
      } catch (e) {
        console.error("Failed to load map config:", e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapConfig || mapRef.current) return;

    const initMap = async () => {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      const map = new maplibregl.default.Map({
        container: mapContainer.current!,
        style: `${mapConfig.styleUrl}?api_key=${mapConfig.apiKey}`,
        center: [booking.drop_lng, booking.drop_lat],
        zoom: 14,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        // Destination marker
        const destEl = document.createElement("div");
        destEl.style.cssText = "width:16px;height:16px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)";
        new maplibregl.default.Marker({ element: destEl })
          .setLngLat([booking.drop_lng, booking.drop_lat])
          .addTo(map);

        // Current location marker
        const currentLat = booking.rider_current_lat || booking.pickup_lat;
        const currentLng = booking.rider_current_lng || booking.pickup_lng;
        const curEl = document.createElement("div");
        curEl.style.cssText = "width:16px;height:16px;border-radius:50%;background:#00897B;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)";
        currentMarkerRef.current = new maplibregl.default.Marker({ element: curEl })
          .setLngLat([currentLng, currentLat])
          .addTo(map);

        // Fit bounds
        const bounds = new maplibregl.default.LngLatBounds();
        bounds.extend([currentLng, currentLat]);
        bounds.extend([booking.drop_lng, booking.drop_lat]);
        map.fitBounds(bounds, { padding: 100 });
      });
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapConfig]);

  useEffect(() => {
    if (booking.rider_current_lat && booking.rider_current_lng && currentMarkerRef.current) {
      currentMarkerRef.current.setLngLat([booking.rider_current_lng, booking.rider_current_lat]);
    }
  }, [booking.rider_current_lat, booking.rider_current_lng]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Trip Status Bar */}
      <Card className="absolute top-4 left-4 right-4 p-4 shadow-lg bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Badge className="bg-green-500 text-white mb-2">Trip In Progress</Badge>
            <h3 className="font-semibold">
              {booking.rides.profiles.name} • {booking.rides.vehicles.brand}{" "}
              {booking.rides.vehicles.model}
            </h3>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium truncate">{booking.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-medium truncate">{booking.drop_address}</p>
            </div>
          </div>
        </div>

        {booking.distance_remaining && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4" />
              {booking.distance_remaining.toFixed(1)} km remaining
            </div>
          </div>
        )}
      </Card>

      {/* Live Tracking Indicator */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-green-500 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Live Tracking
        </div>
      </div>
    </div>
  );
};

export default TripInProgressMap;
