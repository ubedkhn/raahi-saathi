import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  otp?: string;
  rides: {
    profiles: {
      name: string;
      avatar_url: string;
    };
    vehicles: {
      brand: string;
      model: string;
      registration_no: string;
    };
  };
}

interface OTPVerificationProps {
  booking: Booking;
  onVerified: () => void;
}

const OTPVerification = ({ booking, onVerified }: OTPVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerify = () => {
    setVerifying(true);
    setError('');

    // Verify OTP
    if (otp === booking.otp) {
      toast({
        title: 'OTP Verified!',
        description: 'Starting your ride now',
      });
      onVerified();
    } else {
      setError('Invalid OTP. Please check and try again.');
      setVerifying(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOtp(value);
    setError('');
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Driver Has Arrived!</h2>
          <p className="text-muted-foreground">
            Please verify your ride by entering the OTP provided by your driver
          </p>
        </div>

        {/* Driver Info */}
        <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg mb-6">
          <Avatar className="h-14 w-14">
            <AvatarImage src={booking.rides.profiles.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {booking.rides.profiles.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{booking.rides.profiles.name}</p>
            <p className="text-sm text-muted-foreground">
              {booking.rides.vehicles.brand} {booking.rides.vehicles.model}
            </p>
            <p className="text-xs text-muted-foreground">
              {booking.rides.vehicles.registration_no}
            </p>
          </div>
        </div>

        {/* OTP Input */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Enter 4-Digit OTP
            </label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={otp}
              onChange={handleOTPChange}
              placeholder="0000"
              className={`text-center text-2xl font-bold tracking-widest ${
                error ? 'border-destructive' : ''
              }`}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 4 || verifying}
            className="w-full"
            size="lg"
          >
            {verifying ? 'Verifying...' : 'Verify & Start Ride'}
          </Button>
        </div>

        {/* Security Note */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            🔒 For your safety, only share the OTP with your driver after verifying their identity
          </p>
        </div>
      </Card>
    </div>
  );
};

export default OTPVerification;
