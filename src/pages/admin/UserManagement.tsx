import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserDetailsModal } from "@/components/admin/UserDetailsModal";
import { 
  Search, MoreVertical, UserX, Eye, 
  Shield, Ban, Users, Filter 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter, kycFilter]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query) ||
          user.id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => (user.status || 'active') === statusFilter);
    }

    // KYC filter
    if (kycFilter !== "all") {
      filtered = filtered.filter((user) => user.kyc_status === kycFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleSuspend = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "suspend_user",
        details: { user_id: userId }
      });

      toast.success("User suspended successfully");
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to suspend user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "reactivate_user",
        details: { user_id: userId }
      });

      toast.success("User reactivated successfully");
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to reactivate user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminate = async (userId: string) => {
    if (!confirm("Are you sure you want to terminate this user? This action cannot be undone.")) {
      return;
    }

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "terminated" })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "terminate_user",
        details: { user_id: userId }
      });

      toast.success("User terminated successfully");
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to terminate user");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Suspended</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Terminated</Badge>;
      default:
        return <Badge variant="secondary">{status || 'active'}</Badge>;
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || 'none'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage and monitor all platform users</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="h-4 w-4 mr-2" />
          {users.length} Users
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{user.gender || '-'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                    <TableCell>{getKycBadge(user.kyc_status)}</TableCell>
                    <TableCell>
                      {user.created_at ? format(new Date(user.created_at), 'PP') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setModalOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {user.status !== 'suspended' && user.status !== 'terminated' && (
                            <DropdownMenuItem onClick={() => handleSuspend(user.id)}>
                              <UserX className="h-4 w-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          )}
                          {user.status === 'suspended' && (
                            <DropdownMenuItem onClick={() => handleReactivate(user.id)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Reactivate User
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'terminated' && (
                            <DropdownMenuItem 
                              onClick={() => handleTerminate(user.id)}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Terminate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserDetailsModal
        user={selectedUser}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default UserManagement;
