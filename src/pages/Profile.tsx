import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyRides, useMyBookings, useMyPayments } from "@/hooks/useRides";
import { useMyVehicles, useAddVehicle, useDeleteVehicle } from "@/hooks/useVehicles";
import { 
  User, Settings, LogOut, Trash2, Edit, Save, X, Shield, Phone, 
  Mail, Calendar, MapPin, Wallet, Star, Car, FileText, CheckCircle,
  Plus, Bike, HelpCircle
} from "lucide-react";

// Helper to display KYC status properly
const getKycStatusDisplay = (status: string | null | undefined) => {
  switch (status) {
    case 'verified':
      return { label: 'Verified', variant: 'default' as const };
    case 'pending':
      return { label: 'Verification Pending', variant: 'secondary' as const };
    case 'rejected':
      return { label: 'Rejected', variant: 'destructive' as const };
    default:
      return { label: 'Complete KYC', variant: 'outline' as const };
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth({ requireAuth: true });
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: isAdmin } = useAdminStatus();
  const { data: rides = [] } = useMyRides();
  const { data: bookings = [] } = useMyBookings();
  const { data: payments = [] } = useMyPayments();
  const { data: vehicles = [] } = useMyVehicles();
  
  const addVehicle = useAddVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    type: '4wheeler' as '2wheeler' | '4wheeler',
    brand: '',
    model: '',
    registration_no: '',
  });

  const handleLogout = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    toast({
      title: "Contact support",
      description: "Please contact support to delete your account.",
    });
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.registration_no) {
      toast({
        title: "Missing Information",
        description: "Please fill in all vehicle details",
        variant: "destructive",
      });
      return;
    }

    addVehicle.mutate(vehicleForm, {
      onSuccess: () => {
        setVehicleForm({ type: '4wheeler', brand: '', model: '', registration_no: '' });
        setVehicleDialogOpen(false);
      },
    });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    deleteVehicle.mutate(vehicleId);
  };

  // Show loading only if we have no cached profile data
  if (authLoading || (profileLoading && !profile)) {
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

  const kycStatus = getKycStatusDisplay(profile?.kyc_status);

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
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{profile?.name}</h2>
                  {isAdmin && (
                    <Badge variant="destructive" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      ADMIN
                    </Badge>
                  )}
                  <Badge variant={kycStatus.variant}>
                    <Shield className="w-3 h-3 mr-1" />
                    {kycStatus.label}
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover-scale">
            <CardContent className="pt-4 pb-3 text-center">
              <Car className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{completedRides}</div>
              <div className="text-xs text-muted-foreground">Rides Given</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-4 pb-3 text-center">
              <MapPin className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold">{completedBookings}</div>
              <div className="text-xs text-muted-foreground">Rides Taken</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-4 pb-3 text-center">
              <Wallet className="h-6 w-6 mx-auto mb-1 text-success" />
              <div className="text-xl font-bold">₹{totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </CardContent>
          </Card>
          
          <Card className="hover-scale">
            <CardContent className="pt-4 pb-3 text-center">
              <Wallet className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">₹{totalSpent}</div>
              <div className="text-xs text-muted-foreground">Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* My Vehicles Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                My Vehicles
              </CardTitle>
              <CardDescription>Manage your vehicles for posting rides</CardDescription>
            </div>
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label className="text-base mb-3 block">Vehicle Type</Label>
                    <RadioGroup
                      value={vehicleForm.type}
                      onValueChange={(value: '2wheeler' | '4wheeler') => setVehicleForm({ ...vehicleForm, type: value })}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="2wheeler" id="2wheeler" className="peer sr-only" />
                        <Label
                          htmlFor="2wheeler"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer min-h-[80px]"
                        >
                          <Bike className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Bike</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="4wheeler" id="4wheeler" className="peer sr-only" />
                        <Label
                          htmlFor="4wheeler"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer min-h-[80px]"
                        >
                          <Car className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Car</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="e.g., Honda, Maruti"
                      value={vehicleForm.brand}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="e.g., Activa 6G, Swift"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="registration_no">License Plate</Label>
                    <Input
                      id="registration_no"
                      placeholder="e.g., MH-12-AB-1234"
                      value={vehicleForm.registration_no}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, registration_no: e.target.value.toUpperCase() })}
                      className="min-h-[44px] uppercase"
                    />
                  </div>

                  <div className="text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
                    <strong>Seats:</strong> {vehicleForm.type === '2wheeler' ? '1 (auto-assigned for bikes)' : '3 (default for cars)'}
                  </div>

                  <Button 
                    onClick={handleAddVehicle} 
                    className="w-full min-h-[44px]"
                    disabled={addVehicle.isPending}
                  >
                    {addVehicle.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Vehicle
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No vehicles added yet</p>
                <p className="text-sm mt-1">Add a vehicle to start posting rides</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {vehicle.type === '2wheeler' ? (
                          <Bike className="h-6 w-6 text-primary" />
                        ) : (
                          <Car className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{vehicle.brand} {vehicle.model}</div>
                        <div className="text-sm text-muted-foreground">{vehicle.registration_no}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={vehicle.verified ? 'default' : 'secondary'}>
                        {vehicle.verified ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Verified</>
                        ) : (
                          'Pending'
                        )}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {vehicle.brand} {vehicle.model} from your vehicles.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate("/support")} variant="outline" className="w-full justify-start hover-scale">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & Support
            </Button>
            <Button onClick={() => navigate("/settings")} variant="outline" className="w-full justify-start hover-scale">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full justify-start hover-scale">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            
            <Separator className="my-3" />
            
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
          </CardContent>
        </Card>
    </div>
  );
};

export default Profile;
