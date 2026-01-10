import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch payments as driver (earnings)
      const { data: driverPayments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("driver_id", user.id)
        .eq("status", "completed");

      // Fetch payments as rider (spent)
      const { data: riderPayments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("rider_id", user.id)
        .eq("status", "completed");

      // Fetch wallet transactions
      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("amount, type, status")
        .eq("user_id", user.id)
        .eq("status", "completed");

      // Calculate totals
      const totalEarned = driverPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalSpent = riderPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Calculate wallet balance from transactions
      let balance = 0;
      transactions?.forEach(t => {
        if (t.type === 'credit') balance += Number(t.amount);
        else if (t.type === 'debit' || t.type === 'withdrawal') balance -= Number(t.amount);
      });

      // Commission-based wallet balance
      const walletBalance = Math.max(0, balance + totalEarned * 0.1);

      return {
        walletBalance,
        totalEarned,
        totalSpent
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}