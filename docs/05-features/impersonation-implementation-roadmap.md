# Impersonation System - Implementation Roadmap

**Status**: 📋 Ready for Implementation  
**Created**: 2025-08-24  
**Estimated Duration**: 8-12 hours across 4 phases

## 🎯 **Implementation Overview**

This roadmap provides step-by-step instructions for implementing the proper impersonation system, incorporating lessons learned from the first iteration.

## 📋 **Prerequisites Checklist**

- [ ] First iteration code reviewed and documented
- [ ] Database backup created
- [ ] Development environment ready
- [ ] Redis/session store decision made
- [ ] Security requirements validated

## 🚀 **Phase 1: Core Infrastructure (2-3 hours)**

### 1.1 Database Schema Setup

**Files to Create:**
- `migrations/0071_session_store_system.sql`

**Tasks:**

#### 1.1.1 Create Session Store Table
```sql
-- Create the sessions table
CREATE TABLE user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Performance indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE expires_at > NOW();
```

#### 1.1.2 Update Impersonation Tables
```sql
-- Add session_id to impersonation_logs
ALTER TABLE impersonation_logs ADD COLUMN session_id VARCHAR(255);
CREATE INDEX idx_impersonation_logs_session ON impersonation_logs(session_id);
```

**Checklist:**
- [ ] Migration file created
- [ ] Tables created in dev database
- [ ] Indexes added
- [ ] Foreign key constraints verified

### 1.2 Session Store Service

**Files to Create:**
- `lib/services/sessionManager.ts`
- `lib/types/session.ts`

#### 1.2.1 Session Types Definition
```typescript
// lib/types/session.ts
export interface SessionState {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  
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
  
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
}
```

#### 1.2.2 Session Manager Implementation
```typescript
// lib/services/sessionManager.ts
import { randomUUID } from 'crypto';
import { db } from '@/lib/db/connection';
import { SessionState } from '@/lib/types/session';

export class SessionManager {
  private static SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  static async createSession(
    user: any, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<string> {
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);
    
    const sessionState: SessionState = {
      id: sessionId,
      createdAt: now,
      expiresAt,
      currentUser: {
        userId: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType || 'internal',
        role: user.role,
        accountId: user.accountId,
        publisherId: user.publisherId,
        companyName: user.companyName,
        status: user.status,
      },
      lastActivity: now,
      ipAddress,
      userAgent,
    };
    
    await db.execute(`
      INSERT INTO user_sessions (id, user_id, session_data, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, user.id, JSON.stringify(sessionState), expiresAt, ipAddress, userAgent]);
    
    return sessionId;
  }
  
  static async getSession(sessionId: string): Promise<SessionState | null> {
    const result = await db.execute(`
      SELECT session_data, expires_at FROM user_sessions 
      WHERE id = $1 AND expires_at > NOW()
    `, [sessionId]);
    
    if (result.rows.length === 0) return null;
    
    const sessionData = result.rows[0].session_data as SessionState;
    
    // Update last activity
    await this.updateLastActivity(sessionId);
    
    return sessionData;
  }
  
  static async updateSession(
    sessionId: string, 
    updates: Partial<SessionState>
  ): Promise<void> {
    const current = await this.getSession(sessionId);
    if (!current) throw new Error('Session not found');
    
    const updated = { ...current, ...updates, lastActivity: new Date() };
    
    await db.execute(`
      UPDATE user_sessions 
      SET session_data = $1, updated_at = NOW() 
      WHERE id = $2
    `, [JSON.stringify(updated), sessionId]);
  }
  
  static async deleteSession(sessionId: string): Promise<void> {
    await db.execute(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
  }
  
  static async cleanupExpiredSessions(): Promise<void> {
    await db.execute(`DELETE FROM user_sessions WHERE expires_at <= NOW()`);
  }
  
  private static async updateLastActivity(sessionId: string): Promise<void> {
    await db.execute(`
      UPDATE user_sessions 
      SET session_data = jsonb_set(session_data, '{lastActivity}', $1)
      WHERE id = $2
    `, [JSON.stringify(new Date()), sessionId]);
  }
}
```

**Checklist:**
- [ ] Session types defined
- [ ] SessionManager service implemented
- [ ] Basic CRUD operations working
- [ ] Expiration handling tested

### 1.3 Replace AuthServiceServer

**Files to Modify:**
- `lib/auth-server.ts`

#### 1.3.1 Update AuthServiceServer
```typescript
// lib/auth-server.ts
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/services/sessionManager';
import { SessionState } from '@/lib/types/session';

