import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import AdminLayout from "@/components/admin/AdminLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import KYCVerification from "./pages/admin/KYCVerification";
import SupportPanel from "./pages/admin/SupportPanel";
import SearchRides from "./pages/SearchRides";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SOS from "./pages/SOS";
import RecentRides from "./pages/RecentRides";
import PostRide from "./pages/PostRide";
import RequestRide from "./pages/RequestRide";
import ManageRide from "./pages/ManageRide";
import Chats from "./pages/Chats";
import Support from "./pages/Support";
import Wallet from "./pages/Wallet";
import Driver from "./pages/Driver";
import Passbook from "./pages/Passbook";
import EmergencyContacts from "./pages/EmergencyContacts";
import DriverRequests from "./pages/DriverRequests";
import Notifications from "./pages/Notifications";
import Terms from "./pages/Terms";

// Auth-aware root route component
const RootRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - NO layout */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Admin routes - WITH admin layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="kyc" element={<KYCVerification />} />
              <Route path="support" element={<SupportPanel />} />
            </Route>
            
            {/* Protected routes - WITH layout */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/search-rides" element={<SearchRides />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/sos" element={<SOS />} />
              <Route path="/recent-rides" element={<RecentRides />} />
              <Route path="/post-ride" element={<PostRide />} />
              <Route path="/request-ride" element={<RequestRide />} />
              <Route path="/manage-ride/:bookingId" element={<ManageRide />} />
              <Route path="/chats" element={<Chats />} />
              <Route path="/support" element={<Support />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/passbook" element={<Passbook />} />
              <Route path="/emergency-contacts" element={<EmergencyContacts />} />
              <Route path="/driver-requests" element={<DriverRequests />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;