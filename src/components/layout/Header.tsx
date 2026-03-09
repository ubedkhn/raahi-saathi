import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Bell } from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useNotifications } from "@/hooks/useNotifications";

interface RouteConfig {
  title: string;
  showBackButton: boolean;
  showAvatar?: boolean;
}

const routeConfigs: Record<string, RouteConfig> = {
  "/dashboard": { title: "Raahi", showBackButton: false, showAvatar: true },
  "/search-rides": { title: "Find a Ride", showBackButton: true },
  "/post-ride": { title: "Post a Ride", showBackButton: true },
  "/recent-rides": { title: "My Rides", showBackButton: false },
  "/profile": { title: "Profile", showBackButton: false },
  "/profile/edit": { title: "Edit Profile", showBackButton: true },
  "/sos": { title: "Emergency SOS", showBackButton: false },
  "/settings": { title: "Settings", showBackButton: true },
  "/chats": { title: "Chats", showBackButton: false },
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isAdmin } = useAdminStatus();
  const { unreadCount } = useNotifications();

  const currentRoute = location.pathname;
  const config = routeConfigs[currentRoute] || { title: "Raahi", showBackButton: true };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Left - Back Button or Spacer */}
        <div className="w-10">
          {config.showBackButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="min-h-[44px] min-w-[44px] active:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Center - Title */}
        <h1 
          className={`text-xl font-bold ${
            currentRoute === "/sos" ? "text-destructive" : "text-primary"
          }`}
        >
          {config.title}
        </h1>

        {/* Right - Admin Badge */}
        <div className="flex items-center gap-2">
          {isAdmin && config.showAvatar && (
            <Badge 
              variant="default" 
              className="bg-primary text-primary-foreground text-xs px-2 py-0.5 cursor-pointer"
              onClick={() => navigate('/admin')}
            >
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
