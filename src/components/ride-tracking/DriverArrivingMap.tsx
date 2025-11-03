import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, MessageSquare, Navigation, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // For demo, using a placeholder - user should add their Mapbox token
    const token = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNTBxeGRsZzBjbHoya3F1Zmh5ZzZ2cDkifQ.demo';
    setMapboxToken(token);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [booking.pickup_lng, booking.pickup_lat],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add pickup location marker
    pickupMarker.current = new mapboxgl.Marker({ color: '#00897B' })
      .setLngLat([booking.pickup_lng, booking.pickup_lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<p><strong>Pickup Location</strong><br/>${booking.pickup_address}</p>`))
      .addTo(map.current);

    // Add driver marker if location available
    if (booking.driver_current_lat && booking.driver_current_lng) {
      updateDriverLocation(booking.driver_current_lat, booking.driver_current_lng);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (booking.driver_current_lat && booking.driver_current_lng) {
      updateDriverLocation(booking.driver_current_lat, booking.driver_current_lng);
    }
  }, [booking.driver_current_lat, booking.driver_current_lng]);

  const updateDriverLocation = (lat: number, lng: number) => {
    if (!map.current) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([lng, lat]);
    } else {
      // Create custom driver marker
      const el = document.createElement('div');
      el.className = 'driver-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(/placeholder.svg)';
      el.style.backgroundSize = 'cover';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      driverMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<p><strong>Driver</strong><br/>${booking.rides.profiles.name}</p>`))
        .addTo(map.current);
    }

    // Fit map to show both markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([booking.pickup_lng, booking.pickup_lat]);
    bounds.extend([lng, lat]);
    map.current.fitBounds(bounds, { padding: 100 });

    // Draw route between driver and pickup
    drawRoute([lng, lat], [booking.pickup_lng, booking.pickup_lat]);
  };

  const drawRoute = async (from: [number, number], to: [number, number]) => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0].geometry;

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route,
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route,
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
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error drawing route:', error);
    }
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
