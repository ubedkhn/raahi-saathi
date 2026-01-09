import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, CheckCircle, Clock, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  is_admin?: boolean;
}

interface ChatWindowProps {
  ticket: {
    id: string;
    user_id: string;
    status: string;
    issue_type: string;
    description: string;
    user_name?: string;
    user_avatar?: string;
  } | null;
  currentUserId: string;
  onStatusChange: (ticketId: string, status: string) => void;
}

export const ChatWindow = ({ ticket, currentUserId, onStatusChange }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) {
      loadMessages();
      subscribeToMessages();
    }
    return () => {
      supabase.channel(`messages-${ticket?.id}`).unsubscribe();
    };
  }, [ticket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!ticket) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Mark messages as admin or user
      const markedMessages = (data || []).map(msg => ({
        ...msg,
        is_admin: msg.sender_id !== ticket.user_id
      }));
      
      setMessages(markedMessages);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!ticket) return;

    const channel = supabase
      .channel(`messages-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          newMsg.is_admin = newMsg.sender_id !== ticket.user_id;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !ticket) return;

    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: currentUserId,
        message_text: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message");
      console.error("Send error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Ticket Selected</h3>
        <p className="text-muted-foreground">
          Select a support ticket from the list to view the conversation
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={ticket.user_avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {ticket.user_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{ticket.user_name || 'Unknown User'}</h3>
            <p className="text-xs text-muted-foreground">
              {ticket.issue_type} • Ticket #{ticket.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
            {ticket.status}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(ticket.id, 'in_progress')}>
                <Clock className="h-4 w-4 mr-2" />
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(ticket.id, 'resolved')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(ticket.id, 'closed')}>
                <XCircle className="h-4 w-4 mr-2" />
                Close Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ticket Description */}
      <div className="p-4 bg-muted/50 border-b">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Issue:</span> {ticket.description}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Start the conversation by sending a message</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.is_admin ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    message.is_admin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    message.is_admin ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(message.created_at), 'p')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      {ticket.status !== 'closed' && (
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
