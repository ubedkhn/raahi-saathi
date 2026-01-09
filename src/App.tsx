import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import Chats from "./pages/Chats";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - NO layout */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
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
              <Route path="/chats" element={<Chats />} />
              <Route path="/support" element={<Support />} />
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
