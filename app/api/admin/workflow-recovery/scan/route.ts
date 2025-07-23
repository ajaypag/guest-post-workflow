import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, title, content, created_at, updated_at 
      FROM workflows 
      ORDER BY updated_at DESC
    `);
    
    const workflows = result.rows.map(row => {
      const content = row.content;
      const steps = content?.steps || [];
      
      // Check if this workflow has been affected by migration
      const hasOrchestrationStep = steps.some((step: any) => step.id === 'link-orchestration');
      const expectedStepCount = 16; // Original workflow has 16 steps (0-15)
      const currentStepCount = steps.length;
      
      // Extract data preview from key steps
      const dataPreview: any = {};
      steps.forEach((step: any) => {
        if (step.outputs && Object.keys(step.outputs).length > 0) {
          dataPreview[step.id] = {
            hasData: true,
            fields: Object.keys(step.outputs)
          };
        }
      });
      
      return {
        id: row.id,
        title: row.title,
        stepCount: currentStepCount,
        hasOrchestrationStep,
        isMigrated: hasOrchestrationStep && currentStepCount < expectedStepCount,
        dataPreview,
        updatedAt: row.updated_at,
        createdAt: row.created_at
      };
    });
    
    return NextResponse.json({ workflows });
    
  } catch (error) {
    console.error('Error scanning workflows:', error);
    return NextResponse.json(
      { error: 'Failed to scan workflows' },
      { status: 500 }
    );
  }
}