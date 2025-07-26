import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects, bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';

// GET /api/clients/[id]/projects/[projectId] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  try {
    const { id: clientId, projectId } = params;
    // TODO: Add auth when available

    const [project] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        and(
          eq(bulkAnalysisProjects.id, projectId),
          eq(bulkAnalysisProjects.clientId, clientId)
        )
      )
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });

  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/clients/[id]/projects/[projectId] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  try {
    const { id: clientId, projectId } = params;
    // TODO: Add auth when available

    const body = await request.json();
    const { name, description, color, icon, status, autoApplyKeywords, tags } = body;

    // Check project exists
    const [existing] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        and(
          eq(bulkAnalysisProjects.id, projectId),
          eq(bulkAnalysisProjects.clientId, clientId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existing.name) {
      const duplicate = await db
        .select()
        .from(bulkAnalysisProjects)
        .where(
          and(
            eq(bulkAnalysisProjects.clientId, clientId),
            eq(bulkAnalysisProjects.name, name.trim())
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: 'A project with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update project
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    if (autoApplyKeywords !== undefined) updates.autoApplyKeywords = autoApplyKeywords;
    if (tags !== undefined) updates.tags = tags;

    await db
      .update(bulkAnalysisProjects)
      .set(updates)
      .where(eq(bulkAnalysisProjects.id, projectId));

    // Fetch and return updated project
    const [updatedProject] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.id, projectId))
      .limit(1);

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });

  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/projects/[projectId] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; projectId: string } }
) {
  try {
    const { id: clientId, projectId } = params;
    // TODO: Add auth when available

    // Check project exists
    const [existing] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(
        and(
          eq(bulkAnalysisProjects.id, projectId),
          eq(bulkAnalysisProjects.clientId, clientId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project (domains will be cascade deleted due to ON DELETE CASCADE)
    await db
      .delete(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.id, projectId));

    return NextResponse.json({
      success: true,
      message: 'Project and all associated domains deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message },
      { status: 500 }
    );
  }
}