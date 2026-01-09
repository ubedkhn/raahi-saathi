import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  MessageSquare,
  Car,
  CreditCard,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  currentPath: string;
  onNavigate?: () => void;
}

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/admin/users", icon: Users, label: "User Management" },
  { path: "/admin/kyc", icon: Shield, label: "KYC Verification" },
  { path: "/admin/support", icon: MessageSquare, label: "Support Panel" },
  { path: "/admin/rides", icon: Car, label: "Rides" },
  { path: "/admin/payments", icon: CreditCard, label: "Payments" },
];

export const AdminSidebar = ({ currentPath, onNavigate }: AdminSidebarProps) => {
  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link to="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">R</span>
          </div>
          <span className="font-bold text-xl">Raahi Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Raahi Admin v1.0
        </p>
      </div>
    </div>
  );
};
