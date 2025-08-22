'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';

interface NotificationSummary {
  actionRequiredCount: number;
  recentUpdatesCount: number;
  urgentOrders: Array<{
    id: string;
    shortId: string;
    status: string;
    state?: string;
    message: string;
    // Rich details (accountName actually contains client display name like "AIApply" or "AIApply, Hoola")
    accountName: string;
    accountEmail?: string;
    lineItemCount: number;
    totalRetail: number;
    updatedAt: string;
    groupsNeedingSuggestions: number;
  }>;
  totalOrders: number;
  moreSuggestionsCount?: number; // NEW: Count of orders needing more suggestions
}

interface NotificationContextType {
  notifications: NotificationSummary | null;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const session = AuthService.getSession();
      if (!session) {
        setNotifications(null);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/notifications/summary', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          setNotifications(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    setLoading(true);
    await fetchNotifications();
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Auto-refresh every 2 minutes when user is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && AuthService.getSession()) {
        fetchNotifications();
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        error,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}