import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Upload, CheckCircle, AlertCircle, Car, MapPin, Calendar, Clock, Users, IndianRupee, Bike } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LocationInput, LocationData } from "@/components/common";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registration_no: string;
  type: '2wheeler' | '4wheeler';
}

const PostRide = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // KYC form states
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(null);
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const [platePlotoFile, setPlatePlotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Ride form states - now storing full location data with coordinates
  const [originLocation, setOriginLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState(1);
  const [pricePerKm, setPricePerKm] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

      // Fetch user's verified vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, brand, model, registration_no, type')
        .eq('user_id', session.user.id)
        .eq('verified', true);

      if (vehiclesData) {
        setVehicles(vehiclesData as Vehicle[]);
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
        title: "Invalid Aadhaar",
        description: "Please enter a valid 12-digit Aadhaar number",
        variant: "destructive",
      });
      return;
    }

    if (!drivingLicenseFile) {
      toast({
        title: "Missing document",
        description: "Please upload your driving license photo",
        variant: "destructive",
      });
      return;
    }

    if (!vehicleRegFile || !vehiclePhotoFile || !platePlotoFile) {
      toast({
        title: "Missing vehicle documents",
        description: "Please upload all vehicle documents: registration card, vehicle photo, and plate photo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      if (!user) throw new Error("No user found");

      // Upload driving license
      const licenseExt = drivingLicenseFile.name.split('.').pop();
      const licensePath = `${user.id}/driving_license.${licenseExt}`;
      
      const { error: uploadError1 } = await supabase.storage
        .from('kyc_documents')
        .upload(licensePath, drivingLicenseFile, { 
          upsert: true 
        });

      if (uploadError1) throw uploadError1;

      const { data: { publicUrl: licenseUrl } } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(licensePath);

      // Upload vehicle registration
      const regExt = vehicleRegFile.name.split('.').pop();
      const regPath = `${user.id}/vehicle_registration.${regExt}`;
      
      const { error: uploadError2 } = await supabase.storage
        .from('kyc_documents')
        .upload(regPath, vehicleRegFile, { 
          upsert: true 
        });

      if (uploadError2) throw uploadError2;

      // Upload vehicle photo
      const photoExt = vehiclePhotoFile.name.split('.').pop();
      const photoPath = `${user.id}/vehicle_photo.${photoExt}`;
      
      const { error: uploadError3 } = await supabase.storage
        .from('kyc_documents')
        .upload(photoPath, vehiclePhotoFile, { 
          upsert: true 
        });

      if (uploadError3) throw uploadError3;

      // Upload plate photo
      const plateExt = platePlotoFile.name.split('.').pop();
      const platePath = `${user.id}/plate_photo.${plateExt}`;
      
      const { error: uploadError4 } = await supabase.storage
        .from('kyc_documents')
        .upload(platePath, platePlotoFile, { 
          upsert: true 
        });

      if (uploadError4) throw uploadError4;

      // Update profile with KYC data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          aadhaar_number: aadhaarNumber,
          driving_license_photo_url: licenseUrl,
          kyc_status: 'pending'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "KYC Submitted",
        description: "Your documents are under review. You'll be notified once verified.",
      });

      // Refresh profile
      await checkUser();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to submit KYC documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePostRide = async () => {
    // Validation
    if (!originLocation) {
      toast({
        title: "Invalid Origin",
        description: "Please select a pickup location from the suggestions",
        variant: "destructive",
      });
      return;
    }

    if (!destinationLocation) {
      toast({
        title: "Invalid Destination",
        description: "Please select a destination from the suggestions",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select a date for your ride",
        variant: "destructive",
      });
      return;
    }

    if (!time) {
      toast({
        title: "Time Required",
        description: "Please select a time for your ride",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVehicle) {
      toast({
        title: "Vehicle Required",
        description: "Please select a vehicle for this ride",
        variant: "destructive",
      });
      return;
    }

    if (!pricePerKm || parseFloat(pricePerKm) < 1) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price per kilometer (min ₹1)",
        variant: "destructive",
      });
      return;
    }

    // Validate date is today or future
    const selectedDate = new Date(`${date}T${time}`);
    if (selectedDate < new Date()) {
      toast({
        title: "Invalid Date/Time",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");

      // Combine date + time into ISO timestamp
      const startTime = new Date(`${date}T${time}`).toISOString();

      // Insert ride with geocoded coordinates
      const { error } = await supabase
        .from('rides')
        .insert({
          driver_id: currentUser.id,
          vehicle_id: selectedVehicle,
          origin_address: originLocation.address,
          destination_address: destinationLocation.address,
          origin_lat: originLocation.latitude,
          origin_lng: originLocation.longitude,
          destination_lat: destinationLocation.latitude,
          destination_lng: destinationLocation.longitude,
          start_time: startTime,
          seats_available: seatsAvailable,
          price_per_km: parseFloat(pricePerKm),
          status: 'scheduled'
        });

      if (error) throw error;

      toast({
        title: "Ride Posted Successfully! 🎉",
        description: "Riders can now find and book your ride.",
      });

      navigate('/dashboard');

    } catch (error: any) {
      toast({
        title: "Failed to post ride",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  // Get selected vehicle type for seat options
  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const maxSeats = selectedVehicleData?.type === '2wheeler' ? 1 : 4;

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      {profile?.kyc_status === 'verified' ? (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-6 h-6 text-primary" />
              Create New Ride
            </CardTitle>
            <CardDescription>Share your journey and earn money</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {vehicles.length === 0 ? (
              // No verified vehicles message
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-warning" />
                <p className="text-lg font-semibold text-foreground mb-2">No Verified Vehicles</p>
                <p className="text-muted-foreground mb-6">
                  You don't have any verified vehicles yet. Please add a vehicle from your Profile to post rides.
                </p>
                <Button 
                  variant="action" 
                  onClick={() => navigate('/profile')}
                  className="min-h-[44px]"
                >
                  Go to Profile
                </Button>
              </div>
            ) : (
              // Ride creation form
              <>
                {/* Origin & Destination with Geocoding */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      From *
                    </Label>
                    <LocationInput
                      placeholder="Search pickup location..."
                      value={originLocation?.address || ""}
                      onLocationSelect={setOriginLocation}
                      icon="origin"
                    />
                    {originLocation && (
                      <p className="text-xs text-muted-foreground">
                        📍 {originLocation.latitude.toFixed(4)}, {originLocation.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-destructive" />
                      To *
                    </Label>
                    <LocationInput
                      placeholder="Search destination..."
                      value={destinationLocation?.address || ""}
                      onLocationSelect={setDestinationLocation}
                      icon="destination"
                    />
                    {destinationLocation && (
                      <p className="text-xs text-muted-foreground">
                        📍 {destinationLocation.latitude.toFixed(4)}, {destinationLocation.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-base font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Time *
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" />
                    Select Vehicle *
                  </Label>
                  <RadioGroup
                    value={selectedVehicle}
                    onValueChange={(value) => {
                      setSelectedVehicle(value);
                      // Reset seats if switching to bike
                      const vehicle = vehicles.find(v => v.id === value);
                      if (vehicle?.type === '2wheeler') {
                        setSeatsAvailable(1);
                      }
                    }}
                    className="space-y-2"
                  >
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                          selectedVehicle === vehicle.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background'
                        }`}
                      >
                        <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                        <Label
                          htmlFor={vehicle.id}
                          className="flex-1 cursor-pointer flex items-center gap-3"
                        >
                          {vehicle.type === '2wheeler' ? (
                            <Bike className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Car className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.registration_no} • {vehicle.type === '2wheeler' ? 'Bike' : 'Car'}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Available Seats */}
                {selectedVehicleData?.type !== '2wheeler' && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Available Seats *
                    </Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((num) => (
                        <Button
                          key={num}
                          type="button"
                          variant={seatsAvailable === num ? "default" : "outline"}
                          onClick={() => setSeatsAvailable(num)}
                          disabled={num > maxSeats}
                          className="flex-1 min-h-[44px]"
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price per KM */}
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-base font-semibold flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-primary" />
                    Price per KM (₹) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.5"
                    placeholder="Enter price per kilometer"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(e.target.value)}
                    className="min-h-[44px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Suggested: ₹6-7/km for bikes, ₹10-12/km for cars
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  variant="action"
                  onClick={handlePostRide}
                  disabled={submitting || !originLocation || !destinationLocation || !date || !time || !selectedVehicle || !pricePerKm}
                  className="w-full text-lg h-14 font-bold shadow-xl min-h-[56px]"
                >
                  {submitting ? "Posting Ride..." : "🚀 Post Ride"}
                </Button>
              </>
            )}
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
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardTitle className="text-3xl text-center font-bold text-primary">Complete KYC Verification</CardTitle>
            <CardDescription className="text-center text-lg">
              Upload your documents to start offering rides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            {/* Personal Documents Section */}
            <div className="space-y-6 p-6 bg-accent/30 rounded-lg border-2 border-primary/20">
              <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Personal Documents
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="aadhaar" className="text-base font-semibold">Aadhaar Number *</Label>
                <Input
                  id="aadhaar"
                  type="text"
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  className="text-lg min-h-[44px]"
                />
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Required for identity verification and passenger safety
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license" className="text-base font-semibold">Driving License Photo *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center active:border-primary transition-colors cursor-pointer">
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
                      <p className="text-sm text-success font-medium">✓ {drivingLicenseFile.name}</p>
                    ) : (
                      <p className="text-sm">Click to upload driving license</p>
                    )}
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of your valid driving license
                </p>
              </div>
            </div>

            {/* Vehicle Documents Section */}
            <div className="space-y-6 p-6 bg-secondary/10 rounded-lg border-2 border-secondary/30">
              <h3 className="text-xl font-semibold text-secondary-foreground flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Documents
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle-reg" className="text-base font-semibold">Vehicle Registration Card *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center active:border-secondary transition-colors cursor-pointer">
                  <Input
                    id="vehicle-reg"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setVehicleRegFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="vehicle-reg" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {vehicleRegFile ? (
                      <p className="text-sm text-success font-medium">✓ {vehicleRegFile.name}</p>
                    ) : (
                      <p className="text-sm">Click to upload RC book</p>
                    )}
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your RC book/vehicle registration certificate
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-photo" className="text-base font-semibold">Vehicle Photo *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center active:border-secondary transition-colors cursor-pointer">
                  <Input
                    id="vehicle-photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVehiclePhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="vehicle-photo" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {vehiclePhotoFile ? (
                      <p className="text-sm text-success font-medium">✓ {vehiclePhotoFile.name}</p>
                    ) : (
                      <p className="text-sm">Click to upload vehicle photo</p>
                    )}
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of your vehicle from the side
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plate-photo" className="text-base font-semibold">Number Plate Photo *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center active:border-secondary transition-colors cursor-pointer">
                  <Input
                    id="plate-photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPlatePlotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="plate-photo" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {platePlotoFile ? (
                      <p className="text-sm text-success font-medium">✓ {platePlotoFile.name}</p>
                    ) : (
                      <p className="text-sm">Click to upload plate photo</p>
                    )}
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo showing the vehicle's number plate
                </p>
              </div>
            </div>

            <Button
              variant="action"
              onClick={handleKYCSubmit}
              disabled={uploading || !aadhaarNumber || !drivingLicenseFile || !vehicleRegFile || !vehiclePhotoFile || !platePlotoFile}
              className="w-full text-lg h-14 font-bold shadow-xl min-h-[56px]"
            >
              {uploading ? "Uploading Documents..." : "Submit for Verification"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              All documents will be verified by our admin team within 24-48 hours
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PostRide;