export class AuthServiceServer {
  static async getSession(request?: NextRequest): Promise<SessionState | null> {
    try {
      let sessionId: string | undefined;

      // Get session ID from cookies
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('auth-session');
      sessionId = sessionCookie?.value;

      // If no cookie and request provided, check Authorization header
      if (!sessionId && request) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          sessionId = authHeader.substring(7);
        }
      }

      if (!sessionId) return null;

      return await SessionManager.getSession(sessionId);
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }
  
  static async createSession(
    user: any, 
    request?: NextRequest
  ): Promise<string> {
    const ipAddress = request?.ip || request?.headers.get('x-forwarded-for') || undefined;
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    return await SessionManager.createSession(user, ipAddress, userAgent);
  }
  
  static async requireAuth(request?: NextRequest): Promise<SessionState> {
    const session = await this.getSession(request);
    
    if (!session) {
      throw new Error('Unauthorized');
    }

    return session;
  }

  static async requireInternalUser(request?: NextRequest): Promise<SessionState> {
    const session = await this.requireAuth(request);
    
    if (session.currentUser.userType !== 'internal') {
      throw new Error('Forbidden');
    }

    return session;
  }
}
```

**Checklist:**
- [ ] AuthServiceServer updated to use SessionManager
- [ ] Single cookie approach implemented
- [ ] Backward compatibility maintained
- [ ] Error handling preserved

## 🔄 **Phase 2: Impersonation Logic (3-4 hours)**

### 2.1 Impersonation Service

**Files to Create:**
- `lib/services/impersonationService.ts`

#### 2.1.1 Impersonation Service Implementation
```typescript
// lib/services/impersonationService.ts
import { db } from '@/lib/db/connection';
import { SessionManager } from './sessionManager';
import { SessionState } from '@/lib/types/session';

export interface ImpersonationLog {
  id: string;
  sessionId: string;
  adminUserId: string;
  targetUserId: string;
  targetUserType: string;
  startedAt: Date;
  endedAt?: Date;
  reason: string;
  status: string;
  actionsCount: number;
}

export interface ActionLog {
  actionType: string;
  endpoint: string;
  method: string;
  requestData?: any;
  responseStatus?: number;
  timestamp: Date;
}

export class ImpersonationService {
  static async canImpersonate(
    adminSession: SessionState, 
    targetUserId: string
  ): Promise<boolean> {
    // Check admin permissions
    if (adminSession.currentUser.userType !== 'internal' || 
        adminSession.currentUser.role !== 'admin') {
      return false;
    }
    
    // Check if already impersonating
    if (adminSession.impersonation?.isActive) {
      return false;
    }
    
    // Check target user exists and is valid type
    const targetUser = await this.getTargetUser(targetUserId);
    if (!targetUser || !['account', 'publisher'].includes(targetUser.userType)) {
      return false;
    }
    
    return true;
  }
  
