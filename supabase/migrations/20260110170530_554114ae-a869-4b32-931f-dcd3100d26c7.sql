-- Enable realtime for profiles table to support automatic UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;