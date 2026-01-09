import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, Phone, Mail, MapPin, Calendar, Shield, 
  Car, CreditCard, FileText 
} from "lucide-react";
import { format } from "date-fns";

interface UserDetailsModalProps {
  user: any;
  open: boolean;
  onClose: () => void;
}

export const UserDetailsModal = ({ user, open, onClose }: UserDetailsModalProps) => {
  if (!user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'suspended': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'terminated': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold">{user.name || 'Unknown'}</h3>
                <Badge className={getStatusColor(user.status || 'active')}>
                  {user.status || 'active'}
                </Badge>
                <Badge variant={getKycStatusColor(user.kyc_status)}>
                  <Shield className="w-3 h-3 mr-1" />
                  KYC: {user.kyc_status || 'pending'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {user.id}
              </p>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email || 'Not available'}</span>
                </div>
                {user.permanent_address && (
                  <div className="flex items-start gap-2 text-sm md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{user.permanent_address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined: {user.created_at ? format(new Date(user.created_at), 'PPP') : 'Unknown'}</span>
                </div>
                {user.gender && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Gender: {user.gender}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KYC Details */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                KYC Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Aadhaar Number</p>
                  <p className="text-sm font-medium">
                    {user.aadhaar_number || 'Not provided'}
                    {user.aadhaar_verified && (
                      <Badge variant="outline" className="ml-2 text-green-600">Verified</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Driving License</p>
                  <p className="text-sm font-medium">
                    {user.driving_license_number || 'Not provided'}
                    {user.driving_license_verified && (
                      <Badge variant="outline" className="ml-2 text-green-600">Verified</Badge>
                    )}
                  </p>
                </div>
              </div>
              {user.driving_license_photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">License Photo</p>
                  <img 
                    src={user.driving_license_photo_url} 
                    alt="Driving License" 
                    className="max-w-xs rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Car className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{user.rides_count || 0}</p>
                <p className="text-xs text-muted-foreground">Rides Given</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{user.bookings_count || 0}</p>
                <p className="text-xs text-muted-foreground">Rides Taken</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CreditCard className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold">₹{user.earnings || 0}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CreditCard className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">₹{user.spent || 0}</p>
                <p className="text-xs text-muted-foreground">Spent</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
