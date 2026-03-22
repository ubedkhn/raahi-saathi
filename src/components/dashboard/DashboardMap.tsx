import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMapProps {
  userLocation: { lat: number; lng: number };
  onMapReady?: () => void;
}

// Simulate nearby drivers around a location
const generateNearbyDrivers = (center: { lat: number; lng: number }) => {
  const types = ["🚗", "🏍️", "🛺"];
  return Array.from({ length: 6 }, (_, i) => ({
    id: i,
    lat: center.lat + (Math.random() - 0.5) * 0.015,
    lng: center.lng + (Math.random() - 0.5) * 0.015,
    type: types[i % types.length],
  }));
};

const DashboardMap = ({ userLocation, onMapReady }: DashboardMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const animateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapConfig, setMapConfig] = useState<{ styleUrl: string; apiKey: string } | null>(null);

  // Fetch Ola Maps config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ola-maps-proxy", {
          body: { action: "map-style" },
        });
        if (error) throw error;
        setMapConfig(data);
      } catch {
        setError(true);
      }
    };
    fetchConfig();
  }, []);

  const initMap = useCallback(async () => {
    if (!mapRef.current || !mapConfig || mapInstanceRef.current) return;

    try {
      // Use MapLibre GL (Ola Maps vector tiles are compatible)
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");

      const styleUrl = `${mapConfig.styleUrl}?api_key=${mapConfig.apiKey}`;

      const map = new maplibregl.default.Map({
        container: mapRef.current,
        style: styleUrl,
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        // User location marker - pulsing blue dot
        const el = document.createElement("div");
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#3b82f6";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.2), 0 2px 4px rgba(0,0,0,0.3)";

        new maplibregl.default.Marker({ element: el })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map);

        // Animated nearby drivers
        const drivers = generateNearbyDrivers(userLocation);
        drivers.forEach((driver) => {
          const markerEl = document.createElement("div");
          markerEl.style.fontSize = "20px";
          markerEl.style.cursor = "pointer";
          markerEl.textContent = driver.type;

          const marker = new maplibregl.default.Marker({ element: markerEl })
            .setLngLat([driver.lng, driver.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });

        // Animate drivers
        const animateDrivers = () => {
          markersRef.current.forEach((marker) => {
            const pos = marker.getLngLat();
            marker.setLngLat([
              pos.lng + (Math.random() - 0.5) * 0.0003,
              pos.lat + (Math.random() - 0.5) * 0.0003,
            ]);
          });
        };
        const intervalId = setInterval(animateDrivers, 2000);

        onMapReady?.();

        map._animateInterval = intervalId;
      });
    } catch {
      setError(true);
    }
  }, [userLocation, onMapReady, mapConfig]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapInstanceRef.current) {
        clearInterval(mapInstanceRef.current._animateInterval);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
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
