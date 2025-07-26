import { NextRequest, NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';
import { DataForSeoCacheService } from '@/lib/services/dataForSeoCacheService';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface BatchAnalysisRequest {
  domainIds: string[];
  keywords?: string[];
  locationCode?: number;
  languageCode?: string;
}

interface BatchAnalysisResponse {
  jobId: string;
  totalDomains: number;
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body: BatchAnalysisRequest = await request.json();
    const { domainIds, keywords, locationCode = 2840, languageCode = 'en' } = body;

    if (!domainIds || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'No domains selected' },
        { status: 400 }
      );
    }

    // Create bulk job
    const jobId = uuidv4();
    
    // Create job tracking tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bulk_dataforseo_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        total_domains INTEGER,
        processed_domains INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bulk_dataforseo_job_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES bulk_dataforseo_jobs(id) ON DELETE CASCADE,
        domain_id UUID REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        keywords_analyzed INTEGER,
        rankings_found INTEGER,
        error_message TEXT,
        processed_at TIMESTAMP
      )
    `);

    // Insert job record
    await db.execute(sql`
      INSERT INTO bulk_dataforseo_jobs (id, client_id, status, total_domains, created_at)
      VALUES (${jobId}::uuid, ${clientId}::uuid, 'pending', ${domainIds.length}, NOW())
    `);

    // Insert job items for each domain
    for (const domainId of domainIds) {
      await db.execute(sql`
        INSERT INTO bulk_dataforseo_job_items (job_id, domain_id, status)
        VALUES (${jobId}::uuid, ${domainId}::uuid, 'pending')
      `);
    }

    // Start async processing (we'll implement a proper queue later)
    processBatchAsync(jobId, clientId, domainIds, keywords, locationCode, languageCode);

    return NextResponse.json({
      jobId,
      totalDomains: domainIds.length,
      message: 'Bulk analysis started'
    });
  } catch (error: any) {
    console.error('Error starting bulk analysis:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk analysis', details: error.message },
      { status: 500 }
    );
  }
}

// Async processing function
async function processBatchAsync(
  jobId: string,
  clientId: string,
  domainIds: string[],
  keywords?: string[],
  locationCode: number = 2840,
  languageCode: string = 'en'
) {
  try {
    // Update job status to processing
    await db.execute(sql`
      UPDATE bulk_dataforseo_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = ${jobId}::uuid
    `);

    let processedCount = 0;
    const batchSize = 2; // Process 2 domains at a time to respect rate limits

    for (let i = 0; i < domainIds.length; i += batchSize) {
      const batch = domainIds.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(async (domainId) => {
          try {
            // Get domain info
            const domainResult = await db.execute(sql`
              SELECT domain, keyword_count, target_page_ids
              FROM bulk_analysis_domains
              WHERE id = ${domainId}::uuid
            `);

            if (domainResult.rows.length === 0) {
              throw new Error('Domain not found');
            }

            const domain = domainResult.rows[0] as any;
            
            // Get keywords for this domain
            let domainKeywords: string[] = [];
            
            if (keywords && keywords.length > 0) {
              // Use provided keywords
              domainKeywords = keywords;
            } else {
              // Get keywords from target pages
              const targetPageIds = domain.target_page_ids as string[];
              if (targetPageIds && targetPageIds.length > 0) {
                const keywordsResult = await db.execute(sql`
                  SELECT keywords
                  FROM target_pages
                  WHERE id = ANY(ARRAY[${sql.join(targetPageIds.map(id => sql`${id}::uuid`), sql`, `)}])
                    AND keywords IS NOT NULL
                `);
                
                const keywordSet = new Set<string>();
                keywordsResult.rows.forEach((row: any) => {
                  if (row.keywords) {
                    row.keywords.split(',').forEach((k: string) => {
                      keywordSet.add(k.trim());
                    });
                  }
                });
                
                domainKeywords = Array.from(keywordSet);
              }
            }

            if (domainKeywords.length === 0) {
              throw new Error('No keywords found for domain');
            }

            // Analyze with DataForSEO using cache
            const cacheAnalysis = await DataForSeoCacheService.analyzeKeywordCache(
              domainId,
              domainKeywords,
              locationCode,
              languageCode
            );

            let allResults = [...cacheAnalysis.existingResults];
            let apiResults: any[] = [];

            if (cacheAnalysis.newKeywords.length > 0) {
              // Analyze domain with new keywords
              const analysisResult = await DataForSeoService.analyzeDomain(
                domainId,
                domain.domain,
                cacheAnalysis.newKeywords,
                locationCode,
                languageCode,
                !cacheAnalysis.shouldRefreshAll // isIncremental
              );

              if (analysisResult.keywords) {
                apiResults = analysisResult.keywords;
              }

              // Track searched keywords
              await DataForSeoCacheService.trackKeywordSearch(
                domainId,
                cacheAnalysis.newKeywords,
                apiResults.length > 0,
                locationCode,
                languageCode
              );

              // Update searched keywords list
              await DataForSeoCacheService.updateSearchedKeywords(
                domainId,
                cacheAnalysis.newKeywords,
                cacheAnalysis.shouldRefreshAll
              );

              allResults = [...allResults, ...apiResults];
            }

            // Update job item status
            await db.execute(sql`
              UPDATE bulk_dataforseo_job_items
              SET 
                status = 'completed',
                keywords_analyzed = ${domainKeywords.length},
                rankings_found = ${allResults.length},
                processed_at = NOW()
              WHERE job_id = ${jobId}::uuid AND domain_id = ${domainId}::uuid
            `);

            // Update domain record to mark DataForSEO analysis as complete
            await db.execute(sql`
              UPDATE bulk_analysis_domains
              SET 
                has_dataforseo_results = true,
                dataforseo_last_analyzed = NOW(),
                updated_at = NOW()
              WHERE id = ${domainId}::uuid
            `);

          } catch (error: any) {
            console.error(`Error processing domain ${domainId}:`, error);
            
            // Update job item with error
            await db.execute(sql`
              UPDATE bulk_dataforseo_job_items
              SET 
                status = 'failed',
                error_message = ${error.message},
                processed_at = NOW()
              WHERE job_id = ${jobId}::uuid AND domain_id = ${domainId}::uuid
            `);
          }
        })
      );

      processedCount += batch.length;

      // Update job progress
      await db.execute(sql`
        UPDATE bulk_dataforseo_jobs
        SET processed_domains = ${processedCount}
        WHERE id = ${jobId}::uuid
      `);

      // Add delay between batches to respect rate limits
      if (i + batchSize < domainIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // Mark job as completed
    await db.execute(sql`
      UPDATE bulk_dataforseo_jobs
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${jobId}::uuid
    `);

  } catch (error: any) {
    console.error('Error in batch processing:', error);
    
    // Mark job as failed
    await db.execute(sql`
      UPDATE bulk_dataforseo_jobs
      SET status = 'failed', completed_at = NOW()
      WHERE id = ${jobId}::uuid
    `);
  }
}

// GET endpoint to check job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = request.nextUrl;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job status
    const jobResult = await db.execute(sql`
      SELECT 
        j.*,
        COUNT(DISTINCT ji.id) as total_items,
        COUNT(DISTINCT CASE WHEN ji.status = 'completed' THEN ji.id END) as completed_items,
        COUNT(DISTINCT CASE WHEN ji.status = 'failed' THEN ji.id END) as failed_items,
        SUM(ji.keywords_analyzed) as total_keywords_analyzed,
        SUM(ji.rankings_found) as total_rankings_found
      FROM bulk_dataforseo_jobs j
      LEFT JOIN bulk_dataforseo_job_items ji ON j.id = ji.job_id
      WHERE j.id = ${jobId}::uuid
      GROUP BY j.id
    `);

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobResult.rows[0];

    // Get detailed item status
    const itemsResult = await db.execute(sql`
      SELECT 
        ji.*,
        d.domain
      FROM bulk_dataforseo_job_items ji
      JOIN bulk_analysis_domains d ON ji.domain_id = d.id
      WHERE ji.job_id = ${jobId}::uuid
      ORDER BY ji.processed_at DESC NULLS LAST
    `);

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        totalDomains: job.total_domains,
        processedDomains: job.processed_domains,
        completedItems: Number(job.completed_items),
        failedItems: Number(job.failed_items),
        totalKeywordsAnalyzed: Number(job.total_keywords_analyzed) || 0,
        totalRankingsFound: Number(job.total_rankings_found) || 0,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        createdAt: job.created_at
      },
      items: itemsResult.rows.map(item => ({
        domainId: item.domain_id,
        domain: item.domain,
        status: item.status,
        keywordsAnalyzed: item.keywords_analyzed,
        rankingsFound: item.rankings_found,
        errorMessage: item.error_message,
        processedAt: item.processed_at
      }))
    });
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status', details: error.message },
      { status: 500 }
    );
  }
}