import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  IndianRupee, MapPin, CheckCircle, QrCode, 
  Wallet, CreditCard, Smartphone, AlertCircle
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (finalAmount: number) => void;
  fareAmount: number;
  pickupAddress: string;
  dropAddress: string;
  riderName: string;
  driverUpiId?: string;
}

const PaymentModal = ({
  isOpen,
  onClose,
  onComplete,
  fareAmount,
  pickupAddress,
  dropAddress,
  riderName,
  driverUpiId = "",
}: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [customAmount, setCustomAmount] = useState(fareAmount.toString());

  const amount = Number(customAmount) || 0;
  const platformFee = amount * 0.05;
  const driverEarnings = amount - platformFee;

  const upiLink = driverUpiId
    ? `upi://pay?pa=${driverUpiId}&pn=Raahi Driver&am=${amount}&cu=INR&tn=Raahi Ride Payment`
    : "";

  const qrDataUrl = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`
    : "";

  const handleConfirmPayment = async () => {
    if (amount <= 0) return;
    setConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onComplete(amount);
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

        <div className="space-y-5 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ride Amount (₹)</label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="text-2xl font-bold text-center h-14"
              placeholder="Enter amount"
            />
          </div>

          {/* Route Summary */}
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
                  <span className="font-medium">₹{amount.toFixed(2)}</span>
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

          {/* UPI QR Code */}
          {paymentMethod === 'upi' && (
            <Card className="bg-accent/30">
              <CardContent className="pt-4 text-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI QR Code"
                    className="w-48 h-48 mx-auto rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-3">
                    <div className="text-center">
                      <QrCode className="h-20 w-20 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground mt-2">Add UPI ID in profile to generate QR</p>
                    </div>
                  </div>
                )}
                <Badge variant="secondary" className="mb-2">
                  <CreditCard className="h-3 w-3 mr-1" />
                  UPI Payment
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Rider scans QR to pay ₹{amount.toFixed(2)}
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
                    <p className="font-semibold">Collect ₹{amount.toFixed(2)} in cash</p>
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
            disabled={!paymentMethod || confirming || amount <= 0}
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
