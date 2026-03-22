import { supabase } from "@/integrations/supabase/client";

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Forward geocode: search for locations via Ola Maps autocomplete
 */
export async function searchLocation(query: string): Promise<LocationResult[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const { data, error } = await supabase.functions.invoke("ola-maps-proxy", {
      body: { action: "autocomplete", input: query.trim() },
    });

    if (error) throw error;

    // Ola Maps autocomplete returns { predictions: [...] }
    const predictions = data?.predictions || [];
    return predictions.map((p: any) => ({
      address: p.structured_formatting?.main_text || p.description || "",
      latitude: p.geometry?.location?.lat || 0,
      longitude: p.geometry?.location?.lng || 0,
      displayName: p.description || p.structured_formatting?.main_text || "",
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

/**
 * Reverse geocode: lat/lng → address via Ola Maps
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("ola-maps-proxy", {
      body: { action: "reverse-geocode", lat, lng },
    });

    if (error) throw error;

    const results = data?.results || [];
    return results[0]?.formatted_address || results[0]?.address_components?.map((c: any) => c.long_name).join(", ") || null;
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
