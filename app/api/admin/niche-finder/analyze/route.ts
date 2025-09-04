import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { eq, inArray, sql } from 'drizzle-orm';
import { analyzeWebsiteEnhanced } from '@/lib/services/nicheAnalyzer';
import { websites } from '@/lib/db/websiteSchema';
import { niches, suggestedTags } from '@/lib/db/nichesSchema';
import { extractO3Output, validateO3Analysis } from '@/lib/utils/o3ResponseParser';

export async function POST(request: NextRequest) {
  // Check authentication - internal users only
  const authCheck = await requireInternalUser(request);
  if (authCheck instanceof NextResponse) {
    return authCheck;
  }

  const { websiteIds, currentNiches, currentCategories } = await request.json();

  if (!websiteIds || !Array.isArray(websiteIds) || websiteIds.length === 0) {
    return NextResponse.json({ error: 'No websites provided' }, { status: 400 });
  }

  const errors = [];
  const processed = [];

  try {
    // Get website details using Drizzle ORM
    const websitesResult = await db
      .select({
        id: websites.id,
        domain: websites.domain
      })
      .from(websites)
      .where(inArray(websites.id, websiteIds));
    
    // Note: Drizzle returns array directly, no need for .rows
    const websitesList = websitesResult;

    // Process each website
    for (const website of websitesList) {
      try {
        console.log(`🔍 Analyzing: ${website.domain}`);
        
        // Use enhanced analyzer that can suggest new niches
        const analysis = await analyzeWebsiteEnhanced(
          website.domain, 
          currentNiches, 
          currentCategories
        );

        console.log(`✅ Analysis result for ${website.domain}:`, JSON.stringify(analysis, null, 2));

        // Combine existing niches with suggested new niches
        const allNiches = [...analysis.niches];
        if (analysis.suggestedNewNiches && analysis.suggestedNewNiches.length > 0) {
          allNiches.push(...analysis.suggestedNewNiches);
        }
        
        // Combine existing categories with suggested new categories  
        const allCategories = [...analysis.categories];
        if (analysis.suggestedNewCategories && analysis.suggestedNewCategories.length > 0) {
          allCategories.push(...analysis.suggestedNewCategories);
        }

        // Update website with analysis results using Drizzle ORM
        await db
          .update(websites)
          .set({
            niche: allNiches,
            categories: allCategories,
            websiteType: analysis.websiteTypes || [],
            lastNicheCheck: new Date(),
            suggestedNiches: analysis.suggestedNewNiches || [],
            suggestedCategories: analysis.suggestedNewCategories || []
          })
          .where(eq(websites.id, website.id));

        // Track suggested new niches globally and add to niches table
        if (analysis.suggestedNewNiches && analysis.suggestedNewNiches.length > 0) {
          for (const newNiche of analysis.suggestedNewNiches) {
            // Add to main niches table if not exists
            await addNicheIfNotExists(newNiche);
            // Track in suggested tags for approval workflow
            await trackSuggestedTag(newNiche, 'niche', website.domain);
          }
        }

        // Track suggested new categories globally
        if (analysis.suggestedNewCategories && analysis.suggestedNewCategories.length > 0) {
          for (const newCategory of analysis.suggestedNewCategories) {
            await trackSuggestedTag(newCategory, 'category', website.domain);
          }
        }

        processed.push({
          domain: website.domain,
          niches: analysis.niches,
          categories: analysis.categories,
          suggestedNewNiches: analysis.suggestedNewNiches,
          suggestedNewCategories: analysis.suggestedNewCategories
        });

        console.log(`✅ Analyzed ${website.domain}: ${analysis.niches.join(', ')}`);
      } catch (error: any) {
        console.error(`❌ Failed to analyze ${website.domain}:`, error);
        errors.push(`${website.domain}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      { error: 'Batch analysis failed' },
      { status: 500 }
    );
  }
}

async function addNicheIfNotExists(nicheName: string) {
  try {
    // Check if niche already exists (case-insensitive)
    const existing = await db
      .select()
      .from(niches)
      .where(sql`LOWER(${niches.name}) = LOWER(${nicheName})`)
      .limit(1);
    
    if (existing.length === 0) {
      // Insert new niche using Drizzle
      await db
        .insert(niches)
        .values({
          name: nicheName,
          source: 'o3_suggested'
        })
        .onConflictDoNothing();
      
      console.log(`✅ Added new niche to niches table: ${nicheName}`);
    }
  } catch (error) {
    console.error(`Failed to add niche ${nicheName}:`, error);
  }
}

async function trackSuggestedTag(tagName: string, tagType: string, exampleDomain: string) {
  try {
    // Check if tag already exists using Drizzle
    const existing = await db
      .select({
        id: suggestedTags.id,
        websiteCount: suggestedTags.websiteCount,
        exampleWebsites: suggestedTags.exampleWebsites
      })
      .from(suggestedTags)
      .where(
        sql`${suggestedTags.tagName} = ${tagName} AND ${suggestedTags.tagType} = ${tagType}`
      )
      .limit(1);

    if (existing.length > 0) {
      // Update count and add example
      const currentTag = existing[0];
      const currentExamples = currentTag.exampleWebsites || [];
      if (!currentExamples.includes(exampleDomain) && currentExamples.length < 10) {
        currentExamples.push(exampleDomain);
      }

      await db
        .update(suggestedTags)
        .set({
          websiteCount: sql`${suggestedTags.websiteCount} + 1`,
          exampleWebsites: currentExamples,
          updatedAt: new Date()
        })
        .where(eq(suggestedTags.id, currentTag.id));
    } else {
      // Insert new suggested tag using Drizzle
      await db
        .insert(suggestedTags)
        .values({
          tagName: tagName,
          tagType: tagType,
          websiteCount: 1,
          exampleWebsites: [exampleDomain]
        });
    }
  } catch (error) {
    console.error(`Failed to track suggested tag ${tagName}:`, error);
  }
}