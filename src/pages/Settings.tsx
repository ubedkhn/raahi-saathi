import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User, ChevronRight, Sun, Moon, Monitor, Bell, Shield, AlertTriangle,
  Info, FileText, Lock, LogOut, Palette,
} from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const themeOptions = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "Auto" },
  ] as const;

  const MenuItem = ({ icon: Icon, label, sublabel, onClick, destructive }: {
    icon: React.ElementType; label: string; sublabel?: string; onClick?: () => void; destructive?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Account Section */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Account</h3>
        <Card>
          <CardContent className="p-0">
            <MenuItem icon={User} label={profile?.name || "Your Name"} sublabel={profile?.phone || "Add phone number"} onClick={() => navigate("/profile/edit")} />
          </CardContent>
        </Card>
      </div>

      {/* Appearance */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Appearance</h3>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Theme</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, icon: ThemeIcon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors ${
                    theme === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <ThemeIcon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Preferences</h3>
        <Card>
          <CardContent className="p-0">
            <MenuItem icon={Bell} label="Notifications" sublabel="Manage push notifications" onClick={() => navigate("/notifications")} />
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Security</h3>
        <Card>
          <CardContent className="p-0">
            <MenuItem icon={Lock} label="Change Password" sublabel="Update your password" onClick={() => {
              toast.info("Use the forgot password flow from the login screen to reset your password.");
            }} />
            <Separator />
            <MenuItem icon={AlertTriangle} label="Emergency Contacts" sublabel="Manage SOS contacts" onClick={() => navigate("/emergency-contacts")} />
            <Separator />
            <MenuItem icon={Shield} label="KYC Verification" sublabel={profile?.kyc_status || "Not verified"} onClick={() => navigate("/profile/edit")} />
          </CardContent>
        </Card>
      </div>

      {/* App Info */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">App Info</h3>
        <Card>
          <CardContent className="p-0">
            <MenuItem icon={Info} label="About Raahi" sublabel="Version 1.0.0" onClick={() => toast.info("Raahi v1.0.0 — India's peer-to-peer ride sharing")} />
            <Separator />
            <MenuItem icon={FileText} label="Terms & Privacy" onClick={() => navigate("/terms")} />
          </CardContent>
        </Card>
      </div>

      {/* Sign Out */}
      <Card>
        <CardContent className="p-0">
          <MenuItem icon={LogOut} label="Sign Out" destructive onClick={handleSignOut} />
        </CardContent>
      </Card>

      <div className="h-8" />
    </div>
  );
};

export default Settings;
