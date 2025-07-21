import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get a sample client and their target pages for testing
    const sampleClient = await db.select().from(clients).limit(1);
    
    if (!sampleClient[0]) {
      return NextResponse.json({
        success: false,
        message: 'No clients found. Create a client first to test bulk qualification.',
        testData: null
      });
    }

    const clientTargetPages = await db
      .select()
      .from(targetPages)
      .where(eq(targetPages.clientId, sampleClient[0].id))
      .limit(3);

    return NextResponse.json({
      success: true,
      message: 'Bulk qualification API test endpoint',
      testData: {
        sampleClient: {
          id: sampleClient[0].id,
          name: sampleClient[0].name,
          website: sampleClient[0].website
        },
        sampleTargetPages: clientTargetPages.map(page => ({
          id: page.id,
          url: page.url,
          domain: page.domain,
          keywords: page.keywords?.split(',').slice(0, 3).join(', ') || 'No keywords set'
        })),
        nextSteps: [
          '1. POST to /api/bulk-qualification/create-job with sample data',
          '2. POST to /api/bulk-qualification/start-collection with jobId',
          '3. GET /api/bulk-qualification/job-status/[jobId] to monitor progress',
          '4. GET /api/bulk-qualification/site-rankings/[siteId] to view results'
        ],
        sampleCreateJobPayload: {
          clientId: sampleClient[0].id,
          name: 'Test Bulk Qualification Job',
          description: 'Testing the bulk qualification workflow',
          checkDepth: 'balanced',
          targetPages: clientTargetPages.slice(0, 2).map(page => page.id),
          sites: [
            {
              domain: 'techcrunch.com',
              url: 'https://techcrunch.com',
              siteName: 'TechCrunch',
              monthlyTraffic: 50000000,
              domainAuthority: 92,
              niche: 'Technology News'
            },
            {
              domain: 'venturebeat.com', 
              url: 'https://venturebeat.com',
              siteName: 'VentureBeat',
              monthlyTraffic: 15000000,
              domainAuthority: 85,
              niche: 'Tech & Business'
            }
          ]
        }
      },
      apiEndpoints: [
        'POST /api/bulk-qualification/create-job - Create a new qualification job',
        'POST /api/bulk-qualification/start-collection - Start data collection for a job',  
        'GET /api/bulk-qualification/job-status/[jobId] - Get job status and progress',
        'GET /api/bulk-qualification/site-rankings/[siteId] - Get site ranking details',
        'GET /api/bulk-qualification/jobs - List all qualification jobs'
      ]
    });

  } catch (error) {
    console.error('Bulk qualification test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}