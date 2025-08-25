import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, targetPages } from '@/lib/db/schema';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientIds = searchParams.get('clientId')?.split(',').filter(Boolean);
    const onlyWithMatchData = searchParams.get('onlyWithMatchData') === 'true';

    // Build conditions for permission filtering
    const conditions = [];
    let userClientIds: string[] = [];
    
    // Apply permission filters based on user type
    if (session.userType === 'account') {
      // Account users can only see target URLs from their clients
      // Get all client IDs for this account
      const accountClients = await db.query.clients.findMany({
        where: eq(clients.accountId, session.userId),
        columns: {
          id: true,
        },
      });
      
      userClientIds = accountClients.map(c => c.id);
      if (userClientIds.length === 0) {
        console.log('🔍 Account user has no clients:', session.userId);
        return NextResponse.json({ targetUrls: [] });
      }
      console.log('🔍 Account user client IDs:', userClientIds);
      conditions.push(inArray(targetPages.clientId, userClientIds));
    }

    // Client filter
    if (clientIds && clientIds.length > 0) {
      conditions.push(inArray(targetPages.clientId, clientIds));
    }

    console.log('🔍 Target URLs API Debug:', {
      clientIds,
      conditionsCount: conditions.length,
      userType: session.userType,
      userClientId: session.clientId
    });

    // Get unique target URLs that are actually used in bulk analysis
    const targetUrlsQuery = await db
      .select({
        url: targetPages.url,
        clientId: targetPages.clientId,
        clientName: clients.name,
        usageCount: sql<number>`COUNT(DISTINCT ${bulkAnalysisDomains.id})::int`,
      })
      .from(targetPages)
      .leftJoin(clients, eq(targetPages.clientId, clients.id))
      .leftJoin(bulkAnalysisDomains, sql`${bulkAnalysisDomains.targetPageIds}::jsonb ? ${targetPages.id}::text`)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(targetPages.url, targetPages.clientId, clients.name)
      .having(sql`COUNT(DISTINCT ${bulkAnalysisDomains.id}) > 0`)
      .orderBy(sql`COUNT(DISTINCT ${bulkAnalysisDomains.id}) DESC`);

    // Also get target URLs from AI analysis results
    const aiAnalysisUrlsQuery = await db
      .select({
        targetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        clientId: bulkAnalysisDomains.clientId,
        clientName: clients.name,
        usageCount: sql<number>`COUNT(*)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .where(and(
        sql`${bulkAnalysisDomains.suggestedTargetUrl} IS NOT NULL`,
        ...(conditions.length > 0 ? [
          session.userType === 'account' ? 
            inArray(bulkAnalysisDomains.clientId, userClientIds) :
            clientIds && clientIds.length > 0 ? 
              inArray(bulkAnalysisDomains.clientId, clientIds) : 
              sql`1=1`
        ] : [])
      ))
      .groupBy(bulkAnalysisDomains.suggestedTargetUrl, bulkAnalysisDomains.clientId, clients.name)
      .orderBy(sql`COUNT(*) DESC`);

    const originalTargetUrls = targetUrlsQuery.map(row => ({
      url: row.url,
      type: 'original' as const,
      clientId: row.clientId,
      clientName: row.clientName,
      usageCount: row.usageCount,
    }));

    const aiTargetUrls = aiAnalysisUrlsQuery
      .filter(row => row.targetUrl) // Filter out nulls
      .map(row => ({
        url: row.targetUrl!,
        type: 'ai_suggested' as const,
        clientId: row.clientId,
        clientName: row.clientName,
        usageCount: row.usageCount,
      }));

    // Get URLs that appear in target match analysis data
    const matchDataUrlsQuery = await db
      .select({
        analysisUrl: sql<string>`DISTINCT jsonb_array_elements_text(
          jsonb_path_query_array(${bulkAnalysisDomains.targetMatchData}, '$.target_analysis[*].target_url')
        )`,
        clientId: bulkAnalysisDomains.clientId,
        clientName: clients.name,
        usageCount: sql<number>`COUNT(*)::int`,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .where(and(
        sql`${bulkAnalysisDomains.targetMatchData} IS NOT NULL`,
        sql`jsonb_typeof(${bulkAnalysisDomains.targetMatchData}) = 'object'`,
        ...(conditions.length > 0 ? [
          session.userType === 'account' ? 
            inArray(bulkAnalysisDomains.clientId, userClientIds) :
            clientIds && clientIds.length > 0 ? 
              inArray(bulkAnalysisDomains.clientId, clientIds) : 
              sql`1=1`
        ] : [])
      ))
      .groupBy(
        sql`jsonb_array_elements_text(jsonb_path_query_array(${bulkAnalysisDomains.targetMatchData}, '$.target_analysis[*].target_url'))`,
        bulkAnalysisDomains.clientId, 
        clients.name
      );

    const matchDataUrls = matchDataUrlsQuery
      .filter(row => row.analysisUrl) // Filter out nulls
      .map(row => ({
        url: row.analysisUrl!,
        type: 'analyzed' as const,
        clientId: row.clientId,
        clientName: row.clientName,
        usageCount: row.usageCount,
      }));

    // Combine all URL sources and mark which have match data
    const allUrls = [...originalTargetUrls, ...aiTargetUrls, ...matchDataUrls];
    const urlsWithMatchData = new Set(matchDataUrls.map(url => url.url));
    
    const uniqueUrls = Array.from(
      new Map(allUrls.map(item => [item.url, item])).values()
    ).map(url => ({
      ...url,
      hasMatchData: urlsWithMatchData.has(url.url)
    }));

    // Apply the filter based on the parameter we already parsed
    
    const filteredUrls = onlyWithMatchData 
      ? uniqueUrls.filter(url => url.hasMatchData)
      : uniqueUrls;

    console.log('📊 Target URLs Results:', {
      originalTargetUrls: originalTargetUrls.length,
      aiTargetUrls: aiTargetUrls.length,
      matchDataUrls: matchDataUrls.length,
      totalUnique: uniqueUrls.length,
      withMatchData: uniqueUrls.filter(u => u.hasMatchData).length,
      afterFilter: filteredUrls.length,
      onlyWithMatchData
    });

    // Group by domain for easier filtering  
    const urlsByDomain = filteredUrls.reduce((acc, item) => {
      try {
        const domain = new URL(item.url).hostname.replace('www.', '');
        if (!acc[domain]) {
          acc[domain] = [];
        }
        acc[domain].push(item);
        return acc;
      } catch {
        // If URL parsing fails, group under 'other'
        if (!acc['other']) {
          acc['other'] = [];
        }
        acc['other'].push(item);
        return acc;
      }
    }, {} as Record<string, typeof uniqueUrls>);

    return NextResponse.json({
      targetUrls: filteredUrls, // No more artificial limit
      urlsByDomain,
      total: filteredUrls.length,
      hasMatchDataCount: uniqueUrls.filter(u => u.hasMatchData).length,
    });

  } catch (error: any) {
    console.error('Target URLs API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}