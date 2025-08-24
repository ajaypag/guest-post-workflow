/**
 * Session Manager Service
 * 
 * Core service for managing single session store architecture.
 * Replaces cookie proliferation with clean server-side state management.
 */

import { getSessionPool } from '@/lib/db/sessionPool';
import { SessionState, SessionConfig } from '@/lib/types/session';

// Get shared pool instance
const pool = getSessionPool();

// Generate UUID v4 compatible with Edge runtime
function generateUUID(): string {
  // Use crypto.randomUUID if available (browser/edge), otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Node.js
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class SessionManager {
  private static config: SessionConfig = {
    sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
    impersonationMaxDuration: 2 * 60 * 60 * 1000, // 2 hours
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    maxConcurrentSessions: 10, // per user
  };
  
  /**
   * Create a new session for a user
   */
  static async createSession(
    user: any, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<string> {
    const sessionId = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionDuration);
    
    const sessionState: SessionState = {
      id: sessionId,
      createdAt: now,
      expiresAt,
      currentUser: {
        userId: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType || 'internal',
        role: user.role || 'user',
        accountId: user.accountId,
        publisherId: user.publisherId,
        companyName: user.companyName,
        status: user.status,
      },
      lastActivity: now,
      ipAddress,
      userAgent,
    };
    
    try {
      await pool.query(`
        INSERT INTO user_sessions (id, user_id, session_data, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [sessionId, user.id, JSON.stringify(sessionState), expiresAt, ipAddress, userAgent]);
      
      console.log('✅ SessionManager: Created session', { sessionId, userId: user.id, userType: user.userType });
      return sessionId;
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to create session', error);
      throw new Error('Failed to create session');
    }
  }
  
  /**
   * Retrieve a session by ID
   */
  static async getSession(sessionId: string): Promise<SessionState | null> {
    if (!sessionId) return null;
    
    try {
      const result = await pool.query(`
        SELECT session_data, expires_at FROM user_sessions 
        WHERE id = $1 AND expires_at > NOW()
      `, [sessionId]);
      
      if (result.rows.length === 0) {
        console.log('🔍 SessionManager: Session not found or expired', { sessionId });
        return null;
      }
      
      const sessionData = result.rows[0].session_data as SessionState;
      
      // Update last activity
      await this.updateLastActivity(sessionId);
      
      console.log('✅ SessionManager: Retrieved session', { 
        sessionId, 
        userId: sessionData.currentUser.userId,
        isImpersonating: !!sessionData.impersonation?.isActive
      });
      
      return sessionData;
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to get session', error);
      return null;
    }
  }
  
  /**
   * Update session with new data
   */
  static async updateSession(
    sessionId: string, 
    updates: Partial<SessionState>
  ): Promise<void> {
    try {
      const current = await this.getSession(sessionId);
      if (!current) {
        throw new Error('Session not found');
      }
      
      const updated: SessionState = { 
        ...current, 
        ...updates, 
        lastActivity: new Date() 
      };
      
      await pool.query(`
        UPDATE user_sessions 
        SET session_data = $1, updated_at = NOW() 
        WHERE id = $2
      `, [JSON.stringify(updated), sessionId]);
      
      console.log('✅ SessionManager: Updated session', { 
        sessionId, 
        hasImpersonation: !!updated.impersonation?.isActive
      });
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to update session', error);
      throw new Error('Failed to update session');
    }
  }
  
  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
      console.log('✅ SessionManager: Deleted session', { sessionId });
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to delete session', error);
      throw new Error('Failed to delete session');
    }
  }
  
  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionState[]> {
    try {
      const result = await pool.query(`
        SELECT session_data FROM user_sessions 
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
      `, [userId]);
      
      return result.rows.map(row => row.session_data as SessionState);
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to get user sessions', error);
      return [];
    }
  }
  
  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await pool.query(`
        DELETE FROM user_sessions WHERE expires_at <= NOW()
      `);
      
      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log('🧹 SessionManager: Cleaned up expired sessions', { count: deletedCount });
      }
      
      return deletedCount;
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to cleanup sessions', error);
      return 0;
    }
  }
  
  /**
   * Update last activity timestamp
   */
  private static async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE user_sessions 
        SET session_data = jsonb_set(session_data, '{lastActivity}', $1, true)
        WHERE id = $2
      `, [JSON.stringify(new Date()), sessionId]);
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to update last activity', error);
      // Don't throw - this is not critical
    }
  }
  
  /**
   * Validate session and check for impersonation timeout
   */
  static async validateSession(sessionId: string): Promise<SessionState | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    // Check for impersonation timeout (2 hours)
    if (session.impersonation?.isActive) {
      const impersonationDuration = Date.now() - new Date(session.impersonation.startedAt).getTime();
      
      if (impersonationDuration > this.config.impersonationMaxDuration) {
        console.log('⚠️ SessionManager: Impersonation session expired', { 
          sessionId, 
          duration: Math.round(impersonationDuration / 1000 / 60) + ' minutes'
        });
        
        // Auto-end impersonation - this will be handled by ImpersonationService
        return session;
      }
    }
    
    return session;
  }
  
  /**
   * Get session statistics for monitoring
   */
  static async getSessionStats(): Promise<{
    total: number;
    active: number;
    impersonating: number;
    expired: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active,
          COUNT(CASE WHEN expires_at > NOW() AND session_data->>'impersonation' IS NOT NULL THEN 1 END) as impersonating,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired
        FROM user_sessions
      `);
      
      const stats = result.rows[0];
      return {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        impersonating: parseInt(stats.impersonating) || 0,
        expired: parseInt(stats.expired) || 0,
      };
      
    } catch (error) {
      console.error('❌ SessionManager: Failed to get stats', error);
      return { total: 0, active: 0, impersonating: 0, expired: 0 };
    }
  }
}