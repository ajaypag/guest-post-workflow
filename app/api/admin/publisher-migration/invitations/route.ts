import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { ShadowPublisherInvitationService } from '@/lib/services/shadowPublisherInvitationService';

/**
 * POST /api/admin/publisher-migration/invitations
 * 
 * Sends bulk invitations to shadow publishers
 * 
 * Request body:
 * - publisherIds: string[] - Optional specific publisher IDs to invite
 * - batchSize: number - Optional batch size (default: 50)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { publisherIds, batchSize = 50 } = body;
    
    console.log('📧 Starting bulk invitation sending...');
    console.log(`📧 Batch size: ${batchSize}`);
    
    // Send invitations with batch size limit
    const shadowPublisherInvitationService = new ShadowPublisherInvitationService();
    const results = await shadowPublisherInvitationService.sendBulkInvitations(
      publisherIds, // Pass undefined if not provided, service will handle it
      'legacy_migration',
      batchSize
    );
    
    console.log(`✅ Invitation sending complete:`, {
      sent: results.sent,
      failed: results.failed,
      totalEligible: results.totalEligible,
      errors: results.errors?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      totalEligible: results.totalEligible,
      errors: results.errors,
      message: `Successfully sent ${results.sent} invitations${results.totalEligible ? ` (${results.totalEligible} total eligible)` : ''}`
    });
    
  } catch (error) {
    console.error('❌ Failed to send invitations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send invitations', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/publisher-migration/invitations
 * 
 * Get invitation statistics and status
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await db.execute(`
      SELECT 
        COUNT(*) as total_publishers,
        COUNT(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 END) as invitations_sent,
        COUNT(CASE WHEN claimed_at IS NOT NULL THEN 1 END) as accounts_claimed,
        COUNT(CASE WHEN invitation_sent_at IS NULL AND account_status = 'shadow' THEN 1 END) as pending_invitations
      FROM publishers
      WHERE account_status IN ('shadow', 'active')
    `);
    
    const row = stats.rows[0] as any;
    
    return NextResponse.json({
      totalPublishers: Number(row.total_publishers || 0),
      invitationsSent: Number(row.invitations_sent || 0),
      accountsClaimed: Number(row.accounts_claimed || 0),
      pendingInvitations: Number(row.pending_invitations || 0),
      claimRate: row.invitations_sent > 0 
        ? ((row.accounts_claimed / row.invitations_sent) * 100).toFixed(1)
        : '0'
    });
    
  } catch (error) {
    console.error('Failed to fetch invitation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation statistics' },
      { status: 500 }
    );
  }
}