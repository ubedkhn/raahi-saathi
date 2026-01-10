import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  IndianRupee, MapPin, CheckCircle, QrCode, 
  Wallet, CreditCard, Smartphone, AlertCircle
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  fareAmount: number;
  pickupAddress: string;
  dropAddress: string;
  riderName: string;
}

const PaymentModal = ({
  isOpen,
  onClose,
  onComplete,
  fareAmount,
  pickupAddress,
  dropAddress,
  riderName,
}: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | null>(null);
  const [confirming, setConfirming] = useState(false);

  const platformFee = fareAmount * 0.05;
  const driverEarnings = fareAmount - platformFee;

  const handleConfirmPayment = async () => {
    setConfirming(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            Collect Payment
          </DialogTitle>
          <DialogDescription>
            Collect fare from {riderName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fare Breakdown */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">From</p>
                  <p className="font-medium truncate">{pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">To</p>
                  <p className="font-medium truncate">{dropAddress}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Fare</span>
                  <span className="font-medium">₹{fareAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (5%)</span>
                  <span className="text-destructive">-₹{platformFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Your Earnings</span>
                  <span className="text-xl font-bold text-success">₹{driverEarnings.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="space-y-3">
            <p className="font-medium text-sm">Payment Method</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cash')}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Wallet className="h-6 w-6" />
                <span>Cash</span>
              </Button>
              <Button
                variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('upi')}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Smartphone className="h-6 w-6" />
                <span>UPI</span>
              </Button>
            </div>
          </div>

          {/* UPI QR Code (static placeholder) */}
          {paymentMethod === 'upi' && (
            <Card className="bg-accent/30">
              <CardContent className="pt-4 text-center">
                <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-3">
                  <div className="text-center">
                    <QrCode className="h-32 w-32 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">UPI QR Code</p>
                  </div>
                </div>
                <Badge variant="secondary" className="mb-2">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Razorpay Payment
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Rider scans QR to pay ₹{fareAmount}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cash Info */}
          {paymentMethod === 'cash' && (
            <Card className="bg-success/10 border-success/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-semibold">Collect ₹{fareAmount} in cash</p>
                    <p className="text-sm text-muted-foreground">
                      Ensure you receive the full amount before confirming
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          {paymentMethod && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Only confirm after receiving payment. This action cannot be undone.
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmPayment}
            disabled={!paymentMethod || confirming}
            className="w-full min-h-[56px] text-lg font-bold"
            variant="action"
          >
            {confirming ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Confirm Payment Received
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
