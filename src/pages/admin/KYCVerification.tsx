import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KYCCard } from "@/components/admin/KYCCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

const KYCVerification = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadKYCData();
  }, []);

  const loadKYCData = async () => {
    try {
      // Only fetch users who have actually submitted KYC documents
      // Pending = has submitted documents and waiting for review
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("kyc_status", ["pending", "verified", "rejected"])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Filter pending users - only show those who have actually submitted documents
      // (have aadhaar_number OR driving_license_number OR driving_license_photo_url)
      const pending = data?.filter(u => 
        u.kyc_status === 'pending' && 
        (u.aadhaar_number || u.driving_license_number || u.driving_license_photo_url)
      ) || [];
      
      setPendingUsers(pending);
      setVerifiedUsers(data?.filter(u => u.kyc_status === 'verified') || []);
      setRejectedUsers(data?.filter(u => u.kyc_status === 'rejected') || []);
    } catch (error: any) {
      console.error("Error loading KYC data:", error);
      toast.error("Failed to load KYC data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          kyc_status: "verified",
          driving_license_verified: true,
          aadhaar_verified: true
        })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "approve_kyc",
        details: { user_id: userId }
      });

      toast.success("KYC approved successfully");
      
      // Update local state immediately for instant UI feedback
      const approvedUser = pendingUsers.find(u => u.id === userId);
      if (approvedUser) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setVerifiedUsers(prev => [{ ...approvedUser, kyc_status: 'verified' }, ...prev]);
      }
    } catch (error: any) {
      toast.error("Failed to approve KYC");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId: string, reason: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          kyc_status: "rejected"
        })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action with rejection reason
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "reject_kyc",
        details: { user_id: userId, reason }
      });

      toast.success("KYC rejected");
      
      // Update local state immediately
      const rejectedUser = pendingUsers.find(u => u.id === userId);
      if (rejectedUser) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setRejectedUsers(prev => [{ ...rejectedUser, kyc_status: 'rejected' }, ...prev]);
      }
    } catch (error: any) {
      toast.error("Failed to reject KYC");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRejected = async (userId: string) => {
    setActionLoading(true);
    try {
      // Clear KYC documents and reset status to null (unsubmitted)
      const { error } = await supabase
        .from("profiles")
        .update({ 
          kyc_status: null,
          aadhaar_number: null,
          aadhaar_verified: false,
          driving_license_number: null,
          driving_license_photo_url: null,
          driving_license_verified: false,
          kyc_document_url: null
        })
        .eq("id", userId);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_activity_log").insert({
        admin_id: user?.id,
        action: "delete_rejected_kyc",
        details: { user_id: userId }
      });

      toast.success("Rejected KYC cleared");
      setRejectedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error: any) {
      toast.error("Failed to delete KYC");
    } finally {
      setActionLoading(false);
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
          <h1 className="text-2xl font-bold">KYC Verification</h1>
          <p className="text-muted-foreground">Review and verify user documents</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            {pendingUsers.length} Pending
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Verified ({verifiedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Applications</h3>
              <p className="text-muted-foreground">
                All KYC applications have been reviewed
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingUsers.map((user) => (
                <KYCCard
                  key={user.id}
                  user={user}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verified">
          {verifiedUsers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Verified Users</h3>
              <p className="text-muted-foreground">
                Verified users will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedUsers.map((user) => (
                <div key={user.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Aadhaar: {user.aadhaar_number || '-'}</p>
                    <p>License: {user.driving_license_number || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedUsers.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Rejected Applications</h3>
              <p className="text-muted-foreground">
                Rejected applications will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedUsers.map((user) => (
                <div key={user.id} className="p-4 border rounded-lg bg-card border-destructive/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={actionLoading}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rejected KYC?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will clear all KYC documents for {user.name}. 
                            They will need to resubmit their verification documents.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteRejected(user.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Aadhaar: {user.aadhaar_number || '-'}</p>
                    <p>License: {user.driving_license_number || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KYCVerification;
