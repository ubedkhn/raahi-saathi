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
  "/driver": { title: "Driver", showBackButton: true },
  "/wallet": { title: "Wallet", showBackButton: true },
  "/passbook": { title: "Passbook", showBackButton: true },
  "/notifications": { title: "Notifications", showBackButton: true },
  "/emergency-contacts": { title: "Emergency Contacts", showBackButton: true },
  "/support": { title: "Support", showBackButton: true },
  "/driver-requests": { title: "Ride Requests", showBackButton: true },
  "/request-ride": { title: "Request a Ride", showBackButton: true },
  "/terms": { title: "Terms", showBackButton: true },
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isAdmin } = useAdminStatus();
  const { unreadCount } = useNotifications();

  const currentRoute = location.pathname;
  const config = routeConfigs[currentRoute] || { title: "Raahi", showBackButton: true };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center">
        {/* Left */}
        <div className="w-12 flex-shrink-0">
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
          className={`flex-1 text-center text-lg font-bold truncate ${
            currentRoute === "/sos" ? "text-destructive" : "text-primary"
          }`}
        >
          {config.title}
        </h1>

        {/* Right */}
        <div className="w-12 flex-shrink-0 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notifications")}
            className="relative min-h-[44px] min-w-[44px]"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {isAdmin && config.showAvatar && (
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground text-xs px-2 py-0.5 cursor-pointer"
              onClick={() => navigate("/admin")}
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
