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
  const [isInternalUser, setIsInternalUser] = useState(false);

  const fetchSessionState = async () => {
    try {
      const response = await fetch('/api/auth/session-state', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessionState(data.sessionState || null);
        // Check if this is an internal user who can actually impersonate
        setIsInternalUser(data.sessionState?.userType === 'internal');
      } else {
        setSessionState(null);
        setIsInternalUser(false);
      }
    } catch (error) {
      console.error('Error fetching session state:', error);
      setSessionState(null);
      setIsInternalUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial check to determine user type
    fetchSessionState();
  }, []);

  useEffect(() => {
    // Only set up listeners if this is an internal user
    if (!isInternalUser) {
      return;
    }

    // Listen for impersonation state changes
    const handleImpersonationChange = () => {
      fetchSessionState();
    };

    // Listen for storage events (in case impersonation is triggered from another tab)
    window.addEventListener('storage', handleImpersonationChange);
    
    // Listen for custom impersonation events
    window.addEventListener('impersonationStart', handleImpersonationChange);
    window.addEventListener('impersonationEnd', handleImpersonationChange);

    return () => {
      window.removeEventListener('storage', handleImpersonationChange);
      window.removeEventListener('impersonationStart', handleImpersonationChange);
      window.removeEventListener('impersonationEnd', handleImpersonationChange);
    };
  }, [isInternalUser]);

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