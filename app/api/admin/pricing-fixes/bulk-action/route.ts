import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '@/lib/db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';
import { parseAirtableCSV } from '@/lib/utils/csvParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Parse Airtable data
    const airtableRecords = parseAirtableCSV();
    const airtableMap = new Map(airtableRecords.map(r => [r.domain, r]));

    // Track results
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
      stats: {
        approved: 0,
        rejected: 0,
        errors: 0
      }
    };

    // Process each ID
    for (const websiteId of ids) {
      try {
        // Get website details
        const website = await db
          .select({
            id: websites.id,
            domain: websites.domain,
            guestPostCost: websites.guestPostCost
          })
          .from(websites)
          .where(eq(websites.id, websiteId))
          .limit(1);

        if (!website[0]) {
          results.failed.push({ id: websiteId, error: 'Website not found' });
          results.stats.errors++;
          continue;
        }

        const normalizedDomain = website[0].domain.toLowerCase().replace(/^www\./, '');
        const airtableData = airtableMap.get(normalizedDomain);

        if (action === 'approve') {
          // For now, just mark as approved in our tracking
          // In production, you'd update a status field or create an audit log
          console.log(`Approved fix for ${normalizedDomain}`);
          results.success.push(websiteId);
          results.stats.approved++;
        } else if (action === 'reject') {
          // Mark as rejected
          console.log(`Rejected fix for ${normalizedDomain}`);
          results.success.push(websiteId);
          results.stats.rejected++;
        }
      } catch (error) {
        console.error(`Error processing ${websiteId}:`, error);
        results.failed.push({ 
          id: websiteId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        results.stats.errors++;
      }
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      results
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}