/**
 * Impersonation Service - Proper Architecture
 * 
 * Core service for managing admin user impersonation with proper security,
 * audit logging, and session state management.
 */

import { getSessionPool } from '@/lib/db/sessionPool';
import { SessionManager } from './sessionManager';
import { SessionState, ImpersonationLog, ActionLog } from '@/lib/types/session';

// Get shared pool instance
const pool = getSessionPool();

export class ImpersonationService {
  
  /**
   * Check if an admin user can impersonate a target user
   */
  static async canImpersonate(
    adminSession: SessionState, 
    targetUserId: string
  ): Promise<boolean> {
    // Check admin permissions
    if (adminSession.currentUser.userType !== 'internal' || 
        adminSession.currentUser.role !== 'admin') {
      console.log('❌ Impersonation denied: Not an internal admin user');
      return false;
    }
    
    // Check if already impersonating
    if (adminSession.impersonation?.isActive) {
      console.log('❌ Impersonation denied: Already impersonating another user');
      return false;
    }
    
    // Check target user exists and is valid type
    const targetUser = await this.getTargetUser(targetUserId);
    if (!targetUser) {
      console.log('❌ Impersonation denied: Target user not found');
      return false;
    }
    
    if (!['account', 'publisher'].includes(targetUser.userType)) {
      console.log('❌ Impersonation denied: Invalid target user type', { userType: targetUser.userType });
      return false;
    }
    
    console.log('✅ Impersonation allowed', { 
      adminId: adminSession.currentUser.userId,
      targetId: targetUserId,
      targetType: targetUser.userType
    });
    
    return true;
  }
  
  /**
   * Start impersonation session
   */
  static async startImpersonation(
    adminSessionId: string,
    targetUserId: string,
    reason: string
  ): Promise<ImpersonationLog> {
    const adminSession = await SessionManager.getSession(adminSessionId);
    if (!adminSession) {
      throw new Error('Admin session not found');
    }
    
    const canImpersonate = await this.canImpersonate(adminSession, targetUserId);
    if (!canImpersonate) {
      throw new Error('Cannot impersonate this user');
    }
    
    const targetUser = await this.getTargetUser(targetUserId);
    if (!targetUser) {
      throw new Error('Target user not found');
    }
    
    try {
      // Create impersonation log
      const logResult = await pool.query(`
        INSERT INTO impersonation_logs 
        (session_id, admin_user_id, target_user_id, target_user_type, reason, status, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        RETURNING id, started_at
      `, [
        adminSessionId, 
        adminSession.currentUser.userId, 
        targetUserId, 
        targetUser.userType, 
        reason,
        adminSession.ipAddress,
        adminSession.userAgent
      ]);
      
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
            '/api/payments/process/*',
            '/api/account/delete',
            '/api/stripe/*',
            '/api/admin/*', // Prevent admin actions during impersonation
          ],
        },
      };
      
      await SessionManager.updateSession(adminSessionId, updatedSession);
      
      console.log('✅ Impersonation started', {
        logId: log.id,
        adminId: adminSession.currentUser.userId,
        targetId: targetUserId,
        reason: reason.substring(0, 50) + '...'
      });
      
      return {
        id: log.id,
        sessionId: adminSessionId,
        adminUserId: adminSession.currentUser.userId,
        targetUserId,
        targetUserType: targetUser.userType,
        startedAt: new Date(log.started_at),
        reason,
        status: 'active',
        ipAddress: adminSession.ipAddress,
        userAgent: adminSession.userAgent,
        actionsCount: 0,
        createdAt: new Date(log.started_at),
        updatedAt: new Date(log.started_at),
      };
      
    } catch (error) {
      console.error('❌ Failed to start impersonation', error);
      throw new Error('Failed to start impersonation: ' + (error as Error).message);
    }
  }
  
  /**
   * End impersonation session
   */
  static async endImpersonation(sessionId: string): Promise<void> {
    const session = await SessionManager.getSession(sessionId);
    if (!session?.impersonation?.isActive) {
      throw new Error('No active impersonation found');
    }
    
    try {
      // Update log status
      await pool.query(`
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
        impersonation: undefined, // Explicitly clear impersonation data
      };
      
      await SessionManager.updateSession(sessionId, restoredSession);
      
      console.log('✅ Impersonation ended', {
        logId: session.impersonation.logId,
        sessionId,
        adminId: session.impersonation.adminUser.userId
      });
      
    } catch (error) {
      console.error('❌ Failed to end impersonation', error);
      throw new Error('Failed to end impersonation: ' + (error as Error).message);
    }
  }
  
  /**
   * Log an action performed during impersonation
   */
  static async logAction(logId: string, action: Omit<ActionLog, 'id' | 'logId'>): Promise<void> {
    try {
      await pool.query(`
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
      await pool.query(`
        UPDATE impersonation_logs 
        SET actions_count = actions_count + 1 
        WHERE id = $1
      `, [logId]);
      
    } catch (error) {
      console.error('❌ Failed to log impersonation action', error);
      // Don't throw - action logging shouldn't break the main request
    }
  }
  
  /**
   * Get all active impersonation sessions
   */
  static async getActiveSessions(): Promise<ImpersonationLog[]> {
    try {
      const result = await pool.query(`
        SELECT 
          l.*,
          a.email as admin_email,
          a.name as admin_name,
          CASE 
            WHEN l.target_user_type = 'account' THEN ac.contact_name
            WHEN l.target_user_type = 'publisher' THEN COALESCE(p.first_name || ' ' || p.last_name, p.company_name)
          END as target_name,
          CASE 
            WHEN l.target_user_type = 'account' THEN ac.email
            WHEN l.target_user_type = 'publisher' THEN p.email
          END as target_email
        FROM impersonation_logs l
        JOIN users a ON l.admin_user_id = a.id
        LEFT JOIN accounts ac ON l.target_user_id = ac.id AND l.target_user_type = 'account'
        LEFT JOIN publishers p ON l.target_user_id = p.id AND l.target_user_type = 'publisher'
        WHERE l.status = 'active' 
        ORDER BY l.started_at DESC
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
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        actionsCount: row.actions_count,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
      
    } catch (error) {
      console.error('❌ Failed to get active sessions', error);
      return [];
    }
  }
  
  /**
   * Get recent impersonation logs for an admin
   */
  static async getRecentLogs(adminUserId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          l.*,
          CASE 
            WHEN l.target_user_type = 'account' THEN ac.contact_name
            WHEN l.target_user_type = 'publisher' THEN COALESCE(p.first_name || ' ' || p.last_name, p.company_name)
          END as target_name,
          CASE 
            WHEN l.target_user_type = 'account' THEN ac.email
            WHEN l.target_user_type = 'publisher' THEN p.email
          END as target_email
        FROM impersonation_logs l
        LEFT JOIN accounts ac ON l.target_user_id = ac.id AND l.target_user_type = 'account'
        LEFT JOIN publishers p ON l.target_user_id = p.id AND l.target_user_type = 'publisher'
        WHERE l.admin_user_id = $1
        ORDER BY l.started_at DESC 
        LIMIT $2
      `, [adminUserId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        target_name: row.target_name || 'Unknown User',
        target_email: row.target_email || 'unknown@example.com',
        target_user_type: row.target_user_type,
        started_at: row.started_at,
        ended_at: row.ended_at,
        reason: row.reason,
        status: row.status,
        actions_count: row.actions_count,
      }));
      
    } catch (error) {
      console.error('❌ Failed to get recent logs', error);
      return [];
    }
  }
  
  /**
   * Get target user information (account or publisher)
   */
  private static async getTargetUser(userId: string): Promise<any | null> {
    try {
      // Try accounts table first
      const accountResult = await pool.query(`
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
      
      // Try publishers table (allow both active and pending publishers)
      const publisherResult = await pool.query(`
        SELECT id, email, 
               COALESCE(contact_name, company_name, 'Publisher User') as name,
               'publisher' as user_type, id as publisher_id, company_name, status
        FROM publishers WHERE id = $1 AND status IN ('active', 'pending')
      `, [userId]);
      
      if (publisherResult.rows.length > 0) {
        return {
          ...publisherResult.rows[0],
          userType: 'publisher'
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to get target user', error);
      return null;
    }
  }
  
  /**
   * Check if an action is restricted during impersonation
   */
  static isActionRestricted(session: SessionState, endpoint: string): boolean {
    if (!session.impersonation?.isActive) {
      return false; // Not impersonating, allow all actions
    }
    
    const restrictedActions = session.impersonation.restrictedActions || [];
    
    return restrictedActions.some(pattern => {
      // Convert wildcard patterns to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(endpoint);
    });
  }
}