import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ArrowLeft, Send, Loader2 } from "lucide-react";

interface ChatThread {
  booking_id: string;
  ride_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string;
  last_time: string;
  status: string;
  unread: number;
}

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const QUICK_REPLIES = ["On my way!", "I'm here", "Running late", "Where are you?", "Thanks!"];

const Chats = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth({ requireAuth: true });
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadThreads();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadThreads = async () => {
    if (!user) return;
    try {
      // Get bookings where user is rider or driver
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, ride_id, rider_id, status, rides!inner(driver_id)")
        .or(`rider_id.eq.${user.id},rides.driver_id.eq.${user.id}`)
        .in("status", ["accepted", "driver_arriving", "driver_arrived", "in_progress"])
        .order("updated_at", { ascending: false });

      if (!bookings || bookings.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const threadList: ChatThread[] = [];
      for (const b of bookings) {
        const isDriver = (b.rides as any).driver_id === user.id;
        const otherId = isDriver ? b.rider_id : (b.rides as any).driver_id;

        const { data: profile } = await supabase
          .rpc("get_ride_participant_profile", { participant_id: otherId });

        const { data: lastMsg } = await supabase
          .from("ride_messages")
          .select("message, created_at")
          .eq("booking_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        threadList.push({
          booking_id: b.id,
          ride_id: b.ride_id,
          other_name: profile?.[0]?.name || "User",
          other_avatar: profile?.[0]?.avatar_url || null,
          last_message: lastMsg?.message || "No messages yet",
          last_time: lastMsg?.created_at || b.id,
          status: b.status || "accepted",
          unread: 0,
        });
      }
      setThreads(threadList);
    } catch (err) {
      console.error("Error loading threads:", err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (thread: ChatThread) => {
    setActiveThread(thread);
    const { data } = await supabase
      .from("ride_messages")
      .select("*")
      .eq("booking_id", thread.booking_id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${thread.booking_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "ride_messages",
        filter: `booking_id=eq.${thread.booking_id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async (text: string) => {
    if (!user || !activeThread || !text.trim()) return;
    setSending(true);
    try {
      await supabase.from("ride_messages").insert({
        booking_id: activeThread.booking_id,
        sender_id: user.id,
        message: text.trim(),
      });
      setNewMessage("");
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Active chat view
  if (activeThread) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
          <button onClick={() => setActiveThread(null)} className="p-1 hover:bg-muted rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar className="h-9 w-9">
            <AvatarImage src={activeThread.other_avatar || undefined} />
            <AvatarFallback>{activeThread.other_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{activeThread.other_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{activeThread.status.replace("_", " ")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/manage-ride/${activeThread.booking_id}`)}>
            View Ride
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-accent/20">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Start the conversation with a quick reply below
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}>
                <p>{msg.message}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-t border-border bg-card">
          {QUICK_REPLIES.map((text) => (
            <Button
              key={text}
              variant="secondary"
              size="sm"
              className="text-xs whitespace-nowrap flex-shrink-0"
              onClick={() => sendMessage(text)}
              disabled={sending}
            >
              {text}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(newMessage)}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Thread list view
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Chats</h1>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">No Active Chats</h2>
            <p className="text-muted-foreground text-sm">
              Chats appear here when you have an active ride booking.
            </p>
          </CardContent>
        </Card>
      ) : (
        threads.map((thread) => (
          <button
            key={thread.booking_id}
            onClick={() => openThread(thread)}
            className="flex items-center gap-3 w-full p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={thread.other_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {thread.other_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm truncate">{thread.other_name}</p>
                <Badge variant="secondary" className="text-[10px] capitalize ml-2">
                  {thread.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.last_message}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export default Chats;
