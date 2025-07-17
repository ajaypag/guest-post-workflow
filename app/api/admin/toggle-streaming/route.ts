import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflows } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { isStreamingEnabled, enableStreamingForWorkflow } from '@/lib/config/featureFlags';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    
    if (!workflowId) {
      // Get global streaming status
      return NextResponse.json({
        globalEnabled: isStreamingEnabled(),
        environment: process.env.NODE_ENV,
        envVariable: process.env.ENABLE_STREAMING || 'not_set'
      });
    }
    
    // Get workflow-specific status
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    const content = workflow.content as any;
    const workflowStreamingEnabled = content?.streamingEnabled ?? null;
    const effectiveStreamingEnabled = enableStreamingForWorkflow(workflowId);
    
    return NextResponse.json({
      workflowId,
      workflowStreamingEnabled,
      effectiveStreamingEnabled,
      globalEnabled: isStreamingEnabled(),
      source: workflowStreamingEnabled !== null ? 'workflow' : 'global'
    });
    
  } catch (error) {
    console.error('Error getting streaming status:', error);
    return NextResponse.json(
      { error: 'Failed to get streaming status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workflowId, enabled } = await request.json();
    
    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }
    
    // Get current workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // Update workflow content with streaming preference
    const content = (workflow.content as any) || {};
    content.streamingEnabled = enabled;
    
    await db.update(workflows)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(workflows.id, workflowId));
    
    console.log(`✅ Updated streaming preference for workflow ${workflowId}: ${enabled}`);
    
    return NextResponse.json({
      success: true,
      workflowId,
      streamingEnabled: enabled,
      message: `Streaming ${enabled ? 'enabled' : 'disabled'} for workflow`
    });
    
  } catch (error) {
    console.error('Error toggling streaming:', error);
    return NextResponse.json(
      { error: 'Failed to toggle streaming' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    
    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }
    
    // Get current workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    // Remove streaming preference to use global default
    const content = (workflow.content as any) || {};
    delete content.streamingEnabled;
    
    await db.update(workflows)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(workflows.id, workflowId));
    
    console.log(`🔄 Reset streaming preference for workflow ${workflowId} to use global default`);
    
    return NextResponse.json({
      success: true,
      workflowId,
      message: 'Streaming preference reset to global default'
    });
    
  } catch (error) {
    console.error('Error resetting streaming preference:', error);
    return NextResponse.json(
      { error: 'Failed to reset streaming preference' },
      { status: 500 }
    );
  }
}