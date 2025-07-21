import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { qualificationJobs, bulkSites, siteRankings, targetPages, jobTargetPages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { dataForSEOService } from '@/lib/services/dataForSEOService';
import { v4 as uuidv4 } from 'uuid';

// Helper function to extract topic terms from keywords
function extractTopicTerms(keywords: string[]): string[] {
  const topicTerms = new Set<string>();
  
  keywords.forEach(keyword => {
    const words = keyword.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Add individual words
    words.forEach(word => topicTerms.add(word));
    
    // Add 2-word combinations for common business terms
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (['payment gateway', 'credit card', 'fraud detection', 'data security', 'api integration'].includes(phrase)) {
        topicTerms.add(phrase);
      }
    }
  });
  
  return Array.from(topicTerms).slice(0, 20); // Limit to top 20 terms
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required field: jobId' },
        { status: 400 }
      );
    }

    // Get job details
    const job = await db.select().from(qualificationJobs).where(eq(qualificationJobs.id, jobId)).limit(1);
    if (!job[0]) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = job[0];

    // Get target pages and their keywords
    const targetPagesData = await db
      .select({
        targetPage: targetPages,
        jobTargetPage: jobTargetPages
      })
      .from(jobTargetPages)
      .leftJoin(targetPages, eq(jobTargetPages.targetPageId, targetPages.id))
      .where(eq(jobTargetPages.jobId, jobId));

    // Extract all keywords and generate topic terms
    const allKeywords: string[] = [];
    targetPagesData.forEach(({ targetPage }) => {
      if (targetPage?.keywords) {
        allKeywords.push(...targetPage.keywords.split(',').map(k => k.trim()));
      }
    });

    if (allKeywords.length === 0) {
      return NextResponse.json(
        { error: 'No keywords found in target pages' },
        { status: 400 }
      );
    }

    const topicTerms = extractTopicTerms(allKeywords);
    console.log(`📋 Extracted ${topicTerms.length} topic terms: ${topicTerms.slice(0, 5).join(', ')}...`);

    // Update job status
    await db.update(qualificationJobs)
      .set({
        status: 'checking_rankings',
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(qualificationJobs.id, jobId));

    // Get sites to process
    const sitesToProcess = await db
      .select()
      .from(bulkSites)
      .where(and(
        eq(bulkSites.jobId, jobId),
        eq(bulkSites.status, 'pending')
      ));

    let totalApiCalls = 0;
    let processedSites = 0;

    // Process each site
    for (const site of sitesToProcess) {
      try {
        console.log(`🔍 Processing site: ${site.domain}`);

        // Update site status
        await db.update(bulkSites)
          .set({
            status: 'checking',
            checkedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(bulkSites.id, site.id));

        // Collect rankings for each topic term
        const allRankings = await dataForSEOService.getRankedKeywordsBulk(
          site.domain,
          topicTerms,
          'United States',
          'en',
          50 // Limit per topic
        );

        totalApiCalls += allRankings.length;
        let totalKeywords = 0;
        let relevantKeywords = 0;

        // Store rankings in database
        for (const { topicFilter, results } of allRankings) {
          for (const ranking of results) {
            const rankingId = uuidv4();
            
            try {
              await db.insert(siteRankings).values({
                id: rankingId,
                siteId: site.id,
                jobId: jobId,
                keyword: ranking.keyword_data.keyword.substring(0, 500), // Respect VARCHAR limit
                rankAbsolute: ranking.ranked_serp_element.serp_item.rank_absolute,
                searchEngine: ranking.se_type,
                keywordDifficulty: ranking.keyword_data.keyword_info?.keyword_difficulty || null,
                searchVolume: ranking.keyword_data.keyword_info?.search_volume || null,
                cpc: ranking.keyword_data.keyword_info?.cpc ? ranking.keyword_data.keyword_info.cpc.toString() : null,
                competitionLevel: ranking.keyword_data.keyword_info?.competition_level || null,
                rankingUrl: ranking.ranked_serp_element.serp_item.url,
                domain: ranking.ranked_serp_element.serp_item.domain.substring(0, 255), // Respect VARCHAR limit
                topicMatch: topicFilter.substring(0, 100), // Respect VARCHAR limit
                collectedAt: new Date()
              });

              totalKeywords++;
              
              // Count as relevant if it ranks in top 50
              if (ranking.ranked_serp_element.serp_item.rank_absolute <= 50) {
                relevantKeywords++;
              }
            } catch (dbError) {
              console.error(`Failed to insert ranking for ${ranking.keyword_data.keyword}:`, dbError);
              // Continue processing other rankings
            }
          }
        }

        // Update site with results
        await db.update(bulkSites)
          .set({
            status: 'analyzed',
            totalKeywordsFound: totalKeywords,
            relevantKeywordsFound: relevantKeywords,
            updatedAt: new Date()
          })
          .where(eq(bulkSites.id, site.id));

        processedSites++;
        console.log(`✅ Processed ${site.domain}: ${totalKeywords} keywords, ${relevantKeywords} relevant`);

      } catch (siteError) {
        console.error(`Failed to process site ${site.domain}:`, siteError);
        
        // Mark site as error
        await db.update(bulkSites)
          .set({
            status: 'error',
            errorMessage: siteError instanceof Error ? siteError.message : 'Unknown error',
            updatedAt: new Date()
          })
          .where(eq(bulkSites.id, site.id));

        processedSites++;
      }

      // Update job progress
      await db.update(qualificationJobs)
        .set({
          processedSites,
          totalApiCalls,
          updatedAt: new Date()
        })
        .where(eq(qualificationJobs.id, jobId));
    }

    // Mark job as completed
    await db.update(qualificationJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(qualificationJobs.id, jobId));

    console.log(`🎉 Bulk qualification completed for job ${jobId}: ${processedSites} sites processed`);

    return NextResponse.json({
      success: true,
      message: `Data collection completed for ${processedSites} sites`,
      data: {
        jobId,
        processedSites,
        totalApiCalls,
        topicTermsUsed: topicTerms.length,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Failed to start bulk qualification collection:', error);
    
    // Update job status to failed if we have a jobId
    const { jobId } = await request.json().catch(() => ({}));
    if (jobId) {
      try {
        await db.update(qualificationJobs)
          .set({
            status: 'failed',
            updatedAt: new Date()
          })
          .where(eq(qualificationJobs.id, jobId));
      } catch (dbError) {
        console.error('Failed to update job status to failed:', dbError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to start data collection' },
      { status: 500 }
    );
  }
}