  static async startImpersonation(
    adminSessionId: string,
    targetUserId: string,
    reason: string
  ): Promise<ImpersonationLog> {
    const adminSession = await SessionManager.getSession(adminSessionId);
    if (!adminSession) throw new Error('Admin session not found');
    
    const canImpersonate = await this.canImpersonate(adminSession, targetUserId);
    if (!canImpersonate) throw new Error('Cannot impersonate this user');
    
    const targetUser = await this.getTargetUser(targetUserId);
    if (!targetUser) throw new Error('Target user not found');
    
    // Create impersonation log
    const logResult = await db.execute(`
      INSERT INTO impersonation_logs 
      (session_id, admin_user_id, target_user_id, target_user_type, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id, started_at
    `, [adminSessionId, adminSession.currentUser.userId, targetUserId, targetUser.userType, reason]);
    
    const log = logResult.rows[0];
    
    // Update session with impersonation data
    const updatedSession: SessionState = {
      ...adminSession,
      currentUser: {
        userId: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        userType: targetUser.userType as 'account' | 'publisher',
        role: targetUser.role || 'user',
        accountId: targetUser.accountId,
        publisherId: targetUser.publisherId,
        companyName: targetUser.companyName,
        status: targetUser.status,
      },
      impersonation: {
        isActive: true,
        adminUser: {
          userId: adminSession.currentUser.userId,
          email: adminSession.currentUser.email,
          name: adminSession.currentUser.name,
        },
        targetUser: {
          userId: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          userType: targetUser.userType as 'account' | 'publisher',
        },
        startedAt: new Date(log.started_at),
        reason,
        logId: log.id,
        restrictedActions: [
          '/api/billing/*',
          '/api/auth/change-password',
          '/api/users/delete',
          '/api/payments/process',
          '/api/account/delete'
        ],
      },
    };
    
    await SessionManager.updateSession(adminSessionId, updatedSession);
    
    return {
      id: log.id,
      sessionId: adminSessionId,
      adminUserId: adminSession.currentUser.userId,
      targetUserId,
      targetUserType: targetUser.userType,
      startedAt: new Date(log.started_at),
      reason,
      status: 'active',
      actionsCount: 0,
    };
  }
  
  static async endImpersonation(sessionId: string): Promise<void> {
    const session = await SessionManager.getSession(sessionId);
    if (!session?.impersonation?.isActive) {
      throw new Error('No active impersonation found');
    }
    
    // Update log status
    await db.execute(`
      UPDATE impersonation_logs 
      SET ended_at = NOW(), status = 'ended' 
      WHERE id = $1
    `, [session.impersonation.logId]);
    
    // Restore admin session
    const restoredSession: SessionState = {
      ...session,
      currentUser: {
        userId: session.impersonation.adminUser.userId,
        email: session.impersonation.adminUser.email,
        name: session.impersonation.adminUser.name,
        userType: 'internal',
        role: 'admin', // Restore admin role
      },
    };
    
    // Remove impersonation data
    delete restoredSession.impersonation;
    
    await SessionManager.updateSession(sessionId, restoredSession);
  }
  
