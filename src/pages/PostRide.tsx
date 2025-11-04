import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const PostRide = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (profileData) {
        setProfile(profileData);
        setAadhaarNumber(profileData.aadhaar_number || "");
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKYCSubmit = async () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast({
        title: "Invalid Aadhaar Number",
        description: "Please enter a valid 12-digit Aadhaar number",
        variant: "destructive",
      });
      return;
    }

    if (!drivingLicenseFile) {
      toast({
        title: "Missing Document",
        description: "Please upload your driving license photo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload driving license photo
      const fileExt = drivingLicenseFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc_documents')
        .upload(fileName, drivingLicenseFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(fileName);

      // Update profile with KYC information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          aadhaar_number: aadhaarNumber,
          driving_license_photo_url: publicUrl,
          kyc_status: 'pending'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "KYC Submitted Successfully",
        description: "Your documents are under review. You'll be notified once verified.",
      });

      // Refresh profile
      await checkUser();
    } catch (error: any) {
      console.error('KYC submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-primary">Post a Ride</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {profile?.kyc_status === 'verified' ? (
          <Card>
            <CardHeader>
              <CardTitle>Create New Ride</CardTitle>
              <CardDescription>Share your journey and earn money</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
                <p className="text-lg font-semibold text-foreground mb-2">KYC Verified!</p>
                <p>Ride posting functionality coming soon...</p>
              </div>
            </CardContent>
          </Card>
        ) : profile?.kyc_status === 'pending' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning" />
                KYC Verification Pending
              </CardTitle>
              <CardDescription>
                Your documents are under review by our admin team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-warning" />
                <p className="text-muted-foreground mb-4">
                  We're reviewing your documents. This usually takes 24-48 hours.
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a notification once your verification is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Complete KYC Verification
              </CardTitle>
              <CardDescription>
                Upload your documents to start offering rides
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="aadhaar">
                  Aadhaar Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="aadhaar"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground">
                  Your Aadhaar details are kept secure and confidential
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">
                  Driving License Photo <span className="text-destructive">*</span>
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <Input
                    id="license"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDrivingLicenseFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="license" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {drivingLicenseFile ? (
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{drivingLicenseFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Upload Driving License</p>
                        <p className="text-xs text-muted-foreground">
                          Click to browse or drag and drop
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a clear photo of your driving license
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Why we need these documents?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>To verify your identity and ensure rider safety</li>
                  <li>To comply with transportation regulations</li>
                  <li>To protect you and the community from fraud</li>
                  <li>All documents are encrypted and securely stored</li>
                </ul>
              </div>

              <Button 
                onClick={handleKYCSubmit} 
                className="w-full" 
                disabled={uploading || !aadhaarNumber || !drivingLicenseFile}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PostRide;
