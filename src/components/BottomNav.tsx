import { useNavigate, useLocation } from "react-router-dom";
import { Home, Clock, Car, User, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Clock, label: "My Rides", path: "/recent-rides" },
    { icon: Car, label: "Driver", path: "/driver" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex justify-around items-center h-16 max-w-lg mx-auto">
        {/* Left nav items (Home, My Rides) */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 min-h-[44px] transition-colors tap-highlight-none",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Center FAB (Floating Action Button) */}
        <button
          onClick={() => navigate("/post-ride")}
          className={cn(
            "absolute -top-6 left-1/2 transform -translate-x-1/2",
            "bg-secondary text-secondary-foreground",
            "p-4 rounded-full shadow-lg",
            "border-4 border-background",
            "min-h-[56px] min-w-[56px]",
            "flex items-center justify-center",
            "active:scale-95 transition-transform tap-highlight-none",
            location.pathname === "/post-ride" && "ring-2 ring-primary"
          )}
        >
          <PlusCircle className="h-6 w-6" />
        </button>

        {/* Spacer for FAB */}
        <div className="w-14" />

        {/* Right nav items (Chats, Profile) */}
        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 min-h-[44px] transition-colors tap-highlight-none",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
