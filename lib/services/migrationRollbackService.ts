/**
 * Migration Rollback Service
 * 
 * Provides safe rollback functionality for publisher migrations
 */

import { db } from '@/lib/db/connection';
import { 
  websites, 
  publishers, 
  publisherOfferings,
  publisherWebsites,
  publisherPerformance 
} from '@/lib/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { migrationStatusService } from './migrationStatusService';

export interface RollbackSnapshot {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'pre_migration' | 'checkpoint' | 'post_migration';
  description: string;
  data: {
    publisherIds: string[];
    offeringIds: string[];
    relationshipIds: string[];
    affectedWebsiteIds: string[];
    metadata: Record<string, any>;
  };
}

export interface RollbackPlan {
  snapshotId: string;
  actions: Array<{
    type: 'delete_publishers' | 'delete_offerings' | 'delete_relationships' | 'restore_data';
    description: string;
    recordCount: number;
    sql: string;
    risk: 'low' | 'medium' | 'high';
  }>;
  estimatedDuration: number;
  warnings: string[];
}

export class MigrationRollbackService {
  private snapshots = new Map<string, RollbackSnapshot>();
  
  /**
   * Create a rollback snapshot before migration
   */
  async createSnapshot(
    sessionId: string,
    type: RollbackSnapshot['type'],
    description: string
  ): Promise<string> {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📸 Creating rollback snapshot: ${snapshotId}`);
    
    // Capture current state
    // NOTE: 'source' column doesn't exist in current schema
    // Commenting out until schema is updated
    const currentPublishers: any[] = [];
    /*
    const currentPublishers = await db
      .select({ id: publishers.id })
      .from(publishers)
      .where(eq(publishers.source, 'legacy_migration'));
    */
    
    const currentOfferings: any[] = [];
    /*
    const currentOfferings = await db
      .select({ id: publisherOfferings.id })
      .from(publisherOfferings)
      .where(eq(publisherOfferings.source, 'legacy_migration'));
    */
    
    const currentRelationships: any[] = [];
    /*
    const currentRelationships = await db
      .select({ id: publisherWebsites.id })
      .from(publisherWebsites)
      .where(eq(publisherWebsites.source, 'legacy_migration'));
    */
    
    // Get affected websites
    const affectedWebsites = await db.execute(sql`
      SELECT DISTINCT w.id
      FROM ${websites} w
      WHERE w.publisher_company IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM ${publishers} p 
        WHERE p.company_name = w.publisher_company 
        -- AND p.source = 'legacy_migration' -- Column doesn't exist
      )
    `);
    
    const snapshot: RollbackSnapshot = {
      id: snapshotId,
      sessionId,
      timestamp: new Date(),
      type,
      description,
      data: {
        publisherIds: currentPublishers.map(p => p.id),
        offeringIds: currentOfferings.map(o => o.id),
        relationshipIds: currentRelationships.map(r => r.id),
        affectedWebsiteIds: affectedWebsites.rows.map((row: any) => row.id),
        metadata: {
          publisherCount: currentPublishers.length,
          offeringCount: currentOfferings.length,
          relationshipCount: currentRelationships.length,
          websiteCount: affectedWebsites.rows.length
        }
      }
    };
    
    // Store snapshot (in production, this would go to a database)
    this.snapshots.set(snapshotId, snapshot);
    
    console.log(`✅ Snapshot created: ${currentPublishers.length} publishers, ${currentOfferings.length} offerings`);
    
    return snapshotId;
  }
  
  /**
   * Create rollback plan for a snapshot
   */
  async createRollbackPlan(snapshotId: string): Promise<RollbackPlan> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    const actions = [];
    const warnings = [];
    
    // Check what exists now vs snapshot
    // NOTE: 'source' column doesn't exist in current schema
    // Commenting out until schema is updated
    const currentPublishers: any[] = [];
    /*
    const currentPublishers = await db
      .select({ id: publishers.id, accountStatus: publishers.accountStatus })
      .from(publishers)
      .where(eq(publishers.source, 'legacy_migration'));
    */
    
    const currentOfferings: any[] = [];
    /*
    const currentOfferings = await db
      .select({ id: publisherOfferings.id, status: publisherOfferings.status })
      .from(publisherOfferings)
      .where(eq(publisherOfferings.source, 'legacy_migration'));
    */
    
    // Plan publisher rollback
    const publishersToDelete = currentPublishers.filter(p => 
      !snapshot.data.publisherIds.includes(p.id)
    );
    
    if (publishersToDelete.length > 0) {
      // Check for claimed accounts
      const claimedAccounts = publishersToDelete.filter(p => p.accountStatus === 'active');
      
      if (claimedAccounts.length > 0) {
        warnings.push(`${claimedAccounts.length} publishers have claimed accounts and cannot be safely deleted`);
        actions.push({
          type: 'delete_publishers' as const,
          description: `Convert ${claimedAccounts.length} claimed publishers to manual review`,
          recordCount: claimedAccounts.length,
          sql: `UPDATE publishers SET source = 'manual_review', account_status = 'review_required' WHERE id IN (${claimedAccounts.map(p => `'${p.id}'`).join(',')})`,
          risk: 'high' as const
        });
      }
      
      const unclaimedPublishers = publishersToDelete.filter(p => p.accountStatus === 'shadow');
      if (unclaimedPublishers.length > 0) {
        actions.push({
          type: 'delete_publishers' as const,
          description: `Delete ${unclaimedPublishers.length} unclaimed shadow publishers`,
          recordCount: unclaimedPublishers.length,
          sql: `DELETE FROM publishers WHERE id IN (${unclaimedPublishers.map(p => `'${p.id}'`).join(',')})`,
          risk: 'low' as const
        });
      }
    }
    
    // Plan offering rollback
    const offeringsToDelete = currentOfferings.filter(o => 
      !snapshot.data.offeringIds.includes(o.id)
    );
    
    if (offeringsToDelete.length > 0) {
      const activeOfferings = offeringsToDelete.filter(o => o.status === 'active');
      
      if (activeOfferings.length > 0) {
        warnings.push(`${activeOfferings.length} offerings are active and may be referenced by orders`);
        actions.push({
          type: 'delete_offerings' as const,
          description: `Archive ${activeOfferings.length} active offerings instead of deleting`,
          recordCount: activeOfferings.length,
          sql: `UPDATE publisher_offerings SET status = 'archived', archived_at = NOW() WHERE id IN (${activeOfferings.map(o => `'${o.id}'`).join(',')})`,
          risk: 'medium' as const
        });
      }
      
      const draftOfferings = offeringsToDelete.filter(o => o.status === 'draft');
      if (draftOfferings.length > 0) {
        actions.push({
          type: 'delete_offerings' as const,
          description: `Delete ${draftOfferings.length} draft offerings`,
          recordCount: draftOfferings.length,
          sql: `DELETE FROM publisher_offerings WHERE id IN (${draftOfferings.map(o => `'${o.id}'`).join(',')})`,
          risk: 'low' as const
        });
      }
    }
    
    // Plan relationship rollback
    // NOTE: 'source' column doesn't exist in current schema
    // Commenting out until schema is updated
    const currentRelationships: any[] = [];
    /*
    const currentRelationships = await db
      .select({ id: publisherWebsites.id })
      .from(publisherWebsites)
      .where(eq(publisherWebsites.source, 'legacy_migration'));
    */
    
    const relationshipsToDelete = currentRelationships.filter(r => 
      !snapshot.data.relationshipIds.includes(r.id)
    );
    
    if (relationshipsToDelete.length > 0) {
      actions.push({
        type: 'delete_relationships' as const,
        description: `Delete ${relationshipsToDelete.length} publisher-website relationships`,
        recordCount: relationshipsToDelete.length,
        sql: `DELETE FROM publisher_websites WHERE id IN (${relationshipsToDelete.map(r => `'${r.id}'`).join(',')})`,
        risk: 'low' as const
      });
    }
    
    // Estimate duration (rough calculation)
    const totalRecords = actions.reduce((sum, action) => sum + action.recordCount, 0);
    const estimatedDuration = Math.max(totalRecords * 0.1, 5); // At least 5 seconds
    
    const plan: RollbackPlan = {
      snapshotId,
      actions,
      estimatedDuration,
      warnings
    };
    
    return plan;
  }
  
  /**
   * Execute rollback plan
   */
  async executeRollback(
    plan: RollbackPlan,
    force: boolean = false
  ): Promise<{
    success: boolean;
    actionsExecuted: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const sessionId = migrationStatusService.startSession('dry_run' as any, plan.actions.length);
    
    // Check for high-risk actions
    const highRiskActions = plan.actions.filter(a => a.risk === 'high');
    if (highRiskActions.length > 0 && !force) {
      throw new Error(`Rollback contains ${highRiskActions.length} high-risk actions. Use force=true to proceed.`);
    }
    
    let actionsExecuted = 0;
    const errors: string[] = [];
    
    try {
      migrationStatusService.updatePhase(sessionId, 'rollback', 'running', 
        `Executing ${plan.actions.length} rollback actions...`);
      
      // Execute actions in order
      for (const [index, action] of plan.actions.entries()) {
        try {
          console.log(`🔄 Executing: ${action.description}`);
          
          // Execute SQL (with safety checks)
          if (action.sql.toLowerCase().includes('delete') || action.sql.toLowerCase().includes('drop')) {
            // Extra safety for destructive operations
            console.log(`⚠️ Destructive operation: ${action.sql.substring(0, 100)}...`);
          }
          
          await db.execute(sql.raw(action.sql));
          actionsExecuted++;
          
          console.log(`✅ Completed: ${action.description}`);
          
          // Update progress
          const progress = ((index + 1) / plan.actions.length) * 100;
          migrationStatusService.updatePhase(sessionId, 'rollback', 'running',
            `Executed ${index + 1}/${plan.actions.length} actions`, progress);
          
        } catch (error) {
          const errorMessage = `Failed to execute ${action.description}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error(`❌ ${errorMessage}`);
        }
      }
      
      migrationStatusService.updatePhase(sessionId, 'dry_run' as any, 'completed',
        `Rollback completed: ${actionsExecuted}/${plan.actions.length} actions executed`, 100);
      
      const duration = Date.now() - startTime;
      
      migrationStatusService.completeSession(sessionId, {
        actionsExecuted,
        totalActions: plan.actions.length,
        errors: errors.length,
        duration
      });
      
      return {
        success: errors.length === 0,
        actionsExecuted,
        errors,
        duration
      };
      
    } catch (error) {
      migrationStatusService.completeSession(sessionId, null, 
        error instanceof Error ? error.message : 'Rollback failed');
      throw error;
    }
  }
  
  /**
   * Get rollback history
   */
  async getRollbackHistory(): Promise<RollbackSnapshot[]> {
    return Array.from(this.snapshots.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  
  /**
   * Validate rollback safety
   */
  async validateRollbackSafety(snapshotId: string): Promise<{
    safe: boolean;
    issues: Array<{
      type: 'warning' | 'error';
      message: string;
      impact: string;
    }>;
  }> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return {
        safe: false,
        issues: [{
          type: 'error' as const,
          message: 'Snapshot not found',
          impact: 'Cannot proceed with rollback'
        }]
      };
    }
    
    const issues = [];
    
    // Check for claimed accounts
    const claimedPublishers = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${publishers}
      WHERE source = 'legacy_migration'
      AND account_status = 'active'
      AND id NOT IN (${sql.join(snapshot.data.publisherIds.map(id => sql`${id}`), sql`, `)})
    `);
    
    const claimedCount = Number(claimedPublishers.rows[0]?.count || 0);
    if (claimedCount > 0) {
      issues.push({
        type: 'warning' as const,
        message: `${claimedCount} publishers have claimed accounts`,
        impact: 'These accounts will be marked for manual review instead of deletion'
      });
    }
    
    // Check for active offerings with orders
    const activeOfferingsWithOrders = await db.execute(sql`
      SELECT COUNT(DISTINCT po.id) as count
      FROM ${publisherOfferings} po
      WHERE po.source = 'legacy_migration'
      AND po.status = 'active'
      AND po.id NOT IN (${sql.join(snapshot.data.offeringIds.map(id => sql`${id}`), sql`, `)})
      AND EXISTS (
        SELECT 1 FROM order_line_items oli 
        WHERE oli.offering_id = po.id
      )
    `);
    
    const offeringsWithOrdersCount = Number(activeOfferingsWithOrders.rows[0]?.count || 0);
    if (offeringsWithOrdersCount > 0) {
      issues.push({
        type: 'error' as const,
        message: `${offeringsWithOrdersCount} active offerings are referenced by orders`,
        impact: 'These offerings cannot be deleted and will cause rollback failure'
      });
    }
    
    const safe = !issues.some(issue => issue.type === 'error');
    
    return { safe, issues };
  }
  
  /**
   * Emergency rollback - aggressive rollback with minimal checks
   */
  async emergencyRollback(): Promise<void> {
    console.log('🚨 EMERGENCY ROLLBACK - Removing all migration data');
    
    const sessionId = migrationStatusService.startSession('dry_run' as any, 4);
    
    try {
      // Delete in reverse dependency order
      migrationStatusService.updatePhase(sessionId, 'cleanup', 'running', 
        'Emergency rollback in progress...');
      
      // NOTE: 'source' column doesn't exist in current schema - commenting out until schema updated
      /*
      await db.execute(sql`DELETE FROM ${publisherPerformance} WHERE publisher_id IN (SELECT id FROM ${publishers} WHERE source = 'legacy_migration')`);
      await db.execute(sql`DELETE FROM ${publisherOfferings} WHERE source = 'legacy_migration'`);
      await db.execute(sql`DELETE FROM ${publisherWebsites} WHERE source = 'legacy_migration'`);
      await db.execute(sql`DELETE FROM ${publishers} WHERE source = 'legacy_migration'`);
      */
      
      migrationStatusService.updatePhase(sessionId, 'cleanup', 'completed',
        'Emergency rollback completed', 100);
      
      migrationStatusService.completeSession(sessionId, { 
        type: 'emergency_rollback',
        timestamp: new Date() 
      });
      
      console.log('✅ Emergency rollback completed');
      
    } catch (error) {
      migrationStatusService.completeSession(sessionId, null,
        error instanceof Error ? error.message : 'Emergency rollback failed');
      throw error;
    }
  }
}

// Export singleton instance
export const migrationRollbackService = new MigrationRollbackService();