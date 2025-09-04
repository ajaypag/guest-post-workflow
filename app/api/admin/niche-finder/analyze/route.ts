import { NextRequest, NextResponse } from 'next/server';
import { requireInternalUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { analyzeWebsiteEnhanced } from '@/lib/services/nicheAnalyzer';

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
    // Get website details
    const websitesQuery = sql.raw(`
      SELECT id, domain
      FROM websites
      WHERE id = ANY(ARRAY[${websiteIds.map(id => `'${id}'`).join(',')}]::uuid[])
    `);

    const websitesResult = await db.execute(websitesQuery);
    const websites = (websitesResult as any).rows || [];

    // Process each website
    for (const website of websites) {
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

        // Update website with analysis results
        const nichesArray = allNiches.length > 0 
          ? `ARRAY[${allNiches.map(n => `'${n.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
          : `'{}'::TEXT[]`;
        const categoriesArray = allCategories.length > 0
          ? `ARRAY[${allCategories.map(c => `'${c.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
          : `'{}'::TEXT[]`;
        const websiteTypesArray = analysis.websiteTypes.length > 0
          ? `ARRAY[${analysis.websiteTypes.map(w => `'${w.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
          : `'{}'::TEXT[]`;
        const suggestedNichesArray = (analysis.suggestedNewNiches && analysis.suggestedNewNiches.length > 0)
          ? `ARRAY[${analysis.suggestedNewNiches.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
          : `'{}'::TEXT[]`;
        const suggestedCategoriesArray = (analysis.suggestedNewCategories && analysis.suggestedNewCategories.length > 0)
          ? `ARRAY[${analysis.suggestedNewCategories.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}]::TEXT[]`
          : `'{}'::TEXT[]`;

        const updateQuery = sql.raw(`
          UPDATE websites
          SET 
            niche = ${nichesArray},
            categories = ${categoriesArray},
            website_type = ${websiteTypesArray},
            last_niche_check = NOW(),
            suggested_niches = ${suggestedNichesArray},
            suggested_categories = ${suggestedCategoriesArray}
          WHERE id = '${website.id}'
        `);

        await db.execute(updateQuery);

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
    // Check if niche already exists
    const existingQuery = sql.raw(`
      SELECT id FROM niches WHERE LOWER(name) = LOWER('${nicheName.replace(/'/g, "''")}')
    `);
    
    const existingResult = await db.execute(existingQuery);
    
    if (existingResult.rows.length === 0) {
      // Insert new niche
      const insertQuery = sql.raw(`
        INSERT INTO niches (name, source, created_at, updated_at)
        VALUES ('${nicheName.replace(/'/g, "''")}', 'o3_suggested', NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
      `);
      
      await db.execute(insertQuery);
      console.log(`✅ Added new niche to niches table: ${nicheName}`);
    }
  } catch (error) {
    console.error(`Failed to add niche ${nicheName}:`, error);
  }
}

async function trackSuggestedTag(tagName: string, tagType: string, exampleDomain: string) {
  try {
    // Check if tag already exists
    const existingQuery = sql.raw(`
      SELECT id, website_count, example_websites
      FROM suggested_tags
      WHERE tag_name = '${tagName.replace(/'/g, "''")}' AND tag_type = '${tagType}'
    `);

    const existingResult = await db.execute(existingQuery);
    const existing = (existingResult as any).rows[0];

    if (existing) {
      // Update count and add example
      const currentExamples = existing.example_websites || [];
      if (!currentExamples.includes(exampleDomain) && currentExamples.length < 10) {
        currentExamples.push(exampleDomain);
      }

      const updateQuery = sql.raw(`
        UPDATE suggested_tags
        SET 
          website_count = website_count + 1,
          example_websites = ARRAY[${currentExamples.map((e: string) => `'${e}'`).join(',')}]::TEXT[],
          updated_at = NOW()
        WHERE id = '${existing.id}'
      `);

      await db.execute(updateQuery);
    } else {
      // Insert new suggested tag
      const insertQuery = sql.raw(`
        INSERT INTO suggested_tags (
          tag_name, 
          tag_type, 
          website_count,
          example_websites,
          first_suggested_at
        ) VALUES ('${tagName.replace(/'/g, "''")}', '${tagType}', 1, ARRAY['${exampleDomain}']::TEXT[], NOW())
      `);

      await db.execute(insertQuery);
    }
  } catch (error) {
    console.error(`Failed to track suggested tag ${tagName}:`, error);
  }
}