import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Share2, Gift, Award, Leaf, Zap, Crown, Copy, CheckCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const BADGES = [
  { id: "eco", icon: Leaf, label: "Eco Saver", desc: "Shared 5+ rides", color: "text-success", earned: true },
  { id: "early", icon: Zap, label: "Early Bird", desc: "First 10 users", color: "text-secondary", earned: true },
  { id: "champion", icon: Crown, label: "Raahi Champion", desc: "50+ rides completed", color: "text-primary", earned: false },
];

const ReferralHub = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [copied, setCopied] = useState(false);
  const referralCode = profile?.id?.slice(0, 8).toUpperCase() || "RAAHI123";
  const referralsJoined = 2;
  const referralsNeeded = 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Join Raahi with my code: ${referralCode}\nhttps://raahi-saathi.lovable.app`);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Raahi!",
          text: `Use my code ${referralCode} to get a free ride on Raahi!`,
          url: "https://raahi-saathi.lovable.app",
        });
      } catch (err: any) {
        // User dismissed or permission denied — silently fall back to copy
        if (err?.name !== "AbortError") handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="gradient-hero rounded-2xl p-6 text-primary-foreground text-center">
        <Gift className="h-12 w-12 mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-1">Invite Friends</h1>
        <p className="text-sm opacity-90">Earn Free Rides!</p>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">Your Referral Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold tracking-widest text-primary">{referralCode}</span>
            <button onClick={handleCopy} className="p-2 hover:bg-accent rounded-lg transition-colors">
              {copied ? <CheckCircle className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>
          <Button onClick={handleShare} className="w-full min-h-[48px]">
            <Share2 className="h-4 w-4 mr-2" /> Share Invite
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Referral Progress</span>
            <span className="text-sm text-primary font-semibold">{referralsJoined} / {referralsNeeded} Joined</span>
          </div>
          <Progress value={(referralsJoined / referralsNeeded) * 100} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {referralsNeeded - referralsJoined} more to unlock a free ride! 🎉
          </p>
        </CardContent>
      </Card>

      {/* Badges */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Your Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((badge) => (
            <Card key={badge.id} className={`${badge.earned ? "" : "opacity-40"}`}>
              <CardContent className="pt-4 pb-4 text-center">
                <badge.icon className={`h-8 w-8 mx-auto mb-2 ${badge.color}`} />
                <p className="text-xs font-medium">{badge.label}</p>
                <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
                {badge.earned && (
                  <Badge className="mt-1 text-[9px] bg-success/10 text-success">Earned</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferralHub;
