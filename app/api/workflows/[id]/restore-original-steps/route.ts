import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { WORKFLOW_STEPS } from '@/types/workflow';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // First, get the current workflow
    const result = await pool.query(
      'SELECT * FROM workflows WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    const workflow = result.rows[0];
    const content = workflow.content;
    
    // Check if we have a backup of the original steps
    const backupSteps = content.stepsBackup || content.originalSteps;
    
    if (backupSteps) {
      // Restore from backup
      content.steps = backupSteps;
      delete content.stepsBackup;
      delete content.originalSteps;
    } else {
      // Recreate the full steps array with original template
      const currentSteps = content.steps || [];
      const newSteps = [];
      
      // Preserve steps 0-7 with their data
      for (let i = 0; i <= 7; i++) {
        if (currentSteps[i]) {
          newSteps.push(currentSteps[i]);
        } else {
          // Create from template if missing
          newSteps.push({
            ...WORKFLOW_STEPS[i],
            status: 'pending',
            inputs: {},
            outputs: {}
          });
        }
      }
      
      // Restore steps 8-14 (the ones that were replaced)
      for (let i = 8; i <= 14; i++) {
        const templateStep = WORKFLOW_STEPS[i];
        if (templateStep) {
          newSteps.push({
            ...templateStep,
            status: 'pending',
            inputs: {},
            outputs: {}
          });
        }
      }
      
      // Check if there was a link-orchestration step with data
      const orchestrationStep = currentSteps.find((s: any) => s.id === 'link-orchestration');
      if (orchestrationStep && orchestrationStep.outputs) {
        // Try to extract data from the orchestration step to restore to individual steps
        const outputs = orchestrationStep.outputs;
        
        // Restore internal links data
        if (outputs.internalLinksLegacy || outputs.internalLinks) {
          const internalLinksStep = newSteps.find(s => s.id === 'internal-links');
          if (internalLinksStep) {
            internalLinksStep.status = 'completed';
            internalLinksStep.outputs = outputs.internalLinksLegacy || { links: outputs.internalLinks };
          }
        }
        
        // Restore client mention data
        if (outputs.clientMentionLegacy || outputs.clientMentions) {
          const clientMentionStep = newSteps.find(s => s.id === 'client-mention');
          if (clientMentionStep) {
            clientMentionStep.status = 'completed';
            clientMentionStep.outputs = outputs.clientMentionLegacy || { mentions: outputs.clientMentions };
          }
        }
        
        // Add similar restoration for other steps...
      }
      
      // Add the final email template step if it exists
      const emailStep = currentSteps.find((s: any) => s.id === 'email-template');
      if (emailStep) {
        newSteps.push(emailStep);
      } else if (WORKFLOW_STEPS[15]) {
        newSteps.push({
          ...WORKFLOW_STEPS[15],
          status: 'pending',
          inputs: {},
          outputs: {}
        });
      }
      
      content.steps = newSteps;
    }
    
    // Update the workflow
    await pool.query(
      'UPDATE workflows SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(content), id]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Steps restored successfully',
      stepCount: content.steps.length,
      steps: content.steps.map((s: any) => ({ id: s.id, title: s.title }))
    });
    
  } catch (error) {
    console.error('Error restoring steps:', error);
    return NextResponse.json(
      { error: 'Failed to restore steps' },
      { status: 500 }
    );
  }
}