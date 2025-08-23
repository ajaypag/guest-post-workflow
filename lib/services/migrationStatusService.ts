/**
 * Migration Status Tracking Service
 * 
 * Tracks the progress and status of publisher migration operations
 */

import { db } from '@/lib/db/connection';

interface MigrationStatusEntry {
  id: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  data?: any;
}

interface MigrationSession {
  id: string;
  type: 'full_migration' | 'dry_run' | 'validation' | 'invitations';
  status: 'pending' | 'running' | 'completed' | 'error';
  startedAt: Date;
  completedAt?: Date;
  totalSteps: number;
  completedSteps: number;
  currentPhase?: string;
  results?: any;
  error?: string;
}

class MigrationStatusService {
  private sessions = new Map<string, MigrationSession>();
  private statusEntries = new Map<string, MigrationStatusEntry[]>();

  /**
   * Start a new migration session
   */
  startSession(
    type: MigrationSession['type'], 
    totalSteps: number = 6
  ): string {
    const sessionId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: MigrationSession = {
      id: sessionId,
      type,
      status: 'running',
      startedAt: new Date(),
      totalSteps,
      completedSteps: 0
    };
    
    this.sessions.set(sessionId, session);
    this.statusEntries.set(sessionId, []);
    
    console.log(`📊 Started migration session: ${sessionId} (${type})`);
    return sessionId;
  }

  /**
   * Update session status
   */
  updateSession(
    sessionId: string,
    updates: Partial<MigrationSession>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    Object.assign(session, updates);
    this.sessions.set(sessionId, session);
    
    console.log(`📊 Updated session ${sessionId}:`, updates);
  }

  /**
   * Complete a migration session
   */
  completeSession(
    sessionId: string,
    results?: any,
    error?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    session.status = error ? 'error' : 'completed';
    session.completedAt = new Date();
    session.results = results;
    session.error = error;
    
    this.sessions.set(sessionId, session);
    
    console.log(`📊 Completed session ${sessionId}:`, {
      status: session.status,
      duration: session.completedAt.getTime() - session.startedAt.getTime(),
      error: error ? error.substring(0, 100) : null
    });
  }

  /**
   * Add a status entry for a specific phase
   */
  updatePhase(
    sessionId: string,
    phase: string,
    status: MigrationStatusEntry['status'],
    message?: string,
    progress: number = 0,
    data?: any
  ): void {
    const entries = this.statusEntries.get(sessionId) || [];
    const entryId = `${sessionId}_${phase}`;
    
    const entry: MigrationStatusEntry = {
      id: entryId,
      phase,
      status,
      message,
      progress,
      data,
      startedAt: status === 'running' ? new Date() : undefined,
      completedAt: status === 'completed' || status === 'error' ? new Date() : undefined
    };

    // Remove existing entry for this phase
    const filteredEntries = entries.filter(e => e.phase !== phase);
    filteredEntries.push(entry);
    
    this.statusEntries.set(sessionId, filteredEntries);
    
    // Update session current phase and progress
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentPhase = phase;
      
      // Calculate overall progress
      const completedPhases = filteredEntries.filter(e => e.status === 'completed').length;
      session.completedSteps = completedPhases;
    }
    
    console.log(`📊 Phase update [${sessionId}] ${phase}: ${status} (${progress}%)`);
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): MigrationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all status entries for a session
   */
  getSessionStatus(sessionId: string): MigrationStatusEntry[] {
    return this.statusEntries.get(sessionId) || [];
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): MigrationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running');
  }

  /**
   * Get recent sessions (last 24 hours)
   */
  getRecentSessions(hours: number = 24): MigrationSession[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.sessions.values()).filter(s => s.startedAt > cutoff);
  }

  /**
   * Clean up old sessions (older than 7 days)
   */
  cleanup(days: number = 7): void {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startedAt < cutoff) {
        this.sessions.delete(sessionId);
        this.statusEntries.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old migration sessions`);
    }
  }

  /**
   * Get comprehensive migration status
   */
  getOverallStatus(): {
    activeSessions: number;
    recentSessions: MigrationSession[];
    currentPhases: Array<{ sessionId: string; phase: string; progress: number }>;
    errors: Array<{ sessionId: string; error: string; timestamp: Date }>;
  } {
    const activeSessions = this.getActiveSessions();
    const recentSessions = this.getRecentSessions();
    
    const currentPhases = activeSessions.map(session => ({
      sessionId: session.id,
      phase: session.currentPhase || 'unknown',
      progress: (session.completedSteps / session.totalSteps) * 100
    }));
    
    const errors = recentSessions
      .filter(s => s.status === 'error')
      .map(s => ({
        sessionId: s.id,
        error: s.error || 'Unknown error',
        timestamp: s.completedAt || s.startedAt
      }));
    
    return {
      activeSessions: activeSessions.length,
      recentSessions,
      currentPhases,
      errors
    };
  }

  /**
   * Generate progress report for a session
   */
  generateProgressReport(sessionId: string): {
    session: MigrationSession | null;
    phases: Array<{
      phase: string;
      status: string;
      progress: number;
      duration?: number;
      message?: string;
    }>;
    overallProgress: number;
  } {
    const session = this.getSession(sessionId);
    const entries = this.getSessionStatus(sessionId);
    
    const phases = entries.map(entry => {
      let duration: number | undefined;
      if (entry.startedAt && entry.completedAt) {
        duration = entry.completedAt.getTime() - entry.startedAt.getTime();
      }
      
      return {
        phase: entry.phase,
        status: entry.status,
        progress: entry.progress,
        duration,
        message: entry.message
      };
    });
    
    const overallProgress = session 
      ? (session.completedSteps / session.totalSteps) * 100
      : 0;
    
    return {
      session,
      phases,
      overallProgress
    };
  }
}

// Export singleton instance
export const migrationStatusService = new MigrationStatusService();

// Auto-cleanup every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    migrationStatusService.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}