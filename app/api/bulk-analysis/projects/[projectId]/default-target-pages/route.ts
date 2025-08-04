import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { bulkAnalysisProjects } from '@/lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Get the project
    const [project] = await db
      .select()
      .from(bulkAnalysisProjects)
      .where(eq(bulkAnalysisProjects.id, projectId));
      
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Extract target page IDs from tags
    const tags = project.tags as string[] || [];
    const targetPageIds = tags
      .filter(tag => tag.startsWith('target-page:'))
      .map(tag => tag.replace('target-page:', ''));
    
    return NextResponse.json({
      projectId,
      targetPageIds,
      autoApplyKeywords: project.autoApplyKeywords || []
    });
    
  } catch (error: any) {
    console.error('Error fetching default target pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default target pages', details: error.message },
      { status: 500 }
    );
  }
}