import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Car, Send, Bell, Shield, ShieldCheck, ChevronRight, MapPin } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMyRides } from "@/hooks/useRides";
import { useAuth } from "@/hooks/useAuth";

const Driver = () => {
  const navigate = useNavigate();
  const { user } = useAuth({ requireAuth: true });
  const { data: profile } = useProfile();
  const { data: myRides } = useMyRides();
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const activeRides = myRides?.filter(r => r.status === 'scheduled' || r.status === 'active') || [];
  const kycVerified = profile?.kyc_status === 'verified';

  useEffect(() => {
    if (!user) return;

    // Fetch open ride request count
    supabase.from('ride_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenRequestCount(count || 0));

    // Fetch recent driver notifications
    supabase.from('notifications').select('*').eq('user_id', user.id)
      .in('type', ['ride_booked', 'booking_accepted', 'ride_cancelled', 'ride_completed'])
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecentNotifications(data || []));

    // Realtime subscription for driver notifications
    const channel = supabase
      .channel('driver-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRecentNotifications(prev => [payload.new as any, ...prev].slice(0, 5));
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests' },
        () => setOpenRequestCount(prev => prev + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Driver Hub</h2>
        <p className="text-sm text-muted-foreground">Manage your rides and requests</p>
      </div>

      {/* KYC Banner */}
      {!kycVerified && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium">KYC {profile?.kyc_status === 'pending' ? 'Pending' : 'Required'}</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.kyc_status === 'pending' ? 'Your verification is in progress' : 'Complete KYC to start offering rides'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')}>
                {profile?.kyc_status === 'pending' ? 'View' : 'Start'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post a Ride */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/post-ride')}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <Car className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Post a Ride</h3>
              <p className="text-sm text-muted-foreground">Share your journey & earn</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Rider Requests */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/driver-requests')}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Rider Requests</h3>
              <p className="text-sm text-muted-foreground">Accept open ride requests</p>
            </div>
            {openRequestCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">{openRequestCount}</Badge>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Active Rides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Rides</CardTitle>
          <CardDescription>Your scheduled & in-progress rides</CardDescription>
        </CardHeader>
        <CardContent>
          {activeRides.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No active rides. Post one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRides.slice(0, 5).map((ride) => (
                <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                      {ride.origin_address}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">→ {ride.destination_address}</div>
                  </div>
                  <Badge variant={ride.status === 'active' ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                    {ride.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recent notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Bell className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                  </div>
                  {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Driver;
