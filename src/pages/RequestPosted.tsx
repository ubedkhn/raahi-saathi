import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, ArrowLeft, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/utils";

interface RequestRow {
  id: string;
  origin_address: string;
  destination_address: string;
  preferred_time: string;
  status: string;
  rider_id: string;
}

const RequestPosted = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("id, origin_address, destination_address, preferred_time, status, rider_id")
        .eq("id", requestId)
        .maybeSingle();
      if (!mounted) return;
      if (error) toast.error(friendlyError(error));
      setRequest(data as RequestRow | null);
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel(`req-${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${requestId}` },
        (payload) => {
          const updated = payload.new as RequestRow;
          setRequest(updated);
          if (updated.status === "matched") {
            toast.success("A driver accepted your request!");
            // Try to find the booking and navigate to it
            findMyBooking(updated.rider_id);
          }
        }
      )
      .subscribe();

    // Listen for new bookings created against my account (driver acceptance path)
    const bChannel = supabase
      .channel(`req-bookings-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        async (payload) => {
          const b = payload.new as { id: string; rider_id: string };
          const { data: { user } } = await supabase.auth.getUser();
          if (b.rider_id === user?.id) {
            navigate(`/manage-ride/${b.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(bChannel);
    };
  }, [requestId, navigate]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const findMyBooking = async (riderId: string) => {
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id) navigate(`/manage-ride/${data.id}`);
  };

  const handleCancel = async () => {
    if (!requestId) return;
    const { error } = await supabase
      .from("ride_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Request cancelled");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-muted-foreground">We couldn't find this request.</p>
        <Button onClick={() => navigate("/dashboard")}>Go Home</Button>
      </div>
    );
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-hero px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 -ml-2 text-primary-foreground hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Request Posted</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        <Card className="shadow-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Waiting for a driver…</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We're notifying KYC-verified drivers near you.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Elapsed: {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-left">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span className="truncate">{request.origin_address}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <span className="truncate">{request.destination_address}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              <span>Carpoolers save up to ₹200 vs solo cabs</span>
            </div>

            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-1" /> Cancel Request
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestPosted;
