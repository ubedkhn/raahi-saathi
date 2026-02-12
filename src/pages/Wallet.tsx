import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet as WalletIcon, TrendingUp, ArrowDownToLine, FileText } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  status: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  useEffect(() => { loadWalletData(); }, []);

  const loadWalletData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      let balance = 0;
      let earned = 0;

      txns?.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'credit') { balance += amt; earned += amt; }
        else if (t.type === 'debit') { balance -= amt; }
        else if (t.type === 'withdrawal') { balance -= amt; }
      });

      setWalletBalance(Math.max(0, balance));
      setTotalEarned(earned);
      setTransactions((txns || []).slice(0, 20));
    } catch (error: any) {
      console.error("Error loading wallet:", error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WalletIcon className="h-6 w-6 text-primary" /> My Wallet
        </h1>
        <p className="text-muted-foreground">Manage your earnings and transactions</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WalletIcon className="h-4 w-4" /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">₹{walletBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">₹{totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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
              <DialogDescription>Transfer your wallet balance to your bank account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-primary">₹{walletBalance.toFixed(2)}</p>
              </div>
              {walletBalance < 100 ? (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive text-center">Minimum withdrawal amount is ₹100</p>
                </div>
              ) : (
                <Button onClick={handleWithdraw} className="w-full min-h-[44px]">
                  <ArrowDownToLine className="h-4 w-4 mr-2" /> Withdraw ₹{walletBalance.toFixed(2)}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/passbook')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-full">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">View All Transactions</h3>
                <p className="text-sm text-muted-foreground">Full transaction passbook</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{t.description || t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()} · {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`font-bold text-sm ${t.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                    {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader><CardTitle className="text-lg">How Wallet Works</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Earn money when riders pay for your shared rides</p>
          <p>• 5% platform fee is deducted, rest credited to your wallet</p>
          <p>• Track all earnings and spending in one place</p>
          <p>• Withdraw your balance anytime (minimum ₹100)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Wallet;