  static async logAction(logId: string, action: ActionLog): Promise<void> {
    await db.execute(`
      INSERT INTO impersonation_actions 
      (log_id, action_type, endpoint, method, request_data, response_status, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      logId, 
      action.actionType, 
      action.endpoint, 
      action.method,
      action.requestData ? JSON.stringify(action.requestData) : null,
      action.responseStatus,
      action.timestamp
    ]);
    
    // Increment action count
    await db.execute(`
      UPDATE impersonation_logs 
      SET actions_count = actions_count + 1 
      WHERE id = $1
    `, [logId]);
  }
  
  static async getActiveSessions(): Promise<ImpersonationLog[]> {
    const result = await db.execute(`
      SELECT * FROM impersonation_logs 
      WHERE status = 'active' 
      ORDER BY started_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      adminUserId: row.admin_user_id,
      targetUserId: row.target_user_id,
      targetUserType: row.target_user_type,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      reason: row.reason,
      status: row.status,
      actionsCount: row.actions_count,
    }));
  }
  
  private static async getTargetUser(userId: string): Promise<any | null> {
    // Try accounts table first
    const accountResult = await db.execute(`
      SELECT id, email, contact_name as name, 'account' as user_type, 
             id as account_id, company_name, status
      FROM accounts WHERE id = $1 AND status = 'active'
    `, [userId]);
    
    if (accountResult.rows.length > 0) {
      return {
        ...accountResult.rows[0],
        userType: 'account'
      };
    }
    
    // Try publishers table
    const publisherResult = await db.execute(`
      SELECT id, email, 
             COALESCE(first_name || ' ' || last_name, company_name) as name,
             'publisher' as user_type, id as publisher_id, company_name, status
      FROM publishers WHERE id = $1 AND status = 'active'
    `, [userId]);
    
    if (publisherResult.rows.length > 0) {
      return {
        ...publisherResult.rows[0],
        userType: 'publisher'
      };
    }
    
    return null;
  }
}
```

**Checklist:**
- [ ] ImpersonationService implemented
- [ ] Permission validation working
- [ ] Session state updates working
- [ ] Action logging implemented

### 2.2 Action Restriction Middleware

**Files to Create:**
- `lib/middleware/impersonationMiddleware.ts`

#### 2.2.1 Middleware Implementation
```typescript
// lib/middleware/impersonationMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { pathToRegexp } from 'path-to-regexp';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export class ImpersonationMiddleware {
  private static restrictedPaths = [
    '/api/billing/:path*',
    '/api/auth/change-password',
    '/api/users/delete',
    '/api/payments/process/:path*',
    '/api/account/delete',
    '/api/stripe/:path*',
    '/api/admin/:path*', // Prevent admin actions during impersonation
  ];
  
  static async handle(request: NextRequest): Promise<NextResponse | null> {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session?.impersonation?.isActive) {
      return null; // Not impersonating, allow all actions
    }
    
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Check if path is restricted
    const isRestricted = this.restrictedPaths.some(pattern => {
      const regexp = pathToRegexp(pattern);
      return regexp.test(pathname);
    });
    
    if (isRestricted) {
      return NextResponse.json({
        error: 'This action is not allowed during impersonation',
        code: 'IMPERSONATION_RESTRICTED'
      }, { status: 403 });
    }
    
    // Log the action
    await ImpersonationService.logAction(session.impersonation.logId, {
      actionType: 'API_CALL',
      endpoint: pathname,
      method: request.method,
      timestamp: new Date()
    });
    
    return null; // Allow the request to proceed
  }
}
```

**Checklist:**
- [ ] Middleware implemented
- [ ] Restricted paths defined
- [ ] Action logging integrated
- [ ] Error responses properly formatted

### 2.3 API Endpoints

**Files to Create:**
- `app/api/admin/impersonate/start/route.ts`
- `app/api/admin/impersonate/end/route.ts`

#### 2.3.1 Start Impersonation Endpoint
```typescript
// app/api/admin/impersonate/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.requireInternalUser(request);
    
    if (session.currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }
    
    const { targetUserId, reason } = await request.json();
    
    if (!targetUserId || !reason || reason.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Target user ID and detailed reason (min 10 chars) are required' 
      }, { status: 400 });
    }
    
    const log = await ImpersonationService.startImpersonation(
      session.id,
      targetUserId,
      reason.trim()
    );
    
    return NextResponse.json({
      success: true,
      logId: log.id,
      message: 'Impersonation started successfully'
    });
    
  } catch (error: any) {
    console.error('Start impersonation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to start impersonation'
    }, { status: 400 });
  }
}
```

#### 2.3.2 End Impersonation Endpoint
```typescript
// app/api/admin/impersonate/end/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { ImpersonationService } from '@/lib/services/impersonationService';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session?.impersonation?.isActive) {
      return NextResponse.json({ 
        error: 'No active impersonation found' 
      }, { status: 400 });
    }
    
    await ImpersonationService.endImpersonation(session.id);
    
    return NextResponse.json({
      success: true,
      message: 'Impersonation ended successfully'
    });
    
  } catch (error: any) {
    console.error('End impersonation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to end impersonation'
    }, { status: 400 });
  }
}
```

**Checklist:**
- [ ] Start impersonation API implemented
- [ ] End impersonation API implemented
- [ ] Input validation added
- [ ] Error handling implemented

## 🎨 **Phase 3: Frontend Components (2-3 hours)**

### 3.1 Context Provider

**Files to Create:**
- `lib/contexts/ImpersonationContext.tsx`

#### 3.1.1 Impersonation Context
```typescript
// lib/contexts/ImpersonationContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionState } from '@/lib/types/session';

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationData: SessionState['impersonation'] | null;
  endImpersonation: () => Promise<void>;
  timeElapsed: string;
  loading: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

