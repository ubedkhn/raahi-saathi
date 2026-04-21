import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Car, CreditCard, MapPin, LogOut, Activity } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRides: 0,
    totalBookings: 0,
    totalPayments: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin/login");
        return;
      }

      // Server-side admin verification via SECURITY DEFINER RPC
      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (roleError) throw roleError;

      if (!isAdmin) {
        toast.error("Access Denied");
        navigate("/");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Error:", error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [profilesRes, ridesRes, bookingsRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact" }),
        supabase.from("rides").select("*, profiles!rides_driver_id_fkey(name)", { count: "exact" }),
        supabase.from("bookings").select("*, profiles!bookings_rider_id_fkey(name)", { count: "exact" }),
        supabase.from("payments").select("*, profiles!payments_rider_id_fkey(name)", { count: "exact" }),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        totalRides: ridesRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        totalPayments: paymentsRes.count || 0,
      });

      setUsers(profilesRes.data || []);
      setRides(ridesRes.data || []);
      setBookings(bookingsRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your Raahi platform</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRides}</div>
            </CardContent>
          </Card>
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Car className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rides">Rides</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">KYC Status</th>
                        <th className="text-left p-2">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2">{user.name}</td>
                          <td className="p-2">{user.phone}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.kyc_status === 'verified' ? 'bg-success/20 text-success' :
                              user.kyc_status === 'pending' ? 'bg-warning/20 text-warning' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {user.kyc_status}
                            </span>
                          </td>
                          <td className="p-2">{user.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Rides</CardTitle>
                <CardDescription>Monitor ride activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Driver</th>
                        <th className="text-left p-2">Origin</th>
                        <th className="text-left p-2">Destination</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Seats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rides.map((ride) => (
                        <tr key={ride.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2">{ride.profiles?.name}</td>
                          <td className="p-2">{ride.origin_address}</td>
                          <td className="p-2">{ride.destination_address}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              ride.status === 'completed' ? 'bg-success/20 text-success' :
                              ride.status === 'in_progress' ? 'bg-warning/20 text-warning' :
                              'bg-blue/20 text-blue'
                            }`}>
                              {ride.status}
                            </span>
                          </td>
                          <td className="p-2">{ride.seats_available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Track ride bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Rider</th>
                        <th className="text-left p-2">Pickup</th>
                        <th className="text-left p-2">Drop</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2">{booking.profiles?.name}</td>
                          <td className="p-2">{booking.pickup_address}</td>
                          <td className="p-2">{booking.drop_address}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              booking.status === 'completed' ? 'bg-success/20 text-success' :
                              booking.status === 'confirmed' ? 'bg-blue/20 text-blue' :
                              booking.status === 'cancelled' ? 'bg-destructive/20 text-destructive' :
                              'bg-warning/20 text-warning'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-2">₹{booking.fare_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>Financial transaction overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Rider</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Platform Fee</th>
                        <th className="text-left p-2">Method</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2">{payment.profiles?.name}</td>
                          <td className="p-2">₹{payment.amount}</td>
                          <td className="p-2">₹{payment.platform_fee}</td>
                          <td className="p-2">{payment.method}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === 'completed' ? 'bg-success/20 text-success' :
                              payment.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                              'bg-warning/20 text-warning'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
