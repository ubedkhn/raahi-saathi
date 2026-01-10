import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, TrendingDown, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit' | 'withdrawal';
  description: string | null;
  status: string;
  created_at: string;
}

const Passbook = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch wallet transactions
      const { data: walletData, error: walletError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (walletError) throw walletError;

      // Also fetch payments to show as transactions
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .or(`rider_id.eq.${session.user.id},driver_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      // Convert payments to transaction format
      const paymentTransactions: Transaction[] = (paymentsData || []).map(p => ({
        id: p.id,
        amount: Number(p.amount),
        type: p.rider_id === session.user.id ? 'debit' as const : 'credit' as const,
        description: p.rider_id === session.user.id ? 'Ride payment' : 'Ride earning',
        status: p.status || 'completed',
        created_at: p.created_at || new Date().toISOString(),
      }));

      // Combine and sort all transactions
      const allTransactions = [
        ...(walletData || []).map(t => ({
          ...t,
          amount: Number(t.amount),
          type: t.type as 'credit' | 'debit' | 'withdrawal',
        })),
        ...paymentTransactions
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'withdrawal':
        return <ArrowDownToLine className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-success';
      case 'debit':
      case 'withdrawal':
        return 'text-destructive';
      default:
        return '';
    }
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
          <FileText className="h-6 w-6 text-primary" />
          Transaction Passbook
        </h1>
        <p className="text-muted-foreground">Complete history of all your transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
              <p className="text-muted-foreground">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(transaction.created_at), 'hh:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span>{transaction.description || transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getAmountColor(transaction.type)}`}>
                        {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Passbook;