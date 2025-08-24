'use client';

import React, { useEffect, useState } from 'react';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import { SessionState } from '@/lib/types/session';

interface Props {
  children: React.ReactNode;
}

export const ImpersonationWrapper: React.FC<Props> = ({ children }) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionState = async () => {
    try {
      const response = await fetch('/api/auth/session-state', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessionState(data.sessionState || null);
        console.log('🔄 ImpersonationWrapper: Session state updated', {
          isImpersonating: !!data.sessionState?.impersonation?.isActive,
          targetUser: data.sessionState?.impersonation?.targetUser?.name
        });
      } else {
        setSessionState(null);
      }
    } catch (error) {
      console.error('Error fetching session state:', error);
      setSessionState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionState();

    // Listen for impersonation state changes
    const handleImpersonationChange = () => {
      console.log('🔄 Detected impersonation state change, refetching session...');
      fetchSessionState();
    };

    // Listen for storage events (in case impersonation is triggered from another tab)
    window.addEventListener('storage', handleImpersonationChange);
    
    // Listen for custom impersonation events
    window.addEventListener('impersonationStart', handleImpersonationChange);
    window.addEventListener('impersonationEnd', handleImpersonationChange);

    // Poll session state every 60 seconds to catch changes
    const pollInterval = setInterval(fetchSessionState, 60000);

    return () => {
      window.removeEventListener('storage', handleImpersonationChange);
      window.removeEventListener('impersonationStart', handleImpersonationChange);
      window.removeEventListener('impersonationEnd', handleImpersonationChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Don't render until we have checked for session
  if (loading) {
    return <div>{children}</div>;
  }

  return (
    <ImpersonationProvider initialSession={sessionState}>
      {children}
    </ImpersonationProvider>
  );
};