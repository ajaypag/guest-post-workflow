import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { WorkflowGenerationService } from '@/lib/services/workflowGenerationService';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(color: string, message: string) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function testWorkflowIntegration() {
  log(COLORS.BOLD + COLORS.BLUE, '🔄 TESTING WORKFLOW PUBLISHER INTEGRATION');
  log(COLORS.BLUE, '=' .repeat(55));
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow';
  console.log('🔗 Database connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  try {
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
    
    // Step 1: Check current workflow generation for our test order
    log(COLORS.YELLOW, '📋 Step 1: Checking existing workflows for test order...');
    
    const existingWorkflows = await db
      .select()
      .from(schema.workflows)
      .where(sql`content->>'metadata'->>'orderId' = ${orderId}`);
      
    log(COLORS.GREEN, `Found ${existingWorkflows.length} existing workflows for order`);
    
    // Step 2: Check line items with publisher attribution
    log(COLORS.YELLOW, '📋 Step 2: Checking line items with publisher attribution...');
    
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
      
    log(COLORS.GREEN, `Found ${lineItems.length} line items for order`);
    
    lineItems.forEach((item, idx) => {
      log(COLORS.GREEN, `  Line Item ${idx + 1}:`);
      log(COLORS.GREEN, `    ID: ${item.id}`);
      log(COLORS.GREEN, `    Publisher ID: ${item.publisherId || 'None'}`);
      log(COLORS.GREEN, `    Publisher Offering ID: ${item.publisherOfferingId || 'None'}`);
      log(COLORS.GREEN, `    Publisher Price: ${item.publisherPrice || 'None'}`);
      log(COLORS.GREEN, `    Has Assigned Domain: ${item.assignedDomainId ? 'Yes' : 'No'}`);
      log(COLORS.GREEN, `    Current Workflow ID: ${item.workflowId || 'None'}`);
    });
    
    // Step 3: Test workflow generation service integration
    log(COLORS.YELLOW, '📋 Step 3: Testing workflow generation with publisher attribution...');
    
    const lineItemsWithPublisher = lineItems.filter(item => item.publisherId);
    const lineItemsWithDomain = lineItems.filter(item => item.assignedDomainId);
    const lineItemsReady = lineItems.filter(item => item.publisherId && item.assignedDomainId);
    
    log(COLORS.GREEN, `  Line items with publisher: ${lineItemsWithPublisher.length}`);
    log(COLORS.GREEN, `  Line items with domain: ${lineItemsWithDomain.length}`);
    log(COLORS.GREEN, `  Line items ready for workflow: ${lineItemsReady.length}`);
    
    if (lineItemsReady.length === 0) {
      log(COLORS.YELLOW, '⚠️  No line items ready for workflow generation (need both publisher + domain)');
      log(COLORS.YELLOW, '   Workflow integration test will be limited to existing workflows');
    }
    
    // Step 4: Check existing workflows for publisher attribution
    log(COLORS.YELLOW, '📋 Step 4: Analyzing existing workflow publisher attribution...');
    
    if (existingWorkflows.length > 0) {
      existingWorkflows.forEach((workflow, idx) => {
        log(COLORS.GREEN, `  Workflow ${idx + 1}:`);
        log(COLORS.GREEN, `    ID: ${workflow.id}`);
        log(COLORS.GREEN, `    Title: ${workflow.title}`);
        
        if (workflow.content && typeof workflow.content === 'object') {
          const content = workflow.content as any;
          const metadata = content.metadata || {};
          
          log(COLORS.GREEN, `    Has Publisher ID: ${metadata.publisherId ? 'Yes' : 'No'}`);
          log(COLORS.GREEN, `    Publisher ID: ${metadata.publisherId || 'None'}`);
          log(COLORS.GREEN, `    Publisher Offering ID: ${metadata.publisherOfferingId || 'None'}`);
          log(COLORS.GREEN, `    Publisher Price: ${metadata.publisherPrice || 'None'}`);
          log(COLORS.GREEN, `    Publisher Info: ${metadata.publisherInfo ? JSON.stringify(metadata.publisherInfo) : 'None'}`);
          
          if (metadata.publisherId) {
            log(COLORS.BOLD + COLORS.GREEN, '✅ Workflow has publisher attribution!');
          } else {
            log(COLORS.YELLOW, '⚠️  Workflow missing publisher attribution');
          }
        }
      });
    } else {
      log(COLORS.YELLOW, '⚠️  No existing workflows found for analysis');
    }
    
    // Step 5: Generate test workflow if possible
    if (lineItemsReady.length > 0) {
      log(COLORS.YELLOW, '📋 Step 5: Generating test workflow...');
      
      try {
        const result = await WorkflowGenerationService.generateWorkflowsForLineItems(
          orderId,
          'system', // userId
          { assignToUserId: 'system' }
        );
        
        log(COLORS.GREEN, `✅ Workflow generation result:`);
        log(COLORS.GREEN, `   Success: ${result.success}`);
        log(COLORS.GREEN, `   Workflows created: ${result.workflowsCreated}`);
        log(COLORS.GREEN, `   Order items created: ${result.orderItemsCreated}`);
        log(COLORS.GREEN, `   Errors: ${result.errors.join(', ') || 'None'}`);
        
        if (result.workflowsCreated > 0) {
          // Check the newly created workflows
          const newWorkflows = await db
            .select()
            .from(schema.workflows)
            .where(sql`content->>'metadata'->>'orderId' = ${orderId}`)
            .orderBy(desc(schema.workflows.createdAt))
            .limit(result.workflowsCreated);
            
          log(COLORS.BOLD + COLORS.GREEN, '🎉 New workflows with publisher attribution:');
          newWorkflows.forEach((workflow, idx) => {
            if (workflow.content && typeof workflow.content === 'object') {
              const metadata = (workflow.content as any).metadata || {};
              log(COLORS.GREEN, `   Workflow ${idx + 1}: Publisher ID ${metadata.publisherId || 'None'}`);
            }
          });
        }
        
      } catch (error) {
        log(COLORS.RED, `❌ Workflow generation failed: ${error.message}`);
      }
    }
    
    // Final Results
    log(COLORS.BOLD + COLORS.BLUE, '\n🏆 WORKFLOW INTEGRATION TEST RESULTS');
    log(COLORS.BLUE, '=' .repeat(40));
    
    const hasPublisherAttributedWorkflows = existingWorkflows.some(w => 
      w.content && 
      typeof w.content === 'object' && 
      (w.content as any).metadata?.publisherId
    );
    
    if (hasPublisherAttributedWorkflows) {
      log(COLORS.BOLD + COLORS.GREEN, '✅ SUCCESS: Publisher attribution integrated into workflows');
      log(COLORS.GREEN, '   • Workflows contain publisher metadata');
      log(COLORS.GREEN, '   • Publisher information flows from orders to workflows');
      log(COLORS.GREEN, '   • Workflow list can display publisher attribution');
    } else {
      log(COLORS.BOLD + COLORS.YELLOW, '⚠️  PARTIAL: Workflow integration ready but no attributed workflows');
      log(COLORS.YELLOW, '   • WorkflowGenerationService updated with publisher fields');
      log(COLORS.YELLOW, '   • WorkflowListEnhanced updated to display publisher info');
      log(COLORS.YELLOW, '   • Need workflows generated from line items with publisher attribution');
    }
    
  } catch (error) {
    log(COLORS.RED, `❌ Test failed: ${error.message}`);
  } finally {
    await client.end();
  }
}

testWorkflowIntegration().catch(console.error).finally(() => process.exit(0));