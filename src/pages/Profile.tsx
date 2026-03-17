import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyVehicles, useAddVehicle, useDeleteVehicle } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import {
  User, LogOut, Edit, Shield, Star, Car, Bike, Plus, Save,
  CheckCircle, Trash2, ChevronRight, HelpCircle, MessageSquare,
  FileText, Bell, ShieldCheck
  Settings2
} from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut, loading: authLoading } = useAuth({ requireAuth: true });
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: vehicles = [] } = useMyVehicles();
  const addVehicle = useAddVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    type: '4wheeler' as '2wheeler' | '4wheeler',
    brand: '', model: '', registration_no: '',
  });

  // Preferences state
  const [womenOnly, setWomenOnly] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Rating state
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadPreferences();
      loadRatingAndTrips();
    }
  }, [user]);

  const loadPreferences = async () => {
    const { data } = await supabase
      .from('preferences')
      .select('women_only_mode')
      .eq('user_id', user!.id)
      .maybeSingle();
    if (data) setWomenOnly(data.women_only_mode ?? false);
    setPrefsLoaded(true);
  };

  const toggleWomenOnly = async (checked: boolean) => {
    setWomenOnly(checked);
    const { error } = await supabase
      .from('preferences')
      .upsert({ user_id: user!.id, women_only_mode: checked }, { onConflict: 'user_id' });
    if (error) {
      setWomenOnly(!checked);
      toast({ title: "Error", description: "Failed to update preference", variant: "destructive" });
    }
  };

  const loadRatingAndTrips = async () => {
    const [ratingsRes, ridesRes, bookingsRes] = await Promise.all([
      supabase.from('ratings').select('rating').eq('reviewee_id', user!.id),
      supabase.from('rides').select('id', { count: 'exact', head: true }).eq('driver_id', user!.id).eq('status', 'completed'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('rider_id', user!.id).eq('status', 'completed'),
    ]);
    if (ratingsRes.data && ratingsRes.data.length > 0) {
      const avg = ratingsRes.data.reduce((s, r) => s + r.rating, 0) / ratingsRes.data.length;
      setAvgRating(Math.round(avg * 10) / 10);
    }
    setTripCount((ridesRes.count || 0) + (bookingsRes.count || 0));
  };

  const handleAddVehicle = async () => {
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.registration_no) {
      toast({ title: "Missing Information", description: "Please fill in all vehicle details", variant: "destructive" });
      return;
    }
    addVehicle.mutate(vehicleForm, {
      onSuccess: () => {
        setVehicleForm({ type: '4wheeler', brand: '', model: '', registration_no: '' });
        setVehicleDialogOpen(false);
      },
    });
  };

  if (authLoading || (profileLoading && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  const isVerified = profile?.kyc_status === 'verified';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
            {profile?.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{profile?.name}</h1>
            {isVerified && (
              <ShieldCheck className="h-5 w-5 text-success flex-shrink-0" />
            )}
            <Button variant="ghost" size="icon" className="ml-auto flex-shrink-0" onClick={() => navigate('/profile/edit')}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {avgRating !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-secondary text-secondary" />
                {avgRating}
              </span>
            )}
            <span>{tripCount} trips</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{profile?.phone}</p>
        </div>
      </div>

      <Separator />

      {/* Preferences */}
      <div className="space-y-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">Preferences</h2>
        <div className="flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Women-Only Mode</p>
              <p className="text-xs text-muted-foreground">Ride only with other women</p>
            </div>
          </div>
          <Switch checked={womenOnly} onCheckedChange={toggleWomenOnly} disabled={!prefsLoaded} />
        </div>
        <Separator />
        <div className="flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">Ride updates & reminders</p>
            </div>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>

      <Separator />

      {/* Wallet */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">Wallet</h2>
        <button onClick={() => navigate('/wallet')} className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
            </div>
            <div>
              <p className="text-sm font-medium">My Wallet</p>
              <p className="text-xs text-muted-foreground">Balance, transactions & payouts</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <Separator />

      {/* My Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Vehicles</h2>
          <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
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
                    onValueChange={(v: '2wheeler' | '4wheeler') => setVehicleForm({ ...vehicleForm, type: v })}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="2wheeler" id="2w" className="peer sr-only" />
                      <Label htmlFor="2w" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer min-h-[80px]">
                        <Bike className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Bike</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="4wheeler" id="4w" className="peer sr-only" />
                      <Label htmlFor="4w" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer min-h-[80px]">
                        <Car className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Car</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" placeholder="e.g., Honda, Maruti" value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} className="min-h-[44px]" />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" placeholder="e.g., Activa 6G, Swift" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} className="min-h-[44px]" />
                </div>
                <div>
                  <Label htmlFor="reg">License Plate</Label>
                  <Input id="reg" placeholder="e.g., MH-12-AB-1234" value={vehicleForm.registration_no} onChange={(e) => setVehicleForm({ ...vehicleForm, registration_no: e.target.value.toUpperCase() })} className="min-h-[44px] uppercase" />
                </div>
                <div className="text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
                  <strong>Seats:</strong> {vehicleForm.type === '2wheeler' ? '1 (auto-assigned for bikes)' : '3 (default for cars)'}
                </div>
                <Button onClick={handleAddVehicle} className="w-full min-h-[44px]" disabled={addVehicle.isPending}>
                  {addVehicle.isPending ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Vehicle</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No vehicles added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="p-2 bg-primary/10 rounded-full">
                  {v.type === '2wheeler' ? <Bike className="h-5 w-5 text-primary" /> : <Car className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.brand} {v.model}</p>
                  <p className="text-xs text-muted-foreground">{v.registration_no}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{v.type === '2wheeler' ? '2W' : '4W'}</Badge>
                  {v.verified && <CheckCircle className="h-4 w-4 text-success" />}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove {v.brand} {v.model} from your vehicles.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteVehicle.mutate(v.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Help & Support */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">Help & Support</h2>
        <div className="space-y-1">
          <button onClick={() => navigate('/settings')} className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/support')} className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Contact Support</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/settings')} className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Terms & Privacy</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <Separator />

      {/* Logout */}
      <Button variant="outline" onClick={signOut} className="w-full min-h-[48px] text-destructive border-destructive/30 hover:bg-destructive/10">
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
};

export default Profile;
