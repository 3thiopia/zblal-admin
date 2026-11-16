import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { fetchStaffProfileForUser } from '../services/supabaseService';
import { StaffProfile } from '../types';

interface AuthContextValue {
  isConfigured: boolean;
  configError: string | null;
  session: Session | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const verifyAndLoadStaffProfile = async (activeSession: Session | null) => {
    if (!activeSession) {
      setSession(null);
      setStaffProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await fetchStaffProfileForUser(activeSession.user.id);
      if (!profile) {
        await supabase?.auth.signOut();
        setSession(null);
        setStaffProfile(null);
        setAuthError(
          'Access denied. Your account does not have an active Zblal staff profile (super_admin, admin, or staff).'
        );
      } else {
        setSession(activeSession);
        setStaffProfile(profile);
        setAuthError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to verify staff profile.';
      await supabase?.auth.signOut();
      setSession(null);
      setStaffProfile(null);
      setAuthError(`Staff verification failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }
        void verifyAndLoadStaffProfile(data.session);
      })
      .catch((err) => {
        if (!mounted) return;
        setAuthError(err instanceof Error ? err.message : 'Failed to restore auth session.');
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setIsLoading(true);
      void verifyAndLoadStaffProfile(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(
        supabaseConfigError ?? 'Supabase client is not configured.'
      );
    }
    setAuthError(null);
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setIsLoading(false);
      setAuthError(error.message);
      throw error;
    }

    await verifyAndLoadStaffProfile(data.session);
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setStaffProfile(null);
    setAuthError(null);
  };

  const value: AuthContextValue = {
    isConfigured: isSupabaseConfigured,
    configError: supabaseConfigError,
    session,
    staffProfile,
    isAuthenticated: Boolean(session && staffProfile && staffProfile.isActive),
    isLoading,
    authError,
    signIn,
    signOut,
    clearAuthError: () => setAuthError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
