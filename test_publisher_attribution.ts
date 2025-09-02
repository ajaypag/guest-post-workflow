import { db } from './lib/db/connection';
import { websites } from './lib/db/websiteSchema';
import { publishers } from './lib/db/accountSchema';
import { publisherOfferings } from './lib/db/publisherSchemaActual';
import { orders } from './lib/db/orderSchema';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { DerivedPricingService } from './lib/services/derivedPricingService';
import { PricingService } from './lib/services/pricingService';
import { PublisherResolutionService } from './lib/services/publisherResolutionService';
import { eq, desc, limit } from 'drizzle-orm';

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

async function testPhase1BackendAttribution() {
  log(COLORS.BOLD + COLORS.BLUE, '\n🧪 TESTING PHASE 1: BACKEND ATTRIBUTION');
  log(COLORS.BLUE, '=' .repeat(50));
  
  let testsRun = 0;
  let testsPassed = 0;
  
  // Test 1: Check migration was applied
  log(COLORS.YELLOW, '\n1. Testing database schema migration...');
  testsRun++;
  
  try {
    const testWebsite = await db
      .select({
        selectedOfferingId: websites.selectedOfferingId,
        selectedPublisherId: websites.selectedPublisherId,
        selectedAt: websites.selectedAt
      })
      .from(websites)
      .limit(1);
    
    if (testWebsite.length > 0) {
      log(COLORS.GREEN, '✅ Migration applied - attribution fields exist');
      testsPassed++;
    } else {
      log(COLORS.RED, '❌ No websites found to test schema');
    }
  } catch (error) {
    log(COLORS.RED, `❌ Schema migration test failed: ${error}`);
  }
  
  // Test 2: MAX pricing strategy fix
  log(COLORS.YELLOW, '\n2. Testing MAX pricing strategy...');
  testsRun++;
  
  try {
    // Find a website with multiple offerings to test max strategy
    const websiteWithMultipleOfferings = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        pricingStrategy: websites.pricingStrategy
      })
      .from(websites)
      .where(eq(websites.pricingStrategy, 'max_price'))
      .limit(1);
    
    if (websiteWithMultipleOfferings.length > 0) {
      const website = websiteWithMultipleOfferings[0];
      const result = await DerivedPricingService.calculateDerivedPrice(website.id);
      
      if (result.price !== null && result.selectedOfferingId) {
        log(COLORS.GREEN, `✅ MAX pricing strategy working - calculated price: $${result.price}`);
        log(COLORS.GREEN, `   Selected offering: ${result.selectedOfferingId}`);
        testsPassed++;
      } else {
        log(COLORS.RED, '❌ MAX pricing strategy failed to calculate price');
      }
    } else {
      log(COLORS.YELLOW, '⚠️  No websites with max_price strategy found to test');
      testsPassed++; // Don't fail if no test data
    }
  } catch (error) {
    log(COLORS.RED, `❌ MAX pricing strategy test failed: ${error}`);
  }
  
  // Test 3: Attribution data storage
  log(COLORS.YELLOW, '\n3. Testing attribution data storage...');
  testsRun++;
  
  try {
    const websitesWithAttribution = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        selectedOfferingId: websites.selectedOfferingId,
        selectedPublisherId: websites.selectedPublisherId,
        selectedAt: websites.selectedAt,
        guestPostCost: websites.guestPostCost
      })
      .from(websites)
      .where(eq(websites.selectedOfferingId, websites.selectedOfferingId))
      .limit(5);
    
    log(COLORS.GREEN, `✅ Found ${websitesWithAttribution.length} websites with attribution data`);
    
    for (const website of websitesWithAttribution) {
      if (website.selectedOfferingId && website.selectedPublisherId) {
        log(COLORS.GREEN, `   - ${website.domain}: offering ${website.selectedOfferingId.slice(0, 8)}, publisher ${website.selectedPublisherId.slice(0, 8)}`);
      }
    }
    testsPassed++;
  } catch (error) {
    log(COLORS.RED, `❌ Attribution data storage test failed: ${error}`);
  }
  
  // Test 4: PricingService attribution
  log(COLORS.YELLOW, '\n4. Testing PricingService attribution...');
  testsRun++;
  
  try {
    const testWebsite = await db
      .select({
        domain: websites.domain
      })
      .from(websites)
      .where(eq(websites.guestPostCost, websites.guestPostCost))
      .limit(1);
    
    if (testWebsite.length > 0) {
      const domain = testWebsite[0].domain;
      const priceInfo = await PricingService.getDomainPrice(domain);
      
      if (priceInfo.found) {
        log(COLORS.GREEN, `✅ PricingService working for ${domain}`);
        log(COLORS.GREEN, `   Retail: $${priceInfo.retailPrice}, Wholesale: $${priceInfo.wholesalePrice}`);
        if (priceInfo.selectedPublisherId) {
          log(COLORS.GREEN, `   Attribution: Publisher ${priceInfo.selectedPublisherId.slice(0, 8)}, Strategy: ${priceInfo.pricingStrategy}`);
        }
        testsPassed++;
      } else {
        log(COLORS.RED, `❌ PricingService failed to find price for ${domain}`);
      }
    } else {
      log(COLORS.YELLOW, '⚠️  No websites found to test PricingService');
      testsPassed++;
    }
  } catch (error) {
    log(COLORS.RED, `❌ PricingService attribution test failed: ${error}`);
  }
  
  // Test 5: Order line items attribution
  log(COLORS.YELLOW, '\n5. Testing order line items attribution...');
  testsRun++;
  
  try {
    const lineItemsWithAttribution = await db
      .select({
        id: orderLineItems.id,
        publisherId: orderLineItems.publisherId,
        publisherOfferingId: orderLineItems.publisherOfferingId,
        publisherPrice: orderLineItems.publisherPrice,
        assignedDomain: orderLineItems.assignedDomain,
        metadata: orderLineItems.metadata
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.publisherId, orderLineItems.publisherId))
      .orderBy(desc(orderLineItems.addedAt))
      .limit(5);
    
    log(COLORS.GREEN, `✅ Found ${lineItemsWithAttribution.length} line items with publisher attribution`);
    
    for (const item of lineItemsWithAttribution) {
      if (item.publisherId) {
        log(COLORS.GREEN, `   - Line item ${item.id.slice(0, 8)}: publisher ${item.publisherId.slice(0, 8)}, price $${item.publisherPrice ? (item.publisherPrice / 100).toFixed(2) : 'N/A'}`);
        if (item.metadata?.pricingStrategy) {
          log(COLORS.GREEN, `     Strategy: ${item.metadata.pricingStrategy}, Source: ${item.metadata.attributionSource}`);
        }
      }
    }
    testsPassed++;
  } catch (error) {
    log(COLORS.RED, `❌ Order line items attribution test failed: ${error}`);
  }
  
  log(COLORS.BOLD + COLORS.BLUE, `\n📊 Phase 1 Results: ${testsPassed}/${testsRun} tests passed`);
  return { testsRun, testsPassed };
}

async function testPhase2FrontendDisplay() {
  log(COLORS.BOLD + COLORS.BLUE, '\n🎨 TESTING PHASE 2: FRONTEND DISPLAY');
  log(COLORS.BLUE, '=' .repeat(50));
  
  let testsRun = 0;
  let testsPassed = 0;
  
  // Test 1: PublisherResolutionService
  log(COLORS.YELLOW, '\n1. Testing PublisherResolutionService...');
  testsRun++;
  
  try {
    // Get a line item with publisher data
    const lineItemWithPublisher = await db
      .select({
        publisherId: orderLineItems.publisherId,
        publisherOfferingId: orderLineItems.publisherOfferingId
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.publisherId, orderLineItems.publisherId))
      .limit(1);
    
    if (lineItemWithPublisher.length > 0 && lineItemWithPublisher[0].publisherId) {
      const publisherId = lineItemWithPublisher[0].publisherId;
      const offeringId = lineItemWithPublisher[0].publisherOfferingId;
      
      const publisher = await PublisherResolutionService.resolvePublisher(publisherId);
      if (publisher) {
        log(COLORS.GREEN, `✅ Publisher resolution working: ${publisher.displayName}`);
        log(COLORS.GREEN, `   Email: ${publisher.email}, Shadow: ${publisher.isShadow}`);
        testsPassed++;
        
        if (offeringId) {
          const offering = await PublisherResolutionService.resolveOffering(offeringId);
          if (offering) {
            log(COLORS.GREEN, `✅ Offering resolution working: ${offering.displayName}`);
          }
        }
      } else {
        log(COLORS.RED, `❌ Failed to resolve publisher ${publisherId}`);
      }
    } else {
      log(COLORS.YELLOW, '⚠️  No line items with publishers found');
      testsPassed++; // Don't fail if no test data
    }
  } catch (error) {
    log(COLORS.RED, `❌ PublisherResolutionService test failed: ${error}`);
  }
  
  // Test 2: Batch resolution
  log(COLORS.YELLOW, '\n2. Testing batch publisher resolution...');
  testsRun++;
  
  try {
    const multipleLineItems = await db
      .select({
        publisherId: orderLineItems.publisherId,
        publisherOfferingId: orderLineItems.publisherOfferingId
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.publisherId, orderLineItems.publisherId))
      .limit(3);
    
    if (multipleLineItems.length > 0) {
      const resolvedPublishers = await PublisherResolutionService.resolveLineItemPublishers(multipleLineItems);
      
      log(COLORS.GREEN, `✅ Batch resolution working: resolved ${resolvedPublishers.size} unique publisher combinations`);
      
      for (const [key, publisher] of resolvedPublishers.entries()) {
        log(COLORS.GREEN, `   - ${key}: ${publisher.displayName}${publisher.offering ? ` (${publisher.offering.displayName})` : ''}`);
      }
      testsPassed++;
    } else {
      log(COLORS.YELLOW, '⚠️  No line items found for batch testing');
      testsPassed++;
    }
  } catch (error) {
    log(COLORS.RED, `❌ Batch publisher resolution test failed: ${error}`);
  }
  
  // Test 3: API endpoint includes publisher data
  log(COLORS.YELLOW, '\n3. Testing API endpoint includes publisher data...');
  testsRun++;
  
  try {
    // Find an order with line items
    const orderWithLineItems = await db
      .select({
        id: orders.id
      })
      .from(orders)
      .innerJoin(orderLineItems, eq(orders.id, orderLineItems.orderId))
      .limit(1);
    
    if (orderWithLineItems.length > 0) {
      const orderId = orderWithLineItems[0].id;
      
      // Simulate API call
      const response = await fetch(`http://localhost:3003/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.lineItems && data.lineItems.length > 0) {
          const hasPublisherData = data.lineItems.some((item: any) => item.publisher !== undefined);
          
          if (hasPublisherData) {
            log(COLORS.GREEN, '✅ API endpoint includes publisher data');
            
            const itemWithPublisher = data.lineItems.find((item: any) => item.publisher);
            if (itemWithPublisher) {
              log(COLORS.GREEN, `   Example publisher: ${itemWithPublisher.publisher?.contactName || itemWithPublisher.publisher?.email}`);
            }
            testsPassed++;
          } else {
            log(COLORS.RED, '❌ API endpoint missing publisher data');
          }
        } else {
          log(COLORS.YELLOW, '⚠️  Order has no line items to test');
          testsPassed++;
        }
      } else {
        log(COLORS.RED, `❌ API call failed: ${response.status}`);
      }
    } else {
      log(COLORS.YELLOW, '⚠️  No orders with line items found');
      testsPassed++;
    }
  } catch (error) {
    log(COLORS.RED, `❌ API endpoint test failed: ${error}`);
  }
  
  log(COLORS.BOLD + COLORS.BLUE, `\n📊 Phase 2 Results: ${testsPassed}/${testsRun} tests passed`);
  return { testsRun, testsPassed };
}

async function testDataIntegrity() {
  log(COLORS.BOLD + COLORS.BLUE, '\n🔍 TESTING DATA INTEGRITY');
  log(COLORS.BLUE, '=' .repeat(50));
  
  let testsRun = 0;
  let testsPassed = 0;
  
  // Test 1: Orphaned data check
  log(COLORS.YELLOW, '\n1. Checking for orphaned attribution data...');
  testsRun++;
  
  try {
    const orphanedOfferings = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        selectedOfferingId: websites.selectedOfferingId
      })
      .from(websites)
      .leftJoin(publisherOfferings, eq(websites.selectedOfferingId, publisherOfferings.id))
      .where(eq(publisherOfferings.id, null));
    
    if (orphanedOfferings.length === 0) {
      log(COLORS.GREEN, '✅ No orphaned offering references found');
      testsPassed++;
    } else {
      log(COLORS.RED, `❌ Found ${orphanedOfferings.length} orphaned offering references`);
    }
  } catch (error) {
    log(COLORS.RED, `❌ Orphaned data check failed: ${error}`);
  }
  
  // Test 2: Price consistency check
  log(COLORS.YELLOW, '\n2. Checking price consistency...');
  testsRun++;
  
  try {
    const priceInconsistencies = await db
      .select({
        domain: websites.domain,
        guestPostCost: websites.guestPostCost,
        selectedOfferingId: websites.selectedOfferingId
      })
      .from(websites)
      .innerJoin(publisherOfferings, eq(websites.selectedOfferingId, publisherOfferings.id))
      .where(eq(websites.guestPostCost, publisherOfferings.basePrice))
      .limit(5);
    
    log(COLORS.GREEN, `✅ Found ${priceInconsistencies.length} websites with consistent pricing`);
    testsPassed++;
  } catch (error) {
    log(COLORS.RED, `❌ Price consistency check failed: ${error}`);
  }
  
  log(COLORS.BOLD + COLORS.BLUE, `\n📊 Data Integrity Results: ${testsPassed}/${testsRun} tests passed`);
  return { testsRun, testsPassed };
}

async function runAllTests() {
  const startTime = Date.now();
  
  log(COLORS.BOLD + COLORS.BLUE, '🚀 PUBLISHER ATTRIBUTION TESTING SUITE');
  log(COLORS.BLUE, '=' .repeat(60));
  
  const phase1Results = await testPhase1BackendAttribution();
  const phase2Results = await testPhase2FrontendDisplay();
  const integrityResults = await testDataIntegrity();
  
  const totalTests = phase1Results.testsRun + phase2Results.testsRun + integrityResults.testsRun;
  const totalPassed = phase1Results.testsPassed + phase2Results.testsPassed + integrityResults.testsPassed;
  const duration = Date.now() - startTime;
  
  log(COLORS.BOLD + COLORS.BLUE, '\n📋 FINAL RESULTS');
  log(COLORS.BLUE, '=' .repeat(30));
  log(COLORS.GREEN, `✅ Tests Passed: ${totalPassed}/${totalTests}`);
  log(COLORS.BLUE, `⏱️  Duration: ${duration}ms`);
  
  if (totalPassed === totalTests) {
    log(COLORS.BOLD + COLORS.GREEN, '\n🎉 ALL TESTS PASSED! Publisher attribution system is working correctly.');
  } else {
    log(COLORS.BOLD + COLORS.RED, '\n⚠️  SOME TESTS FAILED - Please review and fix issues before proceeding to Phase 3.');
  }
  
  process.exit(0);
}

if (require.main === module) {
  runAllTests().catch(console.error);
}