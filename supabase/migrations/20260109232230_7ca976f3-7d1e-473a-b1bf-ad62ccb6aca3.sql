-- Create support_messages table for real-time chat
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add status column to profiles for user account status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'suspended', 'terminated'));

-- Enable RLS on support_messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_messages

-- Users can view messages from their own tickets
CREATE POLICY "Users can view own ticket messages"
ON public.support_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
  )
);

-- Users can insert messages to their own tickets
CREATE POLICY "Users can send messages to own tickets"
ON public.support_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert messages to any ticket
CREATE POLICY "Admins can send messages to any ticket"
ON public.support_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  auth.uid() = sender_id
);

-- Admins can manage all support tickets
CREATE POLICY "Admins can manage all tickets"
ON public.support_tickets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;