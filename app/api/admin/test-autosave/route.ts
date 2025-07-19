import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { workflowSteps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { workflowId, stepId, testData } = await request.json();

    // Find the workflow step
    const step = await db.query.workflowSteps.findFirst({
      where: and(
        eq(workflowSteps.workflowId, workflowId),
        eq((workflowSteps.inputs as any).stepType, stepId)
      )
    });

    if (!step) {
      return NextResponse.json({ 
        success: false, 
        message: `Step not found for stepType: ${stepId}` 
      });
    }

    // Test updating the step with V2 data
    const updatedInputs = {
      ...(step.inputs || {}),
      [`${stepId}V2_test`]: testData,
      lastTestUpdate: new Date().toISOString()
    };

    await db.update(workflowSteps)
      .set({
        inputs: updatedInputs,
        updatedAt: new Date()
      })
      .where(eq(workflowSteps.id, step.id));

    // Verify the update
    const verifyStep = await db.query.workflowSteps.findFirst({
      where: eq(workflowSteps.id, step.id)
    });

    const testFieldName = `${stepId}V2_test`;
    if (verifyStep?.inputs && (verifyStep.inputs as any)[testFieldName]) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test data saved successfully',
        stepId: step.id,
        updatedAt: verifyStep.updatedAt
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Test data save verification failed' 
      });
    }

  } catch (error: any) {
    console.error('Test auto-save error:', error);
    return NextResponse.json({ 
      success: false,
      message: error.message 
    });
  }
}