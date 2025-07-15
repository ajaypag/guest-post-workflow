import { NextRequest, NextResponse } from 'next/server';
import { aiTargetUrlMatcherResponses } from '@/lib/services/aiTargetUrlMatcherResponses';
import { db } from '@/lib/db/connection';
import { workflows, targetPages } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;
    const { guestPostSite, targetPageIds, clientId, topCount = 20 } = await request.json();

    if (!guestPostSite) {
      return NextResponse.json(
        { error: 'Guest post site URL is required' },
        { status: 400 }
      );
    }

    if (!targetPageIds || !Array.isArray(targetPageIds) || targetPageIds.length === 0) {
      return NextResponse.json(
        { error: 'Target page IDs are required' },
        { status: 400 }
      );
    }

    console.log(`🎯 Analyzing ${targetPageIds.length} target URLs against ${guestPostSite}`);

    // Fetch the target pages with their keywords and descriptions
    const pages = await db.select()
      .from(targetPages)
      .where(
        and(
          eq(targetPages.status, 'active'),
          clientId ? eq(targetPages.clientId, clientId) : sql`1=1`
        )
      );
    
    // Filter to only the requested pages if specific IDs were provided
    const filteredPages = targetPageIds.length > 0 
      ? pages.filter(page => targetPageIds.includes(page.id))
      : pages;

    if (filteredPages.length === 0) {
      return NextResponse.json(
        { error: 'No active target pages found' },
        { status: 404 }
      );
    }

    // Prepare pages for analysis
    const pagesForAnalysis = filteredPages.map(page => ({
      id: page.id,
      url: page.url,
      domain: page.domain,
      status: page.status,
      keywords: page.keywords ? page.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
      description: page.description || undefined
    }));

    // Run AI analysis with web search
    const results = await aiTargetUrlMatcherResponses.analyzeAndRankTargetUrls(
      guestPostSite,
      pagesForAnalysis,
      topCount
    );

    // Map back to page IDs for easy selection in UI
    const rankedPageIds = results.rankedUrls.map(result => {
      const page = filteredPages.find(p => p.url === result.url);
      return page?.id;
    }).filter(Boolean);

    // Update workflow with analysis results (optional - for tracking)
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]) {
      const workflowData = workflow[0].content as any;
      const keywordResearchStep = workflowData.steps?.find((s: any) => s.id === 'keyword-research');
      
      if (keywordResearchStep) {
        keywordResearchStep.outputs = {
          ...keywordResearchStep.outputs,
          aiUrlAnalysis: {
            timestamp: new Date().toISOString(),
            guestPostSite,
            siteAnalysis: results.siteAnalysis,
            topUrls: results.rankedUrls,
            processingTime: results.processingTime
          }
        };

        await db.update(workflows)
          .set({
            content: workflowData,
            updatedAt: new Date()
          })
          .where(eq(workflows.id, workflowId));
      }
    }

    return NextResponse.json({
      success: true,
      siteAnalysis: results.siteAnalysis,
      rankedUrls: results.rankedUrls,
      rankedPageIds,
      processingTime: results.processingTime,
      totalAnalyzed: filteredPages.length,
      topCount
    });

  } catch (error: any) {
    console.error('🔴 Error analyzing target URLs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze target URLs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}