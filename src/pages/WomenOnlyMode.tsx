import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ShieldCheck, Star, CheckCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const WomenOnlyMode = () => {
  const { user } = useAuth({ requireAuth: true });
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadPreference();
      loadWomenDrivers();
    }
  }, [user]);

  const loadPreference = async () => {
    const { data } = await supabase
      .from("preferences")
      .select("women_only_mode")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setEnabled(data.women_only_mode ?? false);
    setLoading(false);
  };

  const toggleMode = async (checked: boolean) => {
    setEnabled(checked);
    const { error } = await supabase
      .from("preferences")
      .upsert({ user_id: user!.id, women_only_mode: checked }, { onConflict: "user_id" });
    if (error) {
      setEnabled(!checked);
      toast.error("Failed to update preference");
    } else {
      toast.success(checked ? "Women-Only Mode activated" : "Women-Only Mode deactivated");
    }
  };

  const loadWomenDrivers = async () => {
    const { data } = await supabase
      .from("rides")
      .select(`
        id, origin_address, destination_address, start_time, price_per_km, seats_available,
        profiles!rides_driver_id_fkey(name, avatar_url, gender, kyc_status)
      `)
      .eq("status", "scheduled")
      .gte("start_time", new Date().toISOString())
      .limit(10);

    const womenRides = (data || []).filter(
      (r: any) => r.profiles?.gender === "female"
    );
    setDrivers(womenRides);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Women-Only Mode</h1>
        <p className="text-sm text-muted-foreground">Only match with verified women riders/drivers</p>
      </div>

      {/* Toggle Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Women-Only Mode</p>
                <p className="text-xs text-muted-foreground">
                  {enabled ? "Active — Only women matches" : "Tap to enable"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={toggleMode} disabled={loading} />
          </div>
          {enabled && (
            <div className="mt-4 p-3 bg-success/10 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">Women-Only Mode is Active</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Women Drivers Available */}
      {enabled && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Available Women Drivers</h2>
          {drivers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No women drivers available right now</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {drivers.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={d.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {d.profiles?.name?.charAt(0) || "W"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{d.profiles?.name}</span>
                          {d.profiles?.kyc_status === "verified" && (
                            <Badge className="bg-success/10 text-success text-[10px]">Verified</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.origin_address.split(",")[0]} → {d.destination_address.split(",")[0]}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">₹{d.price_per_km}/km</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WomenOnlyMode;
