import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// GET /api/clients/[id]/projects - List all projects for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    // TODO: Add authentication check when available
    
    // Get all projects with stats
    const projects = await db
      .select({
        id: bulkAnalysisProjects.id,
        clientId: bulkAnalysisProjects.clientId,
        name: bulkAnalysisProjects.name,
        description: bulkAnalysisProjects.description,
        color: bulkAnalysisProjects.color,
        icon: bulkAnalysisProjects.icon,
        status: bulkAnalysisProjects.status,
        autoApplyKeywords: bulkAnalysisProjects.autoApplyKeywords,
        tags: bulkAnalysisProjects.tags,
        domainCount: bulkAnalysisProjects.domainCount,
        qualifiedCount: bulkAnalysisProjects.qualifiedCount,
        workflowCount: bulkAnalysisProjects.workflowCount,
        lastActivityAt: bulkAnalysisProjects.lastActivityAt,
        createdBy: bulkAnalysisProjects.createdBy,
        createdAt: bulkAnalysisProjects.createdAt,
        updatedAt: bulkAnalysisProjects.updatedAt,
        // Additional computed stats
        analyzedCount: sql<number>`
          (SELECT COUNT(*) FROM ${bulkAnalysisDomains} 
           WHERE ${bulkAnalysisDomains.projectId} = ${bulkAnalysisProjects.id} 
           AND ${bulkAnalysisDomains.hasDataForSeoResults} = true)
        `.as('analyzedCount'),
        pendingCount: sql<number>`
          (SELECT COUNT(*) FROM ${bulkAnalysisDomains} 
           WHERE ${bulkAnalysisDomains.projectId} = ${bulkAnalysisProjects.id} 
           AND ${bulkAnalysisDomains.qualificationStatus} = 'pending')
        `.as('pendingCount')
      })
      .from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.clientId, clientId))
      .orderBy(desc(bulkAnalysisProjects.updatedAt));

    // Also get orphaned domains count (domains without a project)
    const [orphanStats] = await db
      .select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(bulkAnalysisDomains)
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          isNull(bulkAnalysisDomains.projectId)
        )
      );

    return NextResponse.json({ 
      projects,
      orphanedDomainsCount: orphanStats?.count || 0
    });

  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/projects - Create a new project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    // TODO: Add authentication check when available
    
    const body = await request.json();
    const { name, description, color, icon, autoApplyKeywords, tags } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        and(
          eq(bulkAnalysisProjects.clientId, clientId),
          eq(bulkAnalysisProjects.name, name.trim())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      );
    }

    // Create the project
    const projectId = randomUUID();
    const [newProject] = await db
      .insert(bulkAnalysisProjects)
      .values({
        id: projectId,
        clientId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        icon: icon || '📁',
        autoApplyKeywords: autoApplyKeywords || [],
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      project: newProject 
    });

  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
}