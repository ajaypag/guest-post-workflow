import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { WORKFLOW_STEPS } from '@/types/workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the current workflow
    const result = await client.query(
      'SELECT * FROM workflows WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Workflow not found');
    }
    
    const workflow = result.rows[0];
    const content = workflow.content;
    const currentSteps = content.steps || [];
    
    // Create backup of current state
    const backup = {
      timestamp: new Date().toISOString(),
      steps: JSON.parse(JSON.stringify(currentSteps))
    };
    
    // Store backup in content
    if (!content.backups) {
      content.backups = [];
    }
    content.backups.push(backup);
    
    // Build recovered steps array
    const recoveredSteps = [];
    const dataRecovered: any = {};
    
    // Preserve steps 0-7 with all their data
    for (let i = 0; i <= 7; i++) {
      const existingStep = currentSteps[i];
      if (existingStep) {
        recoveredSteps.push(existingStep);
      } else {
        // Recreate from template if missing
        const templateStep = WORKFLOW_STEPS[i];
        if (templateStep) {
          recoveredSteps.push({
            ...templateStep,
            status: 'pending',
            inputs: {},
            outputs: {}
          });
        }
      }
    }
    
    // Check if there's an orchestration step with preserved data
    const orchestrationStep = currentSteps.find((s: any) => s.id === 'link-orchestration');
    const hasLegacyData = orchestrationStep?.outputs && 
      Object.keys(orchestrationStep.outputs).some(k => k.includes('Legacy'));
    
    // Recreate steps 8-14 and attempt to recover data
    for (let i = 8; i <= 14; i++) {
      const templateStep = WORKFLOW_STEPS[i];
      if (!templateStep) continue;
      
      const recoveredStep = {
        ...templateStep,
        status: 'pending',
        inputs: {},
        outputs: {}
      };
      
      // Try to recover data from orchestration step
      if (orchestrationStep?.outputs) {
        switch (templateStep.id) {
          case 'internal-links':
            if (orchestrationStep.outputs.internalLinksLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.internalLinksLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['internal-links'] = true;
            } else if (orchestrationStep.outputs.internalLinks) {
              recoveredStep.outputs = { links: orchestrationStep.outputs.internalLinks };
              recoveredStep.status = 'completed';
              dataRecovered['internal-links'] = true;
            }
            break;
            
          case 'client-mention':
            if (orchestrationStep.outputs.clientMentionLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.clientMentionLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['client-mention'] = true;
            } else if (orchestrationStep.outputs.clientMentions) {
              recoveredStep.outputs = { mentions: orchestrationStep.outputs.clientMentions };
              recoveredStep.status = 'completed';
              dataRecovered['client-mention'] = true;
            }
            break;
            
          case 'client-link':
            if (orchestrationStep.outputs.clientLinkLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.clientLinkLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['client-link'] = true;
            } else if (orchestrationStep.outputs.clientLink) {
              recoveredStep.outputs = { link: orchestrationStep.outputs.clientLink };
              recoveredStep.status = 'completed';
              dataRecovered['client-link'] = true;
            }
            break;
            
          case 'images':
            if (orchestrationStep.outputs.imagesLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.imagesLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['images'] = true;
            } else if (orchestrationStep.outputs.images) {
              recoveredStep.outputs = { images: orchestrationStep.outputs.images };
              recoveredStep.status = 'completed';
              dataRecovered['images'] = true;
            }
            break;
            
          case 'link-requests':
            if (orchestrationStep.outputs.linkRequestsLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.linkRequestsLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['link-requests'] = true;
            } else if (orchestrationStep.outputs.linkRequests) {
              recoveredStep.outputs = { requests: orchestrationStep.outputs.linkRequests };
              recoveredStep.status = 'completed';
              dataRecovered['link-requests'] = true;
            }
            break;
            
          case 'url-suggestion':
            if (orchestrationStep.outputs.urlSuggestionLegacy) {
              recoveredStep.outputs = orchestrationStep.outputs.urlSuggestionLegacy;
              recoveredStep.status = 'completed';
              dataRecovered['url-suggestion'] = true;
            } else if (orchestrationStep.outputs.urlSuggestion) {
              recoveredStep.outputs = { suggestion: orchestrationStep.outputs.urlSuggestion };
              recoveredStep.status = 'completed';
              dataRecovered['url-suggestion'] = true;
            }
            break;
        }
      }
      
      recoveredSteps.push(recoveredStep);
    }
    
    // Add email template step (step 15)
    const emailStep = currentSteps.find((s: any) => s.id === 'email-template');
    if (emailStep) {
      recoveredSteps.push(emailStep);
    } else {
      const templateStep = WORKFLOW_STEPS[15];
      if (templateStep) {
        recoveredSteps.push({
          ...templateStep,
          status: 'pending',
          inputs: {},
          outputs: {}
        });
      }
    }
    
    // Update the workflow
    content.steps = recoveredSteps;
    content.recoveredAt = new Date().toISOString();
    content.recoveryInfo = {
      stepsRecovered: Object.keys(dataRecovered).length,
      dataRecovered,
      hadLegacyData: hasLegacyData,
      originalStepCount: currentSteps.length,
      recoveredStepCount: recoveredSteps.length
    };
    
    await client.query(
      'UPDATE workflows SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(content), id]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      message: `Successfully restored workflow structure. Recovered data for ${Object.keys(dataRecovered).length} steps.`,
      details: {
        stepsRestored: recoveredSteps.length,
        dataRecovered: Object.keys(dataRecovered),
        backupCreated: true
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring workflow:', error);
    return NextResponse.json(
      { error: 'Failed to restore workflow' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}