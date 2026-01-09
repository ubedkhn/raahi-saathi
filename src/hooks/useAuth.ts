import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface UseAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = '/auth', requireAuth = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          if (requireAuth) {
            navigate(redirectTo);
          }
        }

        // Handle sign in - redirect away from auth page
        if (event === 'SIGNED_IN' && session) {
          const publicPaths = ['/', '/auth', '/admin/login'];
          if (publicPaths.includes(location.pathname)) {
            navigate('/dashboard');
          }
        }
      }
    );

    // Then check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // If no session and auth is required, redirect
      if (!session && requireAuth) {
        navigate(redirectTo);
      }

      // If session exists and on public auth pages, redirect to dashboard
      if (session) {
        const publicPaths = ['/', '/auth'];
        if (publicPaths.includes(location.pathname)) {
          navigate('/dashboard');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo, requireAuth, location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return {
    session,
    user,
    loading,
    signOut,
    isAuthenticated: !!session,
  };
}
