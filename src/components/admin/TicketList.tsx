import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  unread_count?: number;
}

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId?: string;
  onSelectTicket: (ticket: Ticket) => void;
  loading?: boolean;
}

const statusConfig = {
  open: { 
    icon: AlertCircle, 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Open"
  },
  in_progress: { 
    icon: Clock, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    label: "In Progress"
  },
  resolved: { 
    icon: CheckCircle, 
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    label: "Resolved"
  },
  closed: { 
    icon: CheckCircle, 
    color: "bg-muted text-muted-foreground",
    label: "Closed"
  },
};

export const TicketList = ({ tickets, selectedTicketId, onSelectTicket, loading }: TicketListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No support tickets found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {tickets.map((ticket) => {
          const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open;
          const StatusIcon = status.icon;
          const isSelected = ticket.id === selectedTicketId;

          return (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                isSelected 
                  ? "bg-primary/10 border-l-4 border-primary" 
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {ticket.user_name || 'Unknown User'}
                    </span>
                    {ticket.unread_count && ticket.unread_count > 0 && (
                      <Badge variant="default" className="h-5 px-1.5 text-xs">
                        {ticket.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {ticket.issue_type}: {ticket.description.substring(0, 50)}...
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn("text-xs", status.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
