import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { orders } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { orderSiteSubmissions } from '@/lib/db/projectOrderAssociationsSchema';
import { eq, and } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    
    // Check auth - must be internal user
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get order groups separately
    const orderGroupsList = await db.query.orderGroups.findMany({
      where: eq(orderGroups.orderId, orderId)
    });

    let migratedCount = 0;
    const errors: string[] = [];

    // Process each order group
    for (const group of orderGroupsList) {
      try {
        // Count how many times each target URL appears
        const targetUrlCounts = new Map<string, number>();
        
        if (group.targetPages && Array.isArray(group.targetPages)) {
          (group.targetPages as any[]).forEach(page => {
            const url = page.url;
            if (url) {
              targetUrlCounts.set(url, (targetUrlCounts.get(url) || 0) + 1);
            }
          });
        }

        // Get all submissions for this group
        const submissions = await db.query.orderSiteSubmissions.findMany({
          where: eq(orderSiteSubmissions.orderGroupId, group.id),
          orderBy: [
            // Prioritize client approved first
            sql`CASE WHEN submission_status = 'client_approved' THEN 0 ELSE 1 END`,
            // Then by creation date
            sql`created_at ASC`
          ]
        });

        // Group submissions by target URL
        const submissionsByUrl = new Map<string, typeof submissions>();
        submissions.forEach(sub => {
          const url = sub.metadata?.targetPageUrl || 'unassigned';
          if (!submissionsByUrl.has(url)) {
            submissionsByUrl.set(url, []);
          }
          submissionsByUrl.get(url)!.push(sub);
        });

        // Update each URL group
        for (const [url, urlSubmissions] of submissionsByUrl) {
          const requiredCount = targetUrlCounts.get(url) || 0;
          
          // Sort to ensure client_approved come first
          urlSubmissions.sort((a, b) => {
            if (a.submissionStatus === 'client_approved' && b.submissionStatus !== 'client_approved') return -1;
            if (a.submissionStatus !== 'client_approved' && b.submissionStatus === 'client_approved') return 1;
            return 0;
          });

          // Update pool assignments
          for (let i = 0; i < urlSubmissions.length; i++) {
            const submission = urlSubmissions[i];
            const isWithinRequiredCount = i < requiredCount;
            
            // Reset status to pending for primary pool (unless client already approved)
            const newStatus = submission.submissionStatus === 'client_approved' 
              ? 'client_approved' 
              : (isWithinRequiredCount ? 'pending' : submission.submissionStatus || 'pending');
            
            await db
              .update(orderSiteSubmissions)
              .set({
                selectionPool: isWithinRequiredCount ? 'primary' : 'alternative',
                poolRank: isWithinRequiredCount ? i + 1 : i - requiredCount + 1,
                submissionStatus: newStatus,
                updatedAt: new Date()
              })
              .where(eq(orderSiteSubmissions.id, submission.id));
            
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing group ${group.id}:`, error);
        errors.push(`Group ${group.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({ 
      success: true,
      migratedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Pool assignments rebalanced. ${migratedCount} domains updated.`
    });

  } catch (error) {
    console.error('Error rebalancing pools:', error);
    return NextResponse.json(
      { error: 'Failed to rebalance pools' },
      { status: 500 }
    );
  }
}