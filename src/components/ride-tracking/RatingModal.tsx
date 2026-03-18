import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RatingModalProps {
  booking: {
    id: string;
    ride_id: string;
    rider_id?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  isDriver?: boolean;
}

const RatingModal = ({ booking, isOpen, onClose, isDriver = false }: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let revieweeId: string;

      if (isDriver) {
        // Driver rates the rider
        revieweeId = booking.rider_id!;
      } else {
        // Rider rates the driver
        const { data: driverId } = await supabase.rpc('get_ride_driver_id', { _ride_id: booking.ride_id });
        if (!driverId) throw new Error("Driver not found");
        revieweeId = driverId;
      }

      const { error } = await supabase.from("ratings").insert({
        ride_id: booking.ride_id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Rating submitted!", description: "Thank you for your feedback." });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your {isDriver ? "Rider" : "Ride"}</DialogTitle>
          <DialogDescription>How was your experience?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hover || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Leave a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
