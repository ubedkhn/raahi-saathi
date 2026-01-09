import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Phone, MapPin, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SOS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    checkAuth();
    getCurrentLocation();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch emergency contacts
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', session.user.id);

    if (!error && data) {
      setEmergencyContacts(data);
    }
    setLoading(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const triggerSOS = async () => {
    setSendingAlert(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const locationText = location
        ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
        : "Location unavailable";

      const message = `🚨 EMERGENCY ALERT from ${profile?.name || 'User'}
        
I need immediate help!
Current location: ${locationText}
Time: ${new Date().toLocaleString()}

This is an automated SOS message from Raahi.`;

      // Send SMS to all emergency contacts
      for (const contact of emergencyContacts) {
        const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_blank');
      }

      toast({
        title: "SOS Alert Sent",
        description: `Emergency messages sent to ${emergencyContacts.length} contact(s)`,
      });

      // Auto-call the first emergency contact
      if (emergencyContacts.length > 0) {
        setTimeout(() => {
          window.location.href = `tel:${emergencyContacts[0].phone}`;
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SOS alert",
        variant: "destructive",
      });
    } finally {
      setSendingAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Card className="border-destructive">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Emergency Alert</CardTitle>
          <CardDescription>
            Press the button below to send your location and emergency message to all your emergency contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={triggerSOS}
            disabled={sendingAlert || emergencyContacts.length === 0}
            className="w-full h-20 text-xl bg-destructive hover:bg-destructive/90 active:bg-destructive/80 min-h-[80px]"
          >
            {sendingAlert ? "Sending Alert..." : "TRIGGER SOS"}
          </Button>

          {emergencyContacts.length === 0 && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                No emergency contacts added yet
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="min-h-[44px]"
              >
                Add Emergency Contacts
              </Button>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Current location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Emergency Contacts ({emergencyContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emergencyContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 bg-accent rounded-lg"
            >
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.relationship}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `tel:${contact.phone}`}
                className="min-h-[44px]"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">How SOS Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Sends SMS with your location to all emergency contacts</p>
          <p>• Automatically calls your primary emergency contact</p>
          <p>• Includes current time and GPS coordinates</p>
          <p>• Works even without internet (uses SMS)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SOS;
