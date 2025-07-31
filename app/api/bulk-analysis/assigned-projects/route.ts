import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { clients } from '@/lib/db/schema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { eq, and, desc, isNotNull, gte } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || (session.userType !== 'internal' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const extended = searchParams.get('extended') === 'true';

    // Get projects assigned to the current user from orders
    // These are projects created by the order confirmation process
    const timeFilter = extended ? undefined : (() => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return oneWeekAgo;
    })();

    const whereConditions = [
      eq(bulkAnalysisProjects.createdBy, session.userId),
      isNotNull(orderGroups.id) // Only projects linked to orders
    ];

    if (timeFilter) {
      whereConditions.push(gte(bulkAnalysisProjects.createdAt, timeFilter));
    }

    const projects = await db
      .select({
        id: bulkAnalysisProjects.id,
        name: bulkAnalysisProjects.name,
        description: bulkAnalysisProjects.description,
        clientId: bulkAnalysisProjects.clientId,
        clientName: clients.name,
        icon: bulkAnalysisProjects.icon,
        color: bulkAnalysisProjects.color,
        createdAt: bulkAnalysisProjects.createdAt,
        linkCount: orderGroups.linkCount,
        status: bulkAnalysisProjects.status,
        domainCount: bulkAnalysisProjects.domainCount,
        qualifiedCount: bulkAnalysisProjects.qualifiedCount,
        orderGroupId: orderGroups.id
      })
      .from(bulkAnalysisProjects)
      .innerJoin(clients, eq(bulkAnalysisProjects.clientId, clients.id))
      .leftJoin(orderGroups, eq(orderGroups.bulkAnalysisProjectId, bulkAnalysisProjects.id))
      .where(and(...whereConditions))
      .orderBy(desc(bulkAnalysisProjects.createdAt));

    // Format the projects with order info
    const projectsWithOrderInfo = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      clientName: project.clientName,
      icon: project.icon,
      color: project.color,
      createdAt: project.createdAt,
      orderGroupId: project.orderGroupId,
      linkCount: project.linkCount,
      ...(extended ? {
        status: project.status,
        domainCount: project.domainCount,
        qualifiedCount: project.qualifiedCount
      } : {})
    }));

    return NextResponse.json({ 
      projects: projectsWithOrderInfo
    });

  } catch (error: any) {
    console.error('Error fetching assigned projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned projects', details: error.message },
      { status: 500 }
    );
  }
}