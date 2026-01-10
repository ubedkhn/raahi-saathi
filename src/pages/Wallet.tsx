import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, ArrowDownToLine, FileText } from "lucide-react";
import { toast } from "sonner";

const Wallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch payments as driver (earnings)
      const { data: driverPayments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("driver_id", session.user.id)
        .eq("status", "completed");

      // Fetch payments as rider (spent)
      const { data: riderPayments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("rider_id", session.user.id)
        .eq("status", "completed");

      // Fetch wallet transactions for balance
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("amount, type, status")
        .eq("user_id", session.user.id)
        .eq("status", "completed");

      // Calculate totals
      const earned = driverPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const spent = riderPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Calculate wallet balance from transactions
      let balance = 0;
      transactions?.forEach(t => {
        if (t.type === 'credit') balance += Number(t.amount);
        else if (t.type === 'debit' || t.type === 'withdrawal') balance -= Number(t.amount);
      });

      // For now, assume wallet balance equals earnings minus withdrawals
      // In a real app, this would track commissions for offline payments
      setWalletBalance(Math.max(0, balance + earned * 0.1)); // 10% commission example
      setTotalEarned(earned);
      setTotalSpent(spent);
    } catch (error: any) {
      console.error("Error loading wallet data:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    if (walletBalance < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      setWithdrawDialogOpen(false);
      return;
    }
    toast.info("Withdrawal feature coming soon!");
    setWithdrawDialogOpen(false);
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WalletIcon className="h-6 w-6 text-primary" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">Manage your earnings and transactions</p>
      </div>

      {/* Wallet Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Wallet Balance */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">₹{walletBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">₹{totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings as driver</p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">₹{totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime spending as rider</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Withdraw Button */}
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <ArrowDownToLine className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Withdraw Money</h3>
                    <p className="text-sm text-muted-foreground">Transfer to your bank account</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Money</DialogTitle>
              <DialogDescription>
                Transfer your wallet balance to your bank account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-primary">₹{walletBalance.toFixed(2)}</p>
              </div>
              
              {walletBalance < 100 ? (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive text-center">
                    Minimum withdrawal amount is ₹100
                  </p>
                </div>
              ) : (
                <Button onClick={handleWithdraw} className="w-full min-h-[44px]">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Withdraw ₹{walletBalance.toFixed(2)}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Passbook Link */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/passbook')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-full">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Transaction Passbook</h3>
                <p className="text-sm text-muted-foreground">View all your transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">How Wallet Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Earn money when riders pay for your shared rides</p>
          <p>• Track all your earnings and spending in one place</p>
          <p>• Withdraw your balance anytime (minimum ₹100)</p>
          <p>• Platform fee of 5% is deducted from each ride</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Wallet;