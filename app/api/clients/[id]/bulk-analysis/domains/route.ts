import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // If account, verify they have access to this client
    if (session.userType === 'account') {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.userId),
      });
      
      if (!account || account.primaryClientId !== clientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Domain IDs are required' }, { status: 400 });
    }

    const domainIds = ids.split(',');

    // Get domains with project info
    const domains = await db
      .select({
        domain: bulkAnalysisDomains,
        project: bulkAnalysisProjects,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(
        bulkAnalysisProjects,
        eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id)
      )
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    // Format the response
    const formattedDomains = domains.map(({ domain, project }) => ({
      ...domain,
      projectName: project?.name || null,
    }));

    return NextResponse.json({ domains: formattedDomains });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}