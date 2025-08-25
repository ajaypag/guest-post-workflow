/**
 * Session Types for Proper Impersonation Architecture
 * 
 * This replaces the cookie proliferation approach with a clean
 * server-side session state management system.
 */

export interface SessionState {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  
  // Current active user (could be admin or impersonated user)
  currentUser: {
    userId: string;
    email: string;
    name: string;
    userType: 'internal' | 'account' | 'publisher';
    role: string;
    accountId?: string;
    publisherId?: string;
    companyName?: string;
    status?: string;
  };
  
  // Impersonation metadata (only present when impersonating)
  impersonation?: {
    isActive: true;
    adminUser: {
      userId: string;
      email: string;
      name: string;
    };
    targetUser: {
      userId: string;
      email: string;
      name: string;
      userType: 'account' | 'publisher';
    };
    startedAt: Date;
    reason: string;
    logId: string;
    restrictedActions: string[];
  };
  
  // Security and tracking
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
}

// Database row type for user_sessions table
export interface SessionRow {
  id: string;
  user_id: string;
  session_data: SessionState;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
}

// Impersonation log types
export interface ImpersonationLog {
  id: string;
  sessionId: string;
  adminUserId: string;
  targetUserId: string;
  targetUserType: string;
  startedAt: Date;
  endedAt?: Date;
  reason: string;
  status: 'active' | 'ended' | 'expired';
  ipAddress?: string;
  userAgent?: string;
  actionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Action log for audit trail
export interface ActionLog {
  id?: string;
  logId: string;
  actionType: string;
  endpoint: string;
  method: string;
  requestData?: any;
  responseStatus?: number;
  timestamp: Date;
}

// Configuration options
export interface SessionConfig {
  sessionDuration: number; // milliseconds
  impersonationMaxDuration: number; // milliseconds  
  cleanupInterval: number; // milliseconds
  maxConcurrentSessions: number;
}