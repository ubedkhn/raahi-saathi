import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMapProps {
  userLocation: { lat: number; lng: number };
  onMapReady?: () => void;
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
    const { data, error } = await supabase.functions.invoke("google-maps-key");
    if (error || !data?.key) throw new Error("No Maps key");
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}`;
      script.async = true;
      script.defer = true;
      script.onload = () => { window.__googleMapsLoaded = true; resolve(); };
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  } else {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (window.__googleMapsLoaded) { clearInterval(interval); resolve(); }
      }, 100);
    });
  }
};

// Simulate nearby drivers around a location
const generateNearbyDrivers = (center: { lat: number; lng: number }) => {
  const types = ["🚗", "🏍️", "🛺"];
  return Array.from({ length: 6 }, (_, i) => ({
    id: i,
    lat: center.lat + (Math.random() - 0.5) * 0.015,
    lng: center.lng + (Math.random() - 0.5) * 0.015,
    type: types[i % types.length],
    angle: Math.random() * 360,
  }));
};

const DashboardMap = ({ userLocation, onMapReady }: DashboardMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [error, setError] = useState(false);

  const initMap = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      await loadGoogleMapsScript();
      const G = window.google.maps;
      const map = new G.Map(mapRef.current, {
        center: userLocation,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
        ],
      });
      mapInstanceRef.current = map;

      // User marker - pulsing blue dot
      new G.Marker({
        position: userLocation,
        map,
        icon: {
          path: G.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 10,
      });

      // Accuracy circle
      new G.Circle({
        map,
        center: userLocation,
        radius: 100,
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.2,
        strokeWeight: 1,
      });

      // Animated nearby drivers
      const drivers = generateNearbyDrivers(userLocation);
      drivers.forEach((driver) => {
        const marker = new G.Marker({
          position: { lat: driver.lat, lng: driver.lng },
          map,
          label: { text: driver.type, fontSize: "20px" },
          zIndex: 5,
        });
        markersRef.current.push({ marker, driver });
      });

      // Animate drivers
      const animateDrivers = () => {
        markersRef.current.forEach(({ marker, driver }) => {
          const pos = marker.getPosition();
          if (pos) {
            const newLat = pos.lat() + (Math.random() - 0.5) * 0.0003;
            const newLng = pos.lng() + (Math.random() - 0.5) * 0.0003;
            marker.setPosition({ lat: newLat, lng: newLng });
          }
        });
      };
      const intervalId = setInterval(animateDrivers, 2000);

      onMapReady?.();

      return () => clearInterval(intervalId);
    } catch {
      setError(true);
    }
  }, [userLocation, onMapReady]);

  useEffect(() => {
    const cleanup = initMap();
    return () => { cleanup?.then((fn) => fn?.()); };
  }, [initMap]);

  if (error) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm">
      <div ref={mapRef} className="w-full h-48" />
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border shadow-sm">
        <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Drivers nearby
        </p>
      </div>
    </div>
  );
};

export default DashboardMap;
