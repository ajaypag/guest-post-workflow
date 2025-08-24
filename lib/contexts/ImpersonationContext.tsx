/**
 * Impersonation Context Provider
 * 
 * Global state management for impersonation sessions.
 * Provides impersonation state and controls to all components.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionState } from '@/lib/types/session';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationData: SessionState['impersonation'] | null;
  endImpersonation: () => Promise<void>;
  timeElapsed: string;
  loading: boolean;
  error: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
  initialSession?: SessionState | null;
}

export const ImpersonationProvider: React.FC<Props> = ({ 
  children, 
  initialSession 
}) => {
  const [session, setSession] = useState<SessionState | null>(initialSession || null);

  // Update session when initialSession changes
  useEffect(() => {
    setSession(initialSession || null);
    console.log('🔄 ImpersonationProvider: Session updated from wrapper', {
      isImpersonating: !!initialSession?.impersonation?.isActive,
      targetUser: initialSession?.impersonation?.targetUser?.name
    });
  }, [initialSession]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState('');

  // Update time elapsed every minute
  useEffect(() => {
    if (!session?.impersonation?.isActive) {
      setTimeElapsed('');
      return;
    }

    const updateTime = () => {
      const start = new Date(session.impersonation!.startedAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      
      if (hours > 0) {
        setTimeElapsed(`${hours}h ${minutes}m`);
      } else {
        setTimeElapsed(`${minutes}m`);
      }

      // Auto-end after 2 hours
      if (hours >= 2) {
        console.log('⏰ Auto-ending impersonation after 2 hours');
        endImpersonation();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [session]);

  const endImpersonation = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/impersonate/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Impersonation ended successfully');
        // Dispatch custom event to trigger session state refetch
        window.dispatchEvent(new CustomEvent('impersonationEnd'));
        // Reload the page to refresh with admin session
        window.location.href = data.redirectUrl || '/accounts';
      } else {
        setError(data.error || 'Failed to end impersonation');
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Error ending impersonation:', err);
      setError('Failed to end impersonation. Please try again.');
      setLoading(false);
    }
  };

  const value: ImpersonationContextType = {
    isImpersonating: !!session?.impersonation?.isActive,
    impersonationData: session?.impersonation || null,
    endImpersonation,
    timeElapsed,
    loading,
    error,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};