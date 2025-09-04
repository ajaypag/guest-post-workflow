import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  const { niche, type } = await request.json();

  if (!niche || !type) {
    return NextResponse.json({ error: 'Missing niche or type' }, { status: 400 });
  }

  try {
    // Mark the suggested tag as approved
    const approveQuery = sql.raw(`
      UPDATE suggested_tags
      SET 
        approved = true,
        approved_at = NOW(),
        approved_by = NULL
      WHERE tag_name = '${niche.replace(/'/g, "''")}' AND tag_type = '${type}'
    `);

    await db.execute(approveQuery);

    // Note: The actual addition of the niche/category to the main list
    // happens dynamically through the websiteMetadataService which pulls
    // all unique values from the database. So we just need to update
    // some websites to use this new niche/category

    // Find websites that had suggested this niche/category
    let updateField = '';
    let suggestedField = '';
    
    if (type === 'niche') {
      updateField = 'niche';
      suggestedField = 'suggested_niches';
    } else if (type === 'category') {
      updateField = 'categories';
      suggestedField = 'suggested_categories';
    }

    if (updateField) {
      // Update websites that suggested this tag to include it in their main list
      const escapedNiche = niche.replace(/'/g, "''");
      const updateWebsitesQuery = sql.raw(`
        UPDATE websites
        SET ${updateField} = 
          CASE 
            WHEN ${updateField} IS NULL THEN ARRAY['${escapedNiche}']
            WHEN NOT '${escapedNiche}' = ANY(${updateField}) THEN array_append(${updateField}, '${escapedNiche}')
            ELSE ${updateField}
          END,
          ${suggestedField} = array_remove(${suggestedField}, '${escapedNiche}')
        WHERE '${escapedNiche}' = ANY(${suggestedField})
      `);

      await db.execute(updateWebsitesQuery);
    }

    return NextResponse.json({ 
      success: true,
      message: `${type} "${niche}" has been approved and added to the main list`
    });
  } catch (error) {
    console.error('Error approving niche:', error);
    return NextResponse.json(
      { error: 'Failed to approve niche' },
      { status: 500 }
    );
  }
}