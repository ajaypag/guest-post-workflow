import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const domainName = searchParams.get('domain');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    // Get all domains for the client
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, clientId));

    // If specific domain requested, filter
    const targetDomain = domainName 
      ? domains.find(d => d.domain === domainName)
      : null;

    return NextResponse.json({
      client_id: clientId,
      total_domains: domains.length,
      domains: domains.map(d => ({
        id: d.id,
        domain: d.domain,
        keyword_count: d.keywordCount,
        target_page_ids: d.targetPageIds,
        qualification_status: d.qualificationStatus,
        created_at: d.createdAt,
        updated_at: d.updatedAt
      })),
      specific_domain: targetDomain,
      issue_detected: domains.some(d => d.keywordCount === 0 && (!d.targetPageIds || !Array.isArray(d.targetPageIds) || (d.targetPageIds as string[]).length === 0))
    });
  } catch (error) {
    console.error('Bulk analysis debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { testManualKeywords = true } = body;

    if (!testManualKeywords) {
      return NextResponse.json({ message: 'Only manual keywords test implemented' });
    }

    // Test domain creation with manual keywords
    const testClientId = 'test-' + Date.now();
    const testDomains = ['example.com', 'test.com'];
    const manualKeywords = 'keyword1, keyword2, keyword3';

    console.log('Testing manual keyword domain creation...');
    console.log('Input:', { testDomains, manualKeywords });

    // First create a test project
    const testProjectId = 'test-project-' + Date.now();
    
    // Call the service method
    const result = await BulkAnalysisService.createOrUpdateDomains({
      clientId: testClientId,
      domains: testDomains,
      targetPageIds: [], // Empty array for manual keywords mode
      manualKeywords: manualKeywords,
      userId: 'test-user',
      projectId: testProjectId
    });

    console.log('Service result:', result);

    // Check what was actually saved
    const savedDomains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, testClientId));

    const analysis = {
      test_client_id: testClientId,
      input: {
        domains: testDomains,
        manual_keywords: manualKeywords,
        target_page_ids: []
      },
      service_result: result.map(r => ({
        domain: r.domain,
        keyword_count: r.keywordCount,
        keywords: r.keywords
      })),
      database_result: savedDomains.map(d => ({
        domain: d.domain,
        keyword_count: d.keywordCount,
        target_page_ids: d.targetPageIds
      })),
      issue_confirmed: savedDomains.every(d => d.keywordCount === 0),
      explanation: 'The service ignores manualKeywords parameter and only processes targetPages keywords'
    };

    // Clean up test data
    await db
      .delete(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, testClientId));

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Manual keywords test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}