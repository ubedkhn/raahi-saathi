import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MessageSquare, Navigation, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  driver_current_lat?: number;
  driver_current_lng?: number;
  estimated_arrival_time?: number;
  rides: {
    profiles: {
      name: string;
      phone: string;
      avatar_url: string;
    };
    vehicles: {
      brand: string;
      model: string;
      registration_no: string;
    };
  };
}

interface DriverArrivingMapProps {
  booking: Booking;
}

const DriverArrivingMap = ({ booking }: DriverArrivingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
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
        center: [booking.pickup_lng, booking.pickup_lat],
        zoom: 14,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        // Pickup marker
        const pickupEl = document.createElement("div");
        pickupEl.style.cssText = "width:16px;height:16px;border-radius:50%;background:#00897B;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)";
        new maplibregl.default.Marker({ element: pickupEl })
          .setLngLat([booking.pickup_lng, booking.pickup_lat])
          .addTo(map);

        // Driver marker if available
        if (booking.driver_current_lat && booking.driver_current_lng) {
          updateDriverLocation(booking.driver_current_lat, booking.driver_current_lng, maplibregl.default, map);
        }
      });
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapConfig]);

  useEffect(() => {
    if (booking.driver_current_lat && booking.driver_current_lng && mapRef.current) {
      import("maplibre-gl").then((maplibregl) => {
        updateDriverLocation(booking.driver_current_lat!, booking.driver_current_lng!, maplibregl.default, mapRef.current);
      });
    }
  }, [booking.driver_current_lat, booking.driver_current_lng]);

  const updateDriverLocation = (lat: number, lng: number, maplibregl: any, map: any) => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement("div");
      el.style.cssText = "width:40px;height:40px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px";
      el.textContent = "🚗";
      driverMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    }

    // Fit bounds
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([booking.pickup_lng, booking.pickup_lat]);
    bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 100 });
  };

  const handleCall = () => {
    window.location.href = `tel:${booking.rides.profiles.phone}`;
  };

  const handleMessage = () => {
    window.location.href = `sms:${booking.rides.profiles.phone}`;
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Driver Info Card */}
      <Card className="absolute top-4 left-4 right-4 p-4 shadow-lg bg-card/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={booking.rides.profiles.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {booking.rides.profiles.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-semibold text-lg">{booking.rides.profiles.name}</h3>
            <p className="text-sm text-muted-foreground">
              {booking.rides.vehicles.brand} {booking.rides.vehicles.model}
            </p>
            <p className="text-xs text-muted-foreground">{booking.rides.vehicles.registration_no}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={handleCall} className="gap-2">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button size="sm" variant="outline" onClick={handleMessage} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Text
            </Button>
          </div>
        </div>

        {booking.estimated_arrival_time && (
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
            <Clock className="h-4 w-4" />
            Driver arriving in {booking.estimated_arrival_time} mins
          </div>
        )}
      </Card>

      {/* Pickup Location Info */}
      <Card className="absolute bottom-4 left-4 right-4 p-4 shadow-lg bg-card/95 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Pickup Location</p>
            <p className="text-sm font-semibold truncate">{booking.pickup_address}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DriverArrivingMap;
