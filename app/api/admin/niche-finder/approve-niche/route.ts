import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { websites } from '@/lib/db/websiteSchema';
import { suggestedTags } from '@/lib/db/nichesSchema';

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
    // Mark the suggested tag as approved using Drizzle ORM
    await db
      .update(suggestedTags)
      .set({
        approved: true,
        approvedAt: new Date(),
        approvedBy: null
      })
      .where(
        and(
          eq(suggestedTags.tagName, niche),
          eq(suggestedTags.tagType, type)
        )
      );

    // Update websites that suggested this tag to include it in their main list
    if (type === 'niche') {
      // For niche field: add to niche array and remove from suggestedNiches array
      await db
        .update(websites)
        .set({
          niche: sql`
            CASE 
              WHEN ${websites.niche} IS NULL THEN ARRAY[${niche}]
              WHEN NOT ${niche} = ANY(${websites.niche}) THEN array_append(${websites.niche}, ${niche})
              ELSE ${websites.niche}
            END`,
          suggestedNiches: sql`array_remove(${websites.suggestedNiches}, ${niche})`
        })
        .where(sql`${niche} = ANY(${websites.suggestedNiches})`);

    } else if (type === 'category') {
      // For categories field: add to categories array and remove from suggestedCategories array
      await db
        .update(websites)
        .set({
          categories: sql`
            CASE 
              WHEN ${websites.categories} IS NULL THEN ARRAY[${niche}]
              WHEN NOT ${niche} = ANY(${websites.categories}) THEN array_append(${websites.categories}, ${niche})
              ELSE ${websites.categories}
            END`,
          suggestedCategories: sql`array_remove(${websites.suggestedCategories}, ${niche})`
        })
        .where(sql`${niche} = ANY(${websites.suggestedCategories})`);
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