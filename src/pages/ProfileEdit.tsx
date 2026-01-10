import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { ArrowLeft, Camera, Upload, User, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { data: cachedProfile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    gender: "male" | "female" | "other" | "";
    date_of_birth: string;
    permanent_address: string;
    avatar_url: string;
  }>({
    name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    permanent_address: "",
    avatar_url: "",
  });

  // Initialize form with cached profile data
  useEffect(() => {
    if (cachedProfile) {
      setFormData({
        name: cachedProfile.name || "",
        phone: cachedProfile.phone || "",
        gender: (cachedProfile.gender as "male" | "female" | "other") || "",
        date_of_birth: cachedProfile.date_of_birth || "",
        permanent_address: cachedProfile.permanent_address || "",
        avatar_url: cachedProfile.avatar_url || "",
      });
    }
  }, [cachedProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc_documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrl });
    } catch (error: any) {
      console.error('Upload failed:', error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    updateProfile.mutate(
      {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        permanent_address: formData.permanent_address,
        avatar_url: formData.avatar_url,
      },
      {
        onSuccess: () => navigate('/profile'),
      }
    );
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback>
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex gap-2">
                <label htmlFor="camera-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    asChild
                  >
                    <span className="cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Camera
                    </span>
                  </Button>
                  <input
                    id="camera-upload"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>

                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    asChild
                  >
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>
              {uploadingAvatar && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    className="pl-12"
                    maxLength={10}
                    value={formData.phone.replace(/^\+91/, '')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: `+91${digits}` });
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value: "male" | "female" | "other") => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address">Permanent Address</Label>
                <Input
                  id="address"
                  value={formData.permanent_address}
                  onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                  placeholder="Enter your permanent address"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="flex-1"
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/profile')}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileEdit;
