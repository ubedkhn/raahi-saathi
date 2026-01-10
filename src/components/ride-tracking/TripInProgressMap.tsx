import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, Clock } from 'lucide-react';

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
  const map = useRef<mapboxgl.Map | null>(null);
  const currentLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  useEffect(() => {
    // For demo - user should add their Mapbox token
    const token = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNTBxeGRsZzBjbHoya3F1Zmh5ZzZ2cDkifQ.demo';
    setMapboxToken(token);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [booking.drop_lng, booking.drop_lat],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add destination marker
    destinationMarker.current = new mapboxgl.Marker({ color: '#EF4444' })
      .setLngLat([booking.drop_lng, booking.drop_lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<p><strong>Destination</strong><br/>${booking.drop_address}</p>`
        )
      )
      .addTo(map.current);

    // Add current location marker
    const currentLat = booking.rider_current_lat || booking.pickup_lat;
    const currentLng = booking.rider_current_lng || booking.pickup_lng;
    
    currentLocationMarker.current = new mapboxgl.Marker({ color: '#00897B' })
      .setLngLat([currentLng, currentLat])
      .setPopup(new mapboxgl.Popup().setHTML('<p><strong>Current Location</strong></p>'))
      .addTo(map.current);

    updateRoute(currentLat, currentLng);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (booking.rider_current_lat && booking.rider_current_lng) {
      updateCurrentLocation(booking.rider_current_lat, booking.rider_current_lng);
    }
  }, [booking.rider_current_lat, booking.rider_current_lng]);

  const updateCurrentLocation = (lat: number, lng: number) => {
    if (currentLocationMarker.current) {
      currentLocationMarker.current.setLngLat([lng, lat]);
      updateRoute(lat, lng);
    }
  };

  const updateRoute = async (fromLat: number, fromLng: number) => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${booking.drop_lng},${booking.drop_lat}?geometries=geojson&steps=true&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const geometry = route.geometry;
        
        // Update estimated time
        setEstimatedTime(Math.round(route.duration / 60));

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: geometry,
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: geometry,
            },
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#00897B',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });

          // Add arrow layer for direction
          map.current.addLayer({
            id: 'route-arrow',
            type: 'symbol',
            source: 'route',
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': 50,
              'icon-image': 'arrow',
              'icon-size': 0.5,
              'icon-rotate': 90,
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
        }

        // Fit map to show route
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([fromLng, fromLat]);
        bounds.extend([booking.drop_lng, booking.drop_lat]);
        map.current.fitBounds(bounds, { padding: 100 });
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Trip Status Bar */}
      <Card className="absolute top-4 left-4 right-4 p-4 shadow-lg bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Badge className="bg-success text-success-foreground mb-2">
              Trip In Progress
            </Badge>
            <h3 className="font-semibold">
              {booking.rides.profiles.name} • {booking.rides.vehicles.brand}{' '}
              {booking.rides.vehicles.model}
            </h3>
          </div>
          {estimatedTime && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              {estimatedTime} mins
            </div>
          )}
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
        <div className="bg-success text-success-foreground px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Live Tracking
        </div>
      </div>
    </div>
  );
};

export default TripInProgressMap;
