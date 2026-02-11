import { supabase } from "@/integrations/supabase/client";

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Forward geocode: search for locations via Mapbox (proxied through edge function)
 */
export async function searchLocation(query: string): Promise<LocationResult[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const { data, error } = await supabase.functions.invoke("mapbox-geocode", {
      body: { type: "forward", query: query.trim() },
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

/**
 * Reverse geocode: lat/lng → address via Mapbox
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("mapbox-geocode", {
      body: { type: "reverse", lat, lng },
    });

    if (error) throw error;
    return data?.[0]?.address || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Debounce helper function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}