export const ImpersonationProvider: React.FC<{ children: React.ReactNode; initialSession?: SessionState }> = ({ 
  children, 
  initialSession 
}) => {
  const [session, setSession] = useState<SessionState | null>(initialSession || null);
  const [loading, setLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState('');

  // Update time elapsed every minute
  useEffect(() => {
    if (!session?.impersonation?.isActive) return;

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

    try {
      const response = await fetch('/api/admin/impersonate/end', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Reload the page to refresh with admin session
        window.location.reload();
      } else {
        alert('Failed to end impersonation: ' + data.error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
      alert('Failed to end impersonation');
      setLoading(false);
    }
  };

  const value: ImpersonationContextType = {
    isImpersonating: !!session?.impersonation?.isActive,
    impersonationData: session?.impersonation || null,
    endImpersonation,
    timeElapsed,
    loading,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};
```

**Checklist:**
- [ ] Context provider implemented
- [ ] Time elapsed tracking working
- [ ] Auto-end functionality added
- [ ] Loading states managed

### 3.2 Component Library

**Files to Create:**
- `components/impersonation/ImpersonationBanner.tsx`
- `components/impersonation/UserSearchForm.tsx`
- `components/impersonation/UserSelectionList.tsx`
- `components/impersonation/ImpersonationForm.tsx`

#### 3.2.1 Impersonation Banner
```typescript
// components/impersonation/ImpersonationBanner.tsx
'use client';

import React from 'react';
import { AlertTriangle, X, User, Clock, LogOut } from 'lucide-react';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';

export default function ImpersonationBanner() {
  const { isImpersonating, impersonationData, endImpersonation, timeElapsed, loading } = useImpersonation();

  if (!isImpersonating || !impersonationData) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="font-semibold text-sm uppercase tracking-wider">
                Impersonation Mode
              </span>
            </div>
            
            <div className="hidden sm:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1.5">
                <User className="w-4 h-4" />
                <span>
                  <span className="opacity-90">Viewing as:</span>{' '}
                  <strong>{impersonationData.targetUser.name}</strong>
                  <span className="opacity-75 ml-1">({impersonationData.targetUser.userType})</span>
                </span>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4" />
                <span className="opacity-90">
                  Duration: <strong>{timeElapsed || '0m'}</strong>
                </span>
              </div>
              
              {impersonationData.reason && (
                <div className="hidden lg:block">
                  <span className="opacity-90">Reason:</span>{' '}
                  <span className="italic">"{impersonationData.reason}"</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={endImpersonation}
            disabled={loading}
            className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            <span>{loading ? 'Ending...' : 'End Impersonation'}</span>
          </button>
        </div>

        {/* Mobile view - additional info */}
        <div className="sm:hidden pb-3 text-sm space-y-1">
          <div className="flex items-center space-x-1.5">
            <User className="w-4 h-4" />
            <span>
              Viewing as: <strong>{impersonationData.targetUser.name}</strong> ({impersonationData.targetUser.userType})
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4" />
            <span>Duration: {timeElapsed || '0m'}</span>
          </div>
        </div>
      </div>

      {/* Warning stripe */}
      <div className="bg-orange-600 text-center py-1 text-xs">
        <span className="opacity-90">
          ⚠️ Actions are being logged • Cannot access billing or change passwords • 2 hour maximum session
        </span>
      </div>
    </div>
  );
}
```

#### 3.2.2 Admin Impersonation Page
```typescript
// app/admin/impersonate/page.tsx
import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import ImpersonationUI from '@/components/impersonation/ImpersonationUI';

export default async function ImpersonatePage({
  searchParams
}: {
  searchParams: { search?: string; type?: string; page?: string; };
}) {
  const session = await AuthServiceServer.getSession();
  
  // Only admins can access this page
  if (!session || session.currentUser.userType !== 'internal' || session.currentUser.role !== 'admin') {
    redirect('/');
  }

  // If already impersonating, redirect to end impersonation
  if (session.impersonation?.isActive) {
    return (
      <ImpersonationProvider initialSession={session}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Already Impersonating</h2>
            <p className="text-gray-600 mb-4">
              You are currently impersonating <strong>{session.impersonation.targetUser.name}</strong>.
              Please end the current session before starting a new one.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </ImpersonationProvider>
    );
  }

  const search = searchParams.search || '';
  const userType = searchParams.type || 'account';
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get users based on type (same logic as before but cleaner)
  let users = [];
  let totalCount = 0;

  // Implementation details...
  
  return (
    <ImpersonationProvider initialSession={session}>
      <ImpersonationUI
        users={users}
        currentPage={page}
        totalPages={Math.ceil(totalCount / limit)}
        searchQuery={search}
        userType={userType}
      />
    </ImpersonationProvider>
  );
}
```

**Checklist:**
- [ ] Banner component implemented
- [ ] Admin page updated
- [ ] Context integration working
- [ ] Responsive design implemented

### 3.3 Layout Integration

**Files to Modify:**
- `app/layout.tsx`

#### 3.3.1 Update Root Layout
```typescript
// app/layout.tsx
import { ImpersonationBanner } from '@/components/impersonation/ImpersonationBanner';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import { AuthServiceServer } from '@/lib/auth-server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await AuthServiceServer.getSession();

  return (
    <html lang="en">
      <head>
        {/* existing head content */}
      </head>
      <body className="min-h-screen bg-gray-50">
        <ImpersonationProvider initialSession={session}>
          <ImpersonationBanner />
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ImpersonationProvider>
      </body>
    </html>
  );
}
```

**Checklist:**
- [ ] Layout updated with context provider
- [ ] Banner integrated globally
- [ ] Session passed to provider
- [ ] No layout shift issues

## 🧪 **Phase 4: Testing & Validation (1-2 hours)**

### 4.1 Integration Tests

**Files to Create:**
- `__tests__/impersonation/sessionManager.test.ts`
- `__tests__/impersonation/impersonationFlow.test.ts`

#### 4.1.1 Session Manager Tests
```typescript
// __tests__/impersonation/sessionManager.test.ts
import { SessionManager } from '@/lib/services/sessionManager';
import { db } from '@/lib/db/connection';

describe('SessionManager', () => {
  beforeEach(async () => {
    // Clean up test sessions
    await db.execute(`DELETE FROM user_sessions WHERE user_id = 'test-user'`);
  });

  test('creates and retrieves session', async () => {
    const user = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      userType: 'internal',
      role: 'admin'
    };

    const sessionId = await SessionManager.createSession(user);
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/); // UUID format

    const session = await SessionManager.getSession(sessionId);
    expect(session).not.toBeNull();
    expect(session?.currentUser.email).toBe('test@example.com');
  });

  test('handles expired sessions', async () => {
    // Create session with past expiration
    const user = { id: 'test-user', email: 'test@example.com', name: 'Test User' };
    const sessionId = await SessionManager.createSession(user);
    
    // Manually update expiration to past
    await db.execute(`
      UPDATE user_sessions 
      SET expires_at = NOW() - INTERVAL '1 hour' 
      WHERE id = $1
    `, [sessionId]);

    const session = await SessionManager.getSession(sessionId);
    expect(session).toBeNull();
  });
});
```

#### 4.1.2 End-to-End Flow Test
```typescript
// __tests__/impersonation/impersonationFlow.test.ts
import { SessionManager } from '@/lib/services/sessionManager';
import { ImpersonationService } from '@/lib/services/impersonationService';

describe('Impersonation Flow', () => {
  let adminSessionId: string;
  let targetUserId: string;

  beforeEach(async () => {
    // Set up test data
    adminSessionId = await SessionManager.createSession({
      id: 'admin-user',
      email: 'admin@example.com',
      name: 'Admin User',
      userType: 'internal',
      role: 'admin'
    });

    // Create test target user (would normally be in accounts/publishers table)
    targetUserId = 'target-user';
  });

  test('complete impersonation flow', async () => {
    // Start impersonation
    const log = await ImpersonationService.startImpersonation(
      adminSessionId,
      targetUserId,
      'Testing impersonation flow'
    );

    expect(log.status).toBe('active');
    expect(log.reason).toBe('Testing impersonation flow');

    // Verify session is updated
    const session = await SessionManager.getSession(adminSessionId);
    expect(session?.impersonation?.isActive).toBe(true);
    expect(session?.impersonation?.logId).toBe(log.id);

    // End impersonation
    await ImpersonationService.endImpersonation(adminSessionId);

    // Verify session is restored
    const restoredSession = await SessionManager.getSession(adminSessionId);
    expect(restoredSession?.impersonation?.isActive).toBe(false);
    expect(restoredSession?.currentUser.userType).toBe('internal');
  });
});
```

**Checklist:**
- [ ] Unit tests for SessionManager
- [ ] Integration tests for impersonation flow
- [ ] Action logging tests
- [ ] Middleware restriction tests

### 4.2 Manual Testing Checklist

#### 4.2.1 Happy Path Testing
- [ ] Admin can access impersonation page
- [ ] User search works for accounts and publishers
- [ ] Impersonation starts successfully with proper reason
- [ ] Banner shows during impersonation
- [ ] Navigation works while impersonating
- [ ] Time elapsed updates correctly
- [ ] End impersonation restores admin session

#### 4.2.2 Security Testing
- [ ] Non-admin users cannot access impersonation page
- [ ] Cannot impersonate internal users
- [ ] Restricted actions return 403 errors
- [ ] Session expires after 2 hours
- [ ] Cannot chain impersonation (impersonator cannot impersonate)
- [ ] All actions are logged in database

#### 4.2.3 Edge Case Testing
- [ ] Invalid target user ID handled
- [ ] Empty/short reason rejected
- [ ] Network failures during start/end handled
- [ ] Browser refresh maintains impersonation state
- [ ] Multiple browser tabs behavior
- [ ] Session cleanup on logout

### 4.3 Performance Testing

**Checklist:**
- [ ] Session lookup performance with large session store
- [ ] User search performance with large datasets
- [ ] Action logging doesn't significantly slow requests
- [ ] Memory usage reasonable during long impersonation sessions

## 🚀 **Deployment Checklist**

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migration ready
- [ ] Environment variables configured
- [ ] Monitoring/alerting setup
- [ ] Documentation updated

### Deployment Steps
1. [ ] Run database migrations
2. [ ] Deploy backend changes
3. [ ] Deploy frontend changes
4. [ ] Verify impersonation functionality
5. [ ] Test restricted actions
6. [ ] Monitor for errors

### Post-Deployment
- [ ] Admin team trained on new feature
- [ ] Security team notified of audit logging
- [ ] Performance monitoring active
- [ ] Usage analytics tracked

## 📊 **Success Metrics**

### Technical Metrics
- [ ] Single cookie authentication ✓
- [ ] No cookie conflicts ✓
- [ ] All security restrictions enforced ✓
- [ ] Comprehensive audit trail ✓

### User Experience Metrics
- [ ] Clean development workflow ✓
- [ ] Intuitive admin interface ✓
- [ ] Clear impersonation indicators ✓
- [ ] No session confusion ✓

### Business Metrics
- [ ] Support ticket resolution improvement
- [ ] Admin productivity increase
- [ ] Security incident reduction
- [ ] Compliance readiness

---

## 🎯 **Implementation Priority**

1. **Phase 1 (Critical)**: Core infrastructure - session store and auth replacement
2. **Phase 2 (High)**: Impersonation logic and security enforcement
3. **Phase 3 (Medium)**: Frontend components and user interface
4. **Phase 4 (Low)**: Testing and validation

This roadmap provides a complete, step-by-step implementation plan that addresses all the issues from the first iteration while maintaining production-quality standards.