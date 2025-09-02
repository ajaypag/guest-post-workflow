import { NextRequest } from 'next/server';
import { db } from '@/lib/db/connection';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/schema';
import { sql, eq, isNull, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Skip auth for this diagnostic endpoint
  console.log('🔍 Starting orphaned offerings analysis...');
  try {
    console.log('🔍 Analyzing orphaned offerings (no website relationships)...');

    // Count total offerings
    const totalOfferings = await db.select({ count: count() }).from(publisherOfferings);
    const total = totalOfferings[0].count;

    // Count offerings WITH relationships
    const offeringsWithWebsites = await db
      .select({ count: count() })
      .from(publisherOfferings)
      .innerJoin(publisherOfferingRelationships, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId));
    
    const withWebsites = offeringsWithWebsites[0].count;

    // Count offerings WITHOUT relationships
    const orphanedOfferings = await db
      .select({ count: count() })
      .from(publisherOfferings)
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
      .where(isNull(publisherOfferingRelationships.offeringId));

    const orphaned = orphanedOfferings[0].count;
    const orphanedPercentage = ((orphaned / total) * 100).toFixed(1);

    // Publishers with orphaned offerings
    const publishersWithOrphaned = await db
      .select({
        publisherId: publisherOfferings.publisherId,
        companyName: publishers.companyName,
        email: publishers.email,
        orphanedCount: count(),
      })
      .from(publisherOfferings)
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
      .leftJoin(publishers, eq(publisherOfferings.publisherId, publishers.id))
      .where(isNull(publisherOfferingRelationships.offeringId))
      .groupBy(publisherOfferings.publisherId, publishers.companyName, publishers.email)
      .orderBy(sql`count(*) DESC`);

    // Sample orphaned offerings details
    const sampleOrphaned = await db
      .select({
        id: publisherOfferings.id,
        publisherId: publisherOfferings.publisherId,
        companyName: publishers.companyName,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        createdAt: publisherOfferings.createdAt
      })
      .from(publisherOfferings)
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
      .leftJoin(publishers, eq(publisherOfferings.publisherId, publishers.id))
      .where(isNull(publisherOfferingRelationships.offeringId))
      .limit(20);

    const analysis = {
      summary: {
        totalOfferings: total,
        offeringsWithWebsites: withWebsites,
        orphanedOfferings: orphaned,
        orphanedPercentage: `${orphanedPercentage}%`
      },
      publishersAffected: publishersWithOrphaned.length,
      publishersWithOrphaned: publishersWithOrphaned.map(p => ({
        company: p.companyName || 'Unknown',
        email: p.email,
        orphanedCount: p.orphanedCount,
        publisherId: p.publisherId
      })),
      sampleOrphanedOfferings: sampleOrphaned.map(o => ({
        company: o.companyName || 'Unknown',
        offeringType: o.offeringType,
        price: o.basePrice ? `${(o.basePrice/100).toFixed(2)} ${o.currency}` : 'N/A',
        created: o.createdAt?.toISOString().split('T')[0],
        offeringId: o.id,
        publisherId: o.publisherId
      }))
    };

    return Response.json(analysis);

  } catch (error) {
    console.error('Error analyzing orphaned offerings:', error);
    return Response.json({ error: 'Failed to analyze orphaned offerings' }, { status: 500 });
  }
}