import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { normalizedDomain } = await request.json();
    
    if (!normalizedDomain) {
      return NextResponse.json(
        { success: false, error: 'Normalized domain is required' },
        { status: 400 }
      );
    }

    // Start a transaction for safe merging
    const result = await db.transaction(async (tx) => {
      // Find all websites with this normalized domain
      const duplicates = await tx.execute(sql`
        SELECT id, domain, domain_rating, total_traffic, created_at,
               (SELECT COUNT(*) FROM publisher_offering_relationships WHERE website_id = w.id) as relationship_count
        FROM websites w
        WHERE normalized_domain = ${normalizedDomain}
        ORDER BY 
          domain_rating DESC NULLS LAST,
          total_traffic DESC NULLS LAST,
          relationship_count DESC,
          created_at ASC
      `);

      if (duplicates.rows.length <= 1) {
        return { success: false, error: 'No duplicates found for this domain' };
      }

      // The first one is the keeper (best data)
      const keeper = duplicates.rows[0] as any;
      const toMerge = duplicates.rows.slice(1) as any[];
      const mergeIds = toMerge.map((w: any) => w.id);

      // Update publisher relationships to point to keeper
      const relationshipUpdate = await tx.execute(sql`
        UPDATE publisher_offering_relationships
        SET website_id = ${keeper.id}
        WHERE website_id = ANY(${mergeIds}::uuid[])
        AND NOT EXISTS (
          SELECT 1 FROM publisher_offering_relationships por2
          WHERE por2.website_id = ${keeper.id}
          AND por2.publisher_id = publisher_offering_relationships.publisher_id
        )
      `);

      // Log the merge
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS website_merge_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          normalized_domain VARCHAR(255),
          keeper_id UUID,
          merged_ids UUID[],
          merge_date TIMESTAMP DEFAULT NOW()
        )
      `);

      await tx.execute(sql`
        INSERT INTO website_merge_log (normalized_domain, keeper_id, merged_ids)
        VALUES (${normalizedDomain}, ${keeper.id}, ${mergeIds}::uuid[])
      `);

      // Soft delete the duplicates by renaming them
      const deleteResult = await tx.execute(sql`
        UPDATE websites
        SET 
          domain = domain || '_MERGED_' || substring(id::text from 1 for 8),
          normalized_domain = normalized_domain || '_MERGED_' || substring(id::text from 1 for 8)
        WHERE id = ANY(${mergeIds}::uuid[])
      `);

      return {
        success: true,
        keeperId: keeper.id,
        mergedCount: toMerge.length,
        relationshipsUpdated: relationshipUpdate.rowCount
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json(
      { success: false, error: `Merge failed: ${error}` },
      { status: 500 }
    );
  }
}