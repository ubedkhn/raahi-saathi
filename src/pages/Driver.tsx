import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car, Send, Bell, Shield, ChevronRight, MapPin, IndianRupee, Trophy,
  MessageSquare, Pencil, Ban, Zap, Clock
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMyRides } from "@/hooks/useRides";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface RideWithBooking {
  id: string;
  origin_address: string;
  destination_address: string;
  status: string;
  start_time: string;
  price_per_km: number;
  total_distance_km: number | null;
  boosted?: boolean;
}

const Driver = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth({ requireAuth: true });
  const { data: profile } = useProfile();
  const { data: myRides } = useMyRides();
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [boostedRideIds, setBoostedRideIds] = useState<Set<string>>(new Set());

  const upcomingRides: RideWithBooking[] = (myRides || [])
    .filter((r: any) => r.status === 'scheduled' || r.status === 'active')
    .map((r: any) => ({ ...r, boosted: boostedRideIds.has(r.id) }));

  const kycVerified = profile?.kyc_status === 'verified';
  const earnedBoostBadge = completedCount >= 3;

  useEffect(() => {
    if (!user) return;

    // Open requests count
    supabase.from('ride_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenRequestCount(count || 0));

    // Driver notifications
    supabase.from('notifications').select('*').eq('user_id', user.id)
      .in('type', ['ride_booked', 'booking_accepted', 'ride_cancelled', 'ride_completed'])
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecentNotifications(data || []));

    // Driver earnings (sum of credit wallet transactions)
    supabase.from('wallet_transactions')
      .select('amount, status, type').eq('user_id', user.id).eq('type', 'credit').eq('status', 'completed')
      .then(({ data }) => {
        const sum = (data || []).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
        setTotalEarnings(Math.round(sum));
      });

    // Completed rides count for boost badge
    supabase.from('rides').select('id', { count: 'exact', head: true })
      .eq('driver_id', user.id).eq('status', 'completed')
      .then(({ count }) => setCompletedCount(count || 0));

    const channel = supabase
      .channel('driver-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setRecentNotifications(prev => [payload.new as any, ...prev].slice(0, 5))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests' },
        () => setOpenRequestCount(prev => prev + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleBoost = (rideId: string) => {
    setBoostedRideIds(prev => new Set(prev).add(rideId));
    toast({ title: "Ride Boosted! 🚀", description: "Your ride is now featured for the next 30 minutes." });
  };

  const handleCancelRide = async (rideId: string) => {
    if (!confirm("Cancel this ride? This cannot be undone.")) return;
    const { error } = await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ride Cancelled", description: "Riders have been notified." });
    }
  };

  const getStatusPill = (status: string, boosted?: boolean) => {
    if (boosted) return <Badge className="bg-secondary text-secondary-foreground gap-0.5"><Zap className="h-3 w-3" />Boosted</Badge>;
    if (status === 'active') return <Badge className="bg-success text-success-foreground">Confirmed</Badge>;
    if (status === 'scheduled') return <Badge variant="secondary">Pending</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
      <div className="mb-2">
        <h2 className="text-xl font-bold">Driver Hub</h2>
        <p className="text-sm text-muted-foreground">Manage your rides and earnings</p>
      </div>

      {/* Earnings preview */}
      <Card className="bg-gradient-to-br from-success/10 to-primary/10 border-success/20">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earnings</p>
              <p className="text-3xl font-bold flex items-center gap-1">
                <IndianRupee className="h-6 w-6" />{totalEarnings}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{completedCount} completed ride{completedCount !== 1 ? 's' : ''}</p>
            </div>
            {earnedBoostBadge && (
              <div className="text-center">
                <div className="p-2 bg-secondary/20 rounded-full inline-block">
                  <Trophy className="h-7 w-7 text-secondary-foreground" />
                </div>
                <p className="text-[10px] font-bold mt-1">Earnings Boost</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="p-3 bg-secondary/15 rounded-full">
              <Car className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Post a Ride</h3>
              <p className="text-sm text-muted-foreground">Share your journey & earn</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Incoming Requests */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/driver-requests')}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Incoming Requests</h3>
              <p className="text-sm text-muted-foreground">Accept open ride requests</p>
            </div>
            {openRequestCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">{openRequestCount}</Badge>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Rides Dashboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduled Rides</CardTitle>
          <CardDescription>Upcoming & active rides you're driving</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingRides.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No scheduled rides. Post one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingRides.slice(0, 5).map((ride) => {
                const potentialFare = Math.round((ride.total_distance_km || 0) * Number(ride.price_per_km || 0));
                return (
                  <div key={ride.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          {ride.origin_address}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">→ {ride.destination_address}</div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ride.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          {potentialFare > 0 && (
                            <span className="flex items-center gap-0.5 font-medium text-success">
                              <IndianRupee className="h-3 w-3" />{potentialFare}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusPill(ride.status, ride.boosted)}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <Button size="sm" variant="outline" onClick={() => navigate('/chats')} className="text-xs h-8">
                        <MessageSquare className="h-3 w-3 mr-1" />Chat
                      </Button>
                      {ride.boosted ? (
                        <Button size="sm" variant="outline" disabled className="text-xs h-8">
                          <Zap className="h-3 w-3 mr-1" />Boosted
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleBoost(ride.id)} className="text-xs h-8 border-secondary/40 text-secondary-foreground">
                          <Zap className="h-3 w-3 mr-1" />Boost
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleCancelRide(ride.id)} className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Ban className="h-3 w-3 mr-1" />Cancel
                      </Button>
                    </div>
                  </div>
                );
              })}
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
