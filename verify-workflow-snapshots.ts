import { db } from './lib/db/connection';
import { workflows } from './lib/db/schema';
import { sql } from 'drizzle-orm';

async function verifyWorkflowSnapshots() {
  console.log('=== WORKFLOW SNAPSHOT VERIFICATION ===\n');
  
  // Get a few workflows and examine their content structure
  const sampleWorkflows = await db.execute(sql`
    SELECT id, title, content, created_at, updated_at
    FROM workflows 
    WHERE content IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 3
  `);
  
  console.log(`Found ${sampleWorkflows.rows.length} workflows with content\n`);
  
  sampleWorkflows.rows.forEach((workflow: any, index: number) => {
    console.log(`--- Workflow ${index + 1} ---`);
    console.log(`ID: ${workflow.id}`);
    console.log(`Title: ${workflow.title}`);
    console.log(`Created: ${workflow.created_at}`);
    console.log(`Updated: ${workflow.updated_at}`);
    
    try {
      const content = JSON.parse(workflow.content);
      
      console.log('\n📋 Content Structure Analysis:');
      
      // Check if it has steps
      if (content.steps && Array.isArray(content.steps)) {
        console.log(`  Steps: ${content.steps.length} steps found`);
        
        // Look at domain-selection step specifically
        const domainStep = content.steps.find((s: any) => s.id === 'domain-selection');
        if (domainStep) {
          console.log('  Domain Selection Step:');
          console.log('    Step Definition:', JSON.stringify({
            id: domainStep.id,
            title: domainStep.title,
            hasFields: !!domainStep.fields,
            hasOutputs: !!domainStep.outputs,
            fieldCount: domainStep.fields ? domainStep.fields.length : 0
          }, null, 2));
          
          // Check if it has the complete UI definition
          if (domainStep.fields) {
            console.log('    Field Definitions:', domainStep.fields.length, 'fields');
            domainStep.fields.forEach((field: any, i: number) => {
              console.log(`      Field ${i + 1}:`, {
                type: field.type,
                label: field.label,
                key: field.key
              });
            });
          }
          
          if (domainStep.outputs) {
            console.log('    Current Outputs:', JSON.stringify(domainStep.outputs, null, 2));
          }
        } else {
          console.log('  ❌ No domain-selection step found');
        }
        
        // Check a few other steps for completeness
        const otherSteps = content.steps.slice(0, 3).filter((s: any) => s.id !== 'domain-selection');
        console.log(`  Other Steps (first 3): ${otherSteps.map((s: any) => s.id).join(', ')}`);
        
      } else {
        console.log('  ❌ No steps array found in content');
      }
      
      // Check metadata
      if (content.metadata) {
        console.log('\n📋 Metadata:');
        console.log('  Keys:', Object.keys(content.metadata));
      }
      
    } catch (e) {
      console.log('  ❌ Could not parse content JSON');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  });
  
  // Test the snapshot hypothesis
  console.log('🧪 SNAPSHOT HYPOTHESIS TEST:');
  console.log('If workflows are snapshots, then:');
  console.log('1. ✅ Content field contains complete step definitions');
  console.log('2. ✅ Each workflow has frozen field/UI configurations');
  console.log('3. ✅ Changes to step components only affect NEW workflows');
  console.log('4. ✅ Existing workflows continue using their stored definitions');
  
  console.log('\n🔍 VERIFICATION:');
  console.log('- Check if content contains complete step UI definitions');
  console.log('- Look for field definitions, validation rules, etc.');
  console.log('- Compare creation dates vs current step component code');
  
  process.exit(0);
}

verifyWorkflowSnapshots().catch(console.error);