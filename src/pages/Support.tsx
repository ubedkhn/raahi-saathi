import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageSquare, Headphones } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

const Support = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuthAndLoadTicket();
  }, []);

  useEffect(() => {
    if (ticket) {
      loadMessages();
      subscribeToMessages();
    }
    return () => {
      if (ticket) {
        supabase.channel(`user-messages-${ticket.id}`).unsubscribe();
      }
    };
  }, [ticket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuthAndLoadTicket = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Check for existing open ticket
      const { data: existingTicket, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", session.user.id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticketError) throw ticketError;

      if (existingTicket) {
        setTicket(existingTicket);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!ticket) return;

    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const subscribeToMessages = () => {
    if (!ticket) return;

    const channel = supabase
      .channel(`user-messages-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleStartChat = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          issue_type: "chat_support",
          description: "Live chat support request",
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      
      setTicket(data);
      toast.success("Chat started! An admin will respond shortly.");
    } catch (error: any) {
      toast.error("Failed to start chat");
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !ticket) return;

    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: userId,
        message_text: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Help & Support</h1>
          <p className="text-sm text-muted-foreground">Chat with our support team</p>
        </div>
        {ticket && (
          <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
            {ticket.status}
          </Badge>
        )}
      </div>

      {/* Main Content */}
      {!ticket ? (
        // No active ticket - show start chat
        <Card className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Headphones className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Need Help?</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start a conversation with our support team. We're here to help you with any questions or issues.
          </p>
          <Button onClick={handleStartChat} size="lg" className="gap-2">
            <MessageSquare className="h-5 w-5" />
            Start Chat
          </Button>
        </Card>
      ) : (
        // Active ticket - show chat
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Support Chat
              <span className="text-muted-foreground font-normal">
                #{ticket.id.slice(0, 8)}
              </span>
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  Send a message to start the conversation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isUser = message.sender_id === userId;
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isUser && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            S
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!isUser && (
                          <p className="text-xs font-medium mb-1">Support Team</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {format(new Date(message.created_at), 'p')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <div className="p-4 border-t">
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

          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <div className="p-4 border-t bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                This conversation has been {ticket.status}. 
                <Button 
                  variant="link" 
                  className="px-1"
                  onClick={handleStartChat}
                >
                  Start a new chat
                </Button>
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Support;
