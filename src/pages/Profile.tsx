import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { 
  User, Settings, Moon, Sun, Monitor, 
  LogOut, Trash2, Edit, Save, X, Shield, Phone, 
  Mail, Calendar, MapPin, Wallet, Star, Car, FileText, CheckCircle
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [rides, setRides] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile(profileData);
        setEditData({
          name: profileData.name || "",
          phone: profileData.phone || "",
          permanent_address: profileData.permanent_address || "",
          aadhaar_number: profileData.aadhaar_number || "",
          driving_license_number: profileData.driving_license_number || "",
        });
      }

      // Load rides (as driver)
      const { data: ridesData } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', session.user.id)
        .order('created_at', { ascending: false });
      setRides(ridesData || []);

      // Load bookings (as rider)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, rides(*)')
        .eq('rider_id', session.user.id)
        .order('created_at', { ascending: false });
      setBookings(bookingsData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .or(`rider_id.eq.${session.user.id},driver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      setPayments(paymentsData || []);

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editData.name,
          phone: editData.phone,
          permanent_address: editData.permanent_address,
          aadhaar_number: editData.aadhaar_number,
          driving_license_number: editData.driving_license_number,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...editData });
      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    try {
      // This would need backend implementation
      toast({
        title: "Contact support",
        description: "Please contact support to delete your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const completedRides = rides.filter(r => r.status === 'completed').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const totalEarnings = payments.filter(p => p.driver_id === user?.id && p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalSpent = payments.filter(p => p.rider_id === user?.id && p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Profile Header Card */}
        <Card className="hover-scale">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Permanent Address</Label>
                      <Textarea
                        id="address"
                        value={editData.permanent_address}
                        onChange={(e) => setEditData({ ...editData, permanent_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        KYC Documents
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="aadhaar">Aadhaar Number</Label>
                          <Input
                            id="aadhaar"
                            value={editData.aadhaar_number}
                            onChange={(e) => setEditData({ ...editData, aadhaar_number: e.target.value })}
                            placeholder="XXXX-XXXX-XXXX"
                            maxLength={12}
                          />
                          {profile?.aadhaar_verified && <span className="text-xs text-success flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3" /> Verified</span>}
                        </div>
                        <div>
                          <Label htmlFor="license">Driving License Number</Label>
                          <Input
                            id="license"
                            value={editData.driving_license_number}
                            onChange={(e) => setEditData({ ...editData, driving_license_number: e.target.value })}
                            placeholder="DL-XXXXXXXXXX"
                          />
                          {profile?.driving_license_verified && <span className="text-xs text-success flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3" /> Verified</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button onClick={() => { 
                        setEditing(false); 
                        setEditData({ 
                          name: profile?.name || "", 
                          phone: profile?.phone || "", 
                          permanent_address: profile?.permanent_address || "", 
                          aadhaar_number: profile?.aadhaar_number || "", 
                          driving_license_number: profile?.driving_license_number || "" 
                        }); 
                      }} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">{profile?.name}</h2>
                      <Badge variant={profile?.kyc_status === 'verified' ? 'default' : 'secondary'}>
                        <Shield className="w-3 h-3 mr-1" />
                        {profile?.kyc_status}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{profile?.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user?.email}</span>
                      </div>
                      {profile?.permanent_address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{profile.permanent_address}</span>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => navigate('/profile/edit')} variant="outline" size="sm" className="mt-3">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover-scale">
            <CardContent className="pt-6 text-center">
              <Car className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{completedRides}</div>
              <div className="text-xs text-muted-foreground">Rides Given</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{completedBookings}</div>
              <div className="text-xs text-muted-foreground">Rides Taken</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-6 text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold">₹{totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-6 text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">₹{totalSpent}</div>
              <div className="text-xs text-muted-foreground">Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Rides, Bookings, Payments */}
        <Tabs defaultValue="driver" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="driver">As Driver</TabsTrigger>
            <TabsTrigger value="rider">As Rider</TabsTrigger>
          </TabsList>

          <TabsContent value="driver" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Rides</CardTitle>
                <CardDescription>Rides you've offered</CardDescription>
              </CardHeader>
              <CardContent>
                {rides.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No rides offered yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rides.slice(0, 5).map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg transition-all hover:shadow-md">
                        <div className="flex-1">
                          <div className="font-medium">{ride.origin_address}</div>
                          <div className="text-sm text-muted-foreground">→ {ride.destination_address}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(ride.start_time).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={ride.status === 'completed' ? 'default' : 'secondary'}>
                          {ride.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings</CardTitle>
                <CardDescription>Your payment history as driver</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.filter(p => p.driver_id === user?.id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No earnings yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.filter(p => p.driver_id === user?.id).slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg transition-all hover:shadow-md">
                        <div className="flex-1">
                          <div className="font-medium">₹{payment.amount}</div>
                          <div className="text-sm text-muted-foreground">{payment.method}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rider" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Bookings</CardTitle>
                <CardDescription>Rides you've taken</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg transition-all hover:shadow-md">
                        <div className="flex-1">
                          <div className="font-medium">{booking.pickup_address}</div>
                          <div className="text-sm text-muted-foreground">→ {booking.drop_address}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ₹{booking.fare_amount} • {new Date(booking.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
                <CardDescription>Your payment history as rider</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.filter(p => p.rider_id === user?.id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.filter(p => p.rider_id === user?.id).slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg transition-all hover:shadow-md">
                        <div className="flex-1">
                          <div className="font-medium">₹{payment.amount}</div>
                          <div className="text-sm text-muted-foreground">{payment.method}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setTheme('light')}
                  className="flex-col h-auto py-3"
                >
                  <Sun className="h-5 w-5 mb-1" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setTheme('dark')}
                  className="flex-col h-auto py-3"
                >
                  <Moon className="h-5 w-5 mb-1" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setTheme('system')}
                  className="flex-col h-auto py-3"
                >
                  <Monitor className="h-5 w-5 mb-1" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button onClick={() => navigate("/settings")} variant="outline" className="w-full justify-start hover-scale">
                <Settings className="h-4 w-4 mr-2" />
                More Settings
              </Button>
              <Button onClick={handleLogout} variant="outline" className="w-full justify-start hover-scale">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default Profile;
