import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build conditions first
    const conditions = [];
    
    if (clientId) {
      conditions.push(eq(bulkAnalysisProjects.clientId, clientId));
    }
    
    if (status && status !== 'all') {
      conditions.push(eq(bulkAnalysisProjects.status, status));
    }
    
    if (search) {
      conditions.push(
        or(
          like(bulkAnalysisProjects.name, `%${search}%`),
          like(bulkAnalysisProjects.description, `%${search}%`)
        )
      );
    }

    // Build query with conditions
    const query = db
      .select({
        project: bulkAnalysisProjects,
        client: clients
      })
      .from(bulkAnalysisProjects)
      .innerJoin(clients, eq(bulkAnalysisProjects.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bulkAnalysisProjects.createdAt));

    const results = await query;

    // Format the response
    const projects = results.map(({ project, client }) => ({
      ...project,
      client: {
        id: client.id,
        name: client.name,
        website: client.website
      }
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching bulk analysis projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}