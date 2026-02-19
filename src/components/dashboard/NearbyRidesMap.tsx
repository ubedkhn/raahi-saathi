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

declare global {
  interface Window {
    google: any;
    __googleMapsLoading?: boolean;
    __googleMapsLoaded?: boolean;
  }
}

const loadGoogleMapsScript = async (): Promise<void> => {
  if (window.__googleMapsLoaded) return;

  if (!window.__googleMapsLoading) {
    window.__googleMapsLoading = true;
    // Fetch key from edge function
    const { data, error } = await supabase.functions.invoke("google-maps-key");
    if (error || !data?.key) throw new Error("No Maps key");

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.__googleMapsLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  } else {
    // Wait for ongoing load
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (window.__googleMapsLoaded) { clearInterval(interval); resolve(); }
      }, 100);
    });
  }
};

const buildMap = (
  container: HTMLElement,
  userLocation: { lat: number; lng: number },
  nearbyRides: NearbyRide[]
) => {
  const G = window.google.maps;
  const map = new G.Map(container, {
    center: userLocation,
    zoom: 15,
    disableDefaultUI: true,
    gestureHandling: "greedy",
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
    ],
  });

  // User marker
  new G.Marker({
    position: userLocation,
    map,
    icon: {
      path: G.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#4285F4",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    },
    title: "You are here",
    zIndex: 10,
  });

  // Nearby ride markers
  nearbyRides.forEach((ride, i) => {
    const marker = new G.Marker({
      position: { lat: Number(ride.origin_lat), lng: Number(ride.origin_lng) },
      map,
      label: { text: "🚗", fontSize: "18px" },
      title: ride.origin_address,
    });

    if (i < 3) {
      marker.setAnimation(G.Animation.BOUNCE);
      setTimeout(() => marker.setAnimation(null), 1500);
    }

    const info = new G.InfoWindow({
      content: `<div style="font-size:12px;max-width:180px"><strong>${ride.origin_address}</strong><br>→ ${ride.destination_address}</div>`,
    });
    marker.addListener("click", () => info.open(map, marker));
  });

  return map;
};

const NearbyRidesMap = ({ userLocation, nearbyRides }: NearbyRidesMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const expandedMapRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const initMap = useCallback(async (container: HTMLDivElement) => {
    try {
      await loadGoogleMapsScript();
      buildMap(container, userLocation, nearbyRides);
      setInitialized(true);
    } catch {
      setMapError(true);
    }
  }, [userLocation, nearbyRides]);

  useEffect(() => {
    if (mapRef.current && !initialized) {
      initMap(mapRef.current);
    }
  }, [initMap, initialized]);

  useEffect(() => {
    if (expanded && expandedMapRef.current) {
      initMap(expandedMapRef.current);
    }
  }, [expanded, initMap]);

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
