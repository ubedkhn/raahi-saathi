import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const PRESET_REASONS = [
  "Change of plan",
  "Driver delayed",
  "Found another ride",
];

interface CancelRideModalProps {
  open: boolean;
  onClose: () => void;
  bookingId?: string;
  rideId?: string;
  /** ride_request id – if provided, restore it to 'open' after cancel */
  rideRequestId?: string;
  type: "booking" | "ride" | "request";
}

const CancelRideModal = ({ open, onClose, bookingId, rideId, rideRequestId, type }: CancelRideModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);

  const finalReason = selectedReason === "other" ? freeText.trim() : selectedReason;

  const handleConfirm = async () => {
    if (!finalReason) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Cancel the booking / ride / request
      if (type === "booking" && bookingId) {
        const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      } else if (type === "ride" && rideId) {
        const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["my-rides"] });
      } else if (type === "request" && rideRequestId) {
        const { error } = await supabase.from("ride_requests").update({ status: "cancelled" }).eq("id", rideRequestId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["my-ride-requests"] });
      }

      // 2. If a booking was cancelled and had a linked ride_request, restore it to 'open'
      if (type === "booking" && rideRequestId) {
        await supabase.from("ride_requests").update({ status: "open" }).eq("id", rideRequestId);
        queryClient.invalidateQueries({ queryKey: ["my-ride-requests"] });
      }

      // 3. Record cancellation reason
      await supabase.from("cancellations").insert({
        user_id: user.id,
        booking_id: bookingId ?? null,
        ride_id: rideId ?? null,
        reason: selectedReason === "other" ? "Other" : selectedReason,
        free_text: selectedReason === "other" ? freeText.trim() : null,
      });

      toast({ title: "Cancelled", description: "Your cancellation has been recorded." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Cancel {type === "booking" ? "Booking" : type === "ride" ? "Ride" : "Request"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Please select a reason for cancellation:</p>

          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
            {PRESET_REASONS.map((r) => (
              <div key={r} className="flex items-center space-x-2">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`} className="cursor-pointer font-normal">{r}</Label>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="reason-other" />
              <Label htmlFor="reason-other" className="cursor-pointer font-normal">Other (specify below)</Label>
            </div>
          </RadioGroup>

          {selectedReason === "other" && (
            <Textarea
              placeholder="Tell us more..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={300}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Keep it</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || (selectedReason === "other" && !freeText.trim())}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Confirm Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelRideModal;
