import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Car, CreditCard, Shield, AlertCircle, 
  MessageSquare, TrendingUp, UserCheck, UserX,
  CheckCircle
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDrivers: 0,
    activeRiders: 0,
    inactiveUsers: 0,
    rideCompletionRate: 0,
    suspendedUsers: 0,
    pendingKyc: 0,
    activeSupport: 0,
    totalRides: 0,
    totalPayments: 0,
  });
  const [signupData, setSignupData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, status, kyc_status, created_at");
      
      if (profilesError) throw profilesError;

      // Get rides stats
      const { data: rides, error: ridesError } = await supabase
        .from("rides")
        .select("id, status, driver_id");
      
      if (ridesError) throw ridesError;

      // Get active bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status, rider_id");
      
      if (bookingsError) throw bookingsError;

      // Get support tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("id, status");
      
      if (ticketsError) throw ticketsError;

      // Get payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, status");
      
      if (paymentsError) throw paymentsError;

      // Calculate stats
      const totalUsers = profiles?.length || 0;
      const suspendedUsers = profiles?.filter(p => p.status === 'suspended').length || 0;
      const pendingKyc = profiles?.filter(p => p.kyc_status === 'pending').length || 0;
      
      // Active drivers (have rides scheduled or active)
      const activeDriverIds = new Set(
        rides?.filter(r => r.status === 'scheduled' || r.status === 'active').map(r => r.driver_id) || []
      );
      
      // Active riders (have bookings accepted)
      const activeRiderIds = new Set(
        bookings?.filter(b => b.status === 'accepted').map(b => b.rider_id) || []
      );

      // Ride completion rate
      const completedRides = rides?.filter(r => r.status === 'completed').length || 0;
      const totalRides = rides?.length || 0;
      const rideCompletionRate = totalRides > 0 
        ? Math.round((completedRides / totalRides) * 100) 
        : 0;

      // Active support tickets
      const activeSupport = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;

      // Calculate signup data for last 30 days
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date()
      });

      const signupCounts = last30Days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const count = profiles?.filter(p => {
          const createdAt = new Date(p.created_at);
          return createdAt >= dayStart && createdAt < dayEnd;
        }).length || 0;

        return {
          date: format(day, 'MMM dd'),
          count
        };
      });

      setStats({
        totalUsers,
        activeDrivers: activeDriverIds.size,
        activeRiders: activeRiderIds.size,
        inactiveUsers: totalUsers - activeDriverIds.size - activeRiderIds.size,
        rideCompletionRate,
        suspendedUsers,
        pendingKyc,
        activeSupport,
        totalRides,
        totalPayments: payments?.filter(p => p.status === 'completed').length || 0,
      });

      setSignupData(signupCounts);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          variant="primary"
          onClick={() => navigate('/admin/users')}
        />
        <StatsCard
          title="Active Drivers"
          value={stats.activeDrivers}
          icon={Car}
          variant="success"
          description="Currently on a ride"
        />
        <StatsCard
          title="Active Riders"
          value={stats.activeRiders}
          icon={UserCheck}
          variant="success"
          description="Currently in a ride"
        />
        <StatsCard
          title="Inactive Users"
          value={stats.inactiveUsers}
          icon={UserX}
          variant="default"
          description="No recent activity"
        />
      </div>

      {/* Health & Action Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ride Completion"
          value={`${stats.rideCompletionRate}%`}
          icon={CheckCircle}
          variant="success"
          description={`${stats.totalRides} total rides`}
        />
        <StatsCard
          title="Suspended Users"
          value={stats.suspendedUsers}
          icon={UserX}
          variant={stats.suspendedUsers > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="Pending KYC"
          value={stats.pendingKyc}
          icon={Shield}
          variant={stats.pendingKyc > 0 ? "warning" : "default"}
          onClick={() => navigate('/admin/kyc')}
        />
        <StatsCard
          title="Active Support"
          value={stats.activeSupport}
          icon={MessageSquare}
          variant={stats.activeSupport > 0 ? "warning" : "default"}
          onClick={() => navigate('/admin/support')}
        />
      </div>

      {/* Signup Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Signups (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="New Users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/kyc')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">KYC Verification</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingKyc} applications waiting for review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/support')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Support Panel</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.activeSupport} active tickets need attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
