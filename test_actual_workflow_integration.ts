import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { eq } from 'drizzle-orm';
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

async function testActualWorkflowIntegration() {
  log(COLORS.BOLD + COLORS.BLUE, '🎯 ACTUAL WORKFLOW PUBLISHER INTEGRATION TEST');
  log(COLORS.BLUE, '=' .repeat(55));
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_order_flow';
  console.log('🔗 Database connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));
  
  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client, { schema });
  
  try {
    const orderId = 'b4e262ad-4a72-405c-bde6-262211905518';
    
    // Step 1: Temporarily assign a domain to one line item so we can generate a workflow
    log(COLORS.YELLOW, '📋 Step 1: Setting up line item with domain for workflow generation...');
    
    const { orderLineItems } = await import('@/lib/db/orderLineItemSchema');
    const { bulkAnalysisDomains } = await import('@/lib/db/bulkAnalysisSchema');
    
    // Get line items with publisher attribution
    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
      
    const lineItemWithPublisher = lineItems.find(item => item.publisherId);
    
    if (!lineItemWithPublisher) {
      log(COLORS.RED, '❌ No line items with publisher found');
      return;
    }
    
    log(COLORS.GREEN, `Found line item with publisher: ${lineItemWithPublisher.publisherId}`);
    log(COLORS.GREEN, `Publisher price: $${(lineItemWithPublisher.publisherPrice / 100).toFixed(2)}`);
    
    // Find any domain we can assign temporarily
    const availableDomain = await db
      .select()
      .from(bulkAnalysisDomains)
      .limit(1);
      
    if (availableDomain.length === 0) {
      log(COLORS.RED, '❌ No domains available for assignment');
      return;
    }
    
    const testDomain = availableDomain[0];
    log(COLORS.GREEN, `Using test domain: ${testDomain.domain}`);
    
    // Temporarily assign domain to line item
    await db
      .update(orderLineItems)
      .set({ assignedDomainId: testDomain.id })
      .where(eq(orderLineItems.id, lineItemWithPublisher.id));
      
    log(COLORS.GREEN, '✅ Domain temporarily assigned to line item');
    
    // Step 2: Generate workflow and verify publisher attribution flows through
    log(COLORS.YELLOW, '📋 Step 2: Generating workflow to test publisher attribution...');
    
    const result = await WorkflowGenerationService.generateWorkflowsForLineItems(
      orderId,
      'system', // userId
      { assignToUserId: 'system' }
    );
    
    log(COLORS.GREEN, `Workflow generation result:`);
    log(COLORS.GREEN, `   Success: ${result.success}`);
    log(COLORS.GREEN, `   Workflows created: ${result.workflowsCreated}`);
    log(COLORS.GREEN, `   Errors: ${result.errors.join(', ') || 'None'}`);
    
    if (result.workflowsCreated === 0) {
      log(COLORS.RED, '❌ No workflows were created - cannot test attribution');
      return;
    }
    
    // Step 3: Get the newly created workflow and inspect its publisher attribution
    log(COLORS.YELLOW, '📋 Step 3: Inspecting created workflow for publisher attribution...');
    
    // Get updated line item to find workflow ID
    const updatedLineItem = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItemWithPublisher.id))
      .limit(1);
      
    if (updatedLineItem.length === 0 || !updatedLineItem[0].workflowId) {
      log(COLORS.RED, '❌ Line item does not have workflow ID assigned');
      return;
    }
    
    const workflowId = updatedLineItem[0].workflowId;
    log(COLORS.GREEN, `Found workflow ID: ${workflowId}`);
    
    // Get the workflow from database
    const workflow = await db
      .select()
      .from(schema.workflows)
      .where(eq(schema.workflows.id, workflowId))
      .limit(1);
      
    if (workflow.length === 0) {
      log(COLORS.RED, '❌ Workflow not found in database');
      return;
    }
    
    const workflowData = workflow[0];
    log(COLORS.GREEN, `Workflow found: ${workflowData.title}`);
    
    // Step 4: THE ACTUAL TEST - Inspect workflow content for publisher attribution
    log(COLORS.BOLD + COLORS.YELLOW, '📋 Step 4: ACTUAL PUBLISHER ATTRIBUTION TEST');
    log(COLORS.YELLOW, '=' .repeat(50));
    
    if (!workflowData.content || typeof workflowData.content !== 'object') {
      log(COLORS.RED, '❌ Workflow content is missing or invalid');
      return;
    }
    
    const content = workflowData.content as any;
    const metadata = content.metadata || {};
    
    // Test each publisher field
    const tests = [
      {
        name: 'Publisher ID',
        expected: lineItemWithPublisher.publisherId,
        actual: metadata.publisherId,
        pass: metadata.publisherId === lineItemWithPublisher.publisherId
      },
      {
        name: 'Publisher Offering ID', 
        expected: lineItemWithPublisher.publisherOfferingId,
        actual: metadata.publisherOfferingId,
        pass: metadata.publisherOfferingId === lineItemWithPublisher.publisherOfferingId
      },
      {
        name: 'Publisher Price',
        expected: lineItemWithPublisher.publisherPrice,
        actual: metadata.publisherPrice,
        pass: metadata.publisherPrice === lineItemWithPublisher.publisherPrice
      },
      {
        name: 'Publisher Info Object',
        expected: 'object with id, offeringId, price',
        actual: metadata.publisherInfo ? JSON.stringify(metadata.publisherInfo) : null,
        pass: metadata.publisherInfo && 
              metadata.publisherInfo.id === lineItemWithPublisher.publisherId &&
              metadata.publisherInfo.price === lineItemWithPublisher.publisherPrice
      }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
      if (test.pass) {
        log(COLORS.BOLD + COLORS.GREEN, `✅ ${test.name}: PASS`);
        log(COLORS.GREEN, `   Expected: ${test.expected}`);
        log(COLORS.GREEN, `   Actual: ${test.actual}`);
        passedTests++;
      } else {
        log(COLORS.BOLD + COLORS.RED, `❌ ${test.name}: FAIL`);
        log(COLORS.RED, `   Expected: ${test.expected}`);
        log(COLORS.RED, `   Actual: ${test.actual}`);
      }
    });
    
    // Step 5: Clean up - remove temporary domain assignment
    log(COLORS.YELLOW, '📋 Step 5: Cleaning up temporary domain assignment...');
    
    await db
      .update(orderLineItems)
      .set({ assignedDomainId: null })
      .where(eq(orderLineItems.id, lineItemWithPublisher.id));
      
    log(COLORS.GREEN, '✅ Cleanup complete');
    
    // Final verdict
    log(COLORS.BOLD + COLORS.BLUE, '\n🏆 ACTUAL INTEGRATION TEST RESULTS');
    log(COLORS.BLUE, '=' .repeat(40));
    
    if (passedTests === tests.length) {
      log(COLORS.BOLD + COLORS.GREEN, '🎉 PHASE 3 ACTUALLY COMPLETE!');
      log(COLORS.GREEN, '✅ Publisher attribution successfully flows from line items to workflows');
      log(COLORS.GREEN, '✅ All publisher fields correctly populated in workflow metadata');
      log(COLORS.GREEN, '✅ WorkflowGenerationService integration verified');
      log(COLORS.GREEN, `✅ ${passedTests}/${tests.length} attribution tests passed`);
    } else {
      log(COLORS.BOLD + COLORS.RED, '❌ PHASE 3 INTEGRATION FAILED!');
      log(COLORS.RED, `❌ Only ${passedTests}/${tests.length} attribution tests passed`);
      log(COLORS.RED, '❌ Publisher attribution not flowing correctly to workflows');
    }
    
  } catch (error) {
    log(COLORS.RED, `❌ Test failed: ${error.message}`);
    console.error(error);
  } finally {
    await client.end();
  }
}

testActualWorkflowIntegration().catch(console.error).finally(() => process.exit(0));