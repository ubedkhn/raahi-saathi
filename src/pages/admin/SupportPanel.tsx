import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TicketList } from "@/components/admin/TicketList";
import { ChatWindow } from "@/components/admin/ChatWindow";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_id: string;
  status: string;
  issue_type: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

const SupportPanel = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadCurrentUser();
    loadTickets();
    subscribeToTickets();

    return () => {
      supabase.channel('tickets').unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, statusFilter]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadTickets = async () => {
    try {
      // First get all tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      // Then get user profiles for each ticket
      const userIds = [...new Set(ticketData?.map(t => t.user_id) || [])];
      
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Create a lookup map
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Merge data
      const enrichedTickets = ticketData?.map(ticket => ({
        ...ticket,
        user_name: profileMap.get(ticket.user_id)?.name || 'Unknown User',
        user_avatar: profileMap.get(ticket.user_id)?.avatar_url
      })) || [];

      setTickets(enrichedTickets);
    } catch (error: any) {
      console.error("Error loading tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToTickets = () => {
    const channel = supabase
      .channel('tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();
  };

  const filterTickets = () => {
    if (statusFilter === "all") {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(t => t.status === statusFilter));
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus as any })
        .eq("id", ticketId);

      if (error) throw error;

      // Log admin action
      await supabase.from("admin_activity_log").insert({
        admin_id: currentUserId,
        action: "update_ticket_status",
        details: { ticket_id: ticketId, new_status: newStatus }
      });

      toast.success(`Ticket marked as ${newStatus}`);
      
      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: newStatus } : t
      ));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast.error("Failed to update ticket status");
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Support Panel</h1>
        <p className="text-muted-foreground">Manage customer support tickets</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Ticket List */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
                <TabsTrigger value="in_progress" className="flex-1">Active</TabsTrigger>
                <TabsTrigger value="resolved" className="flex-1">Done</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-hidden">
            <TicketList
              tickets={filteredTickets}
              selectedTicketId={selectedTicket?.id}
              onSelectTicket={handleSelectTicket}
              loading={loading}
            />
          </div>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <ChatWindow
            ticket={selectedTicket}
            currentUserId={currentUserId}
            onStatusChange={handleStatusChange}
          />
        </Card>
      </div>
    </div>
  );
};

export default SupportPanel;
