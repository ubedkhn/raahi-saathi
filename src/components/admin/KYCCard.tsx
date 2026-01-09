import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  User, Phone, FileText, CheckCircle, XCircle, 
  Calendar, Eye, ExternalLink 
} from "lucide-react";
import { format } from "date-fns";

interface KYCCardProps {
  user: any;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
  loading?: boolean;
}

export const KYCCard = ({ user, onApprove, onReject, loading }: KYCCardProps) => {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(user.id, rejectReason);
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{user.name || 'Unknown'}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Phone className="h-3 w-3" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Applied: {user.updated_at ? format(new Date(user.updated_at), 'PP') : 'Unknown'}</span>
              </div>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Aadhaar Details */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Aadhaar Number</span>
            </div>
            <p className="text-lg font-mono">{user.aadhaar_number || 'Not provided'}</p>
          </div>

          {/* Driving License Details */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Driving License</span>
            </div>
            <p className="text-lg font-mono mb-2">{user.driving_license_number || 'Not provided'}</p>
            
            {user.driving_license_photo_url && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">License Photo</p>
                <div className="relative group">
                  <img 
                    src={user.driving_license_photo_url} 
                    alt="Driving License" 
                    className="w-full max-h-48 object-cover rounded-lg border cursor-pointer"
                    onClick={() => setPreviewImage(user.driving_license_photo_url)}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setPreviewImage(user.driving_license_photo_url)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="gap-2 pt-4 border-t">
          <Button 
            className="flex-1" 
            onClick={() => onApprove(user.id)}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => setRejectDialogOpen(true)}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </CardFooter>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Application</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting {user.name}'s KYC application. 
              This will be shared with the user.
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || loading}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex flex-col items-center">
              <img 
                src={previewImage} 
                alt="Document Preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.open(previewImage, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
