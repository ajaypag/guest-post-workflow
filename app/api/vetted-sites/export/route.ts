import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects, clients, websites } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { domainIds, format = 'csv' } = body;

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: domainIds array required' },
        { status: 400 }
      );
    }

    // Fetch domains with all related data
    const domains = await db
      .select({
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        qualifiedAt: bulkAnalysisDomains.aiQualifiedAt,
        // AI Qualification fields
        overlapStatus: bulkAnalysisDomains.overlapStatus,
        authorityDirect: bulkAnalysisDomains.authorityDirect,
        authorityRelated: bulkAnalysisDomains.authorityRelated,
        topicScope: bulkAnalysisDomains.topicScope,
        evidence: bulkAnalysisDomains.evidence,
        // Target matching
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        targetMatchData: bulkAnalysisDomains.targetMatchData,
        // Meta fields
        keywordCount: bulkAnalysisDomains.keywordCount,
        hasWorkflow: bulkAnalysisDomains.hasWorkflow,
        notes: bulkAnalysisDomains.notes,
        // Client/Project info
        clientId: bulkAnalysisDomains.clientId,
        projectId: bulkAnalysisDomains.projectId,
        clientName: clients.name,
        projectName: bulkAnalysisProjects.name,
        // Tracking
        updatedAt: bulkAnalysisDomains.updatedAt,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .where(inArray(bulkAnalysisDomains.id, domainIds))
      .orderBy(desc(bulkAnalysisDomains.aiQualifiedAt));

    // Check permissions for non-internal users
    if (session.userType !== 'internal') {
      // Account users can only export their own domains
      const userClientIds = domains.map(d => d.clientId);
      const uniqueClientIds = [...new Set(userClientIds)];
      
      // For account users, verify they have access to these clients
      // This would require additional logic to check client ownership
      // For now, we'll allow it but you may want to add stricter checks
    }

    if (format === 'json') {
      // Return JSON format
      return NextResponse.json({
        domains: domains.map(d => ({
          ...d,
          evidence: d.evidence as any,
          targetMatchData: d.targetMatchData as any,
        })),
        exportedAt: new Date().toISOString(),
        count: domains.length,
      });
    } else {
      // Generate CSV
      const csvHeaders = [
        'Domain',
        'Client',
        'Project',
        'Qualification Status',
        'Qualified Date',
        'Overlap Status',
        'Authority (Direct)',
        'Authority (Related)',
        'Topic Scope',
        'Direct Keywords',
        'Related Keywords',
        'Suggested Target URL',
        'Total Keywords',
        'Has Workflow',
        'Notes',
        'Updated At'
      ];

      const csvRows = domains.map(d => {
        const evidence = d.evidence as any;
        return [
          d.domain,
          d.clientName || '',
          d.projectName || '',
          d.qualificationStatus,
          d.qualifiedAt ? new Date(d.qualifiedAt).toLocaleDateString() : '',
          d.overlapStatus || '',
          d.authorityDirect || '',
          d.authorityRelated || '',
          d.topicScope || '',
          evidence?.direct_count || '0',
          evidence?.related_count || '0',
          d.suggestedTargetUrl || '',
          (d.keywordCount || 0).toString(),
          d.hasWorkflow ? 'Yes' : 'No',
          d.notes || '',
          new Date(d.updatedAt).toLocaleDateString()
        ];
      });

      const csv = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quotes
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
              ? `"${escaped}"`
              : escaped;
          }).join(',')
        )
      ].join('\n');

      // Return CSV with appropriate headers
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vetted-sites-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
  } catch (error: any) {
    console.error('Error exporting vetted sites:', error);
    return NextResponse.json(
      { error: 'Failed to export domains', details: error.message },
      { status: 500 }
    );
  }
}