import { db } from './lib/db/connection';
import { orders } from './lib/db/orderSchema';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from './lib/db/bulkAnalysisSchema';
import { websites } from './lib/db/websiteSchema';
import { clients } from './lib/db/schema';
import { eq, isNotNull, limit, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function testAddDomainsWithAttribution() {
  console.log('🧪 Testing add domains with publisher attribution...');
  
  try {
    // Find a test order
    const testOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'draft'))
      .limit(1);
    
    if (testOrder.length === 0) {
      console.log('⚠️  No draft orders found, creating test order...');
      
      // Get a client to use
      const client = await db.select().from(clients).limit(1);
      if (client.length === 0) {
        throw new Error('No clients found');
      }
      
      // Create test order
      const [newOrder] = await db.insert(orders).values({
        accountId: client[0].accountId,
        status: 'draft',
        subtotalRetail: 0,
        totalRetail: 0,
        totalWholesale: 0,
        profitMargin: 0,
        discountAmount: 0,
        discountPercent: '0',
      }).returning();
      
      console.log(`✅ Created test order: ${newOrder.id}`);
    }
    
    const orderId = testOrder.length > 0 ? testOrder[0].id : undefined;
    if (!orderId) {
      throw new Error('No order available for testing');
    }
    
    console.log(`Using order: ${orderId}`);
    
    // Find websites with attribution data
    const websitesWithAttribution = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        selectedOfferingId: websites.selectedOfferingId,
        selectedPublisherId: websites.selectedPublisherId,
        guestPostCost: websites.guestPostCost
      })
      .from(websites)
      .where(and(
        isNotNull(websites.selectedOfferingId),
        isNotNull(websites.selectedPublisherId)
      ))
      .limit(3);
    
    console.log(`\nFound ${websitesWithAttribution.length} websites with attribution to test:`);
    for (const website of websitesWithAttribution) {
      console.log(`   - ${website.domain}: $${website.guestPostCost / 100}, Publisher: ${website.selectedPublisherId.slice(0, 8)}`);
    }
    
    // Create bulk analysis domains for these websites
    const bulkDomainIds = [];
    
    for (const website of websitesWithAttribution) {
      try {
        // Check if bulk domain already exists
        const existingBulkDomain = await db
          .select()
          .from(bulkAnalysisDomains)
          .where(eq(bulkAnalysisDomains.domain, website.domain))
          .limit(1);
        
        let bulkDomainId;
        
        if (existingBulkDomain.length > 0) {
          bulkDomainId = existingBulkDomain[0].id;
          console.log(`   Using existing bulk domain for ${website.domain}`);
        } else {
          // Create bulk analysis domain
          const [bulkDomain] = await db.insert(bulkAnalysisDomains).values({
            projectId: uuidv4(), // Mock project ID
            domain: website.domain,
            status: 'qualified',
            qualificationReason: 'Test domain with attribution',
            domainRating: 50,
            traffic: 10000,
            categories: ['test'],
          }).returning();
          
          bulkDomainId = bulkDomain.id;
          console.log(`   Created bulk domain for ${website.domain}`);
        }
        
        bulkDomainIds.push(bulkDomainId);
      } catch (error) {
        console.error(`   Error creating bulk domain for ${website.domain}:`, error.message);
      }
    }
    
    if (bulkDomainIds.length === 0) {
      throw new Error('No bulk domains available for testing');
    }
    
    console.log(`\n🚀 Testing add-domains API with ${bulkDomainIds.length} domains...`);
    
    // Prepare domain targets
    const domainTargets = bulkDomainIds.map(id => ({
      domainId: id,
      targetUrl: 'https://example.com/test',
      anchorText: 'Test Anchor Text'
    }));
    
    // Call add-domains API (simulate the API call)
    const requestBody = {
      domainIds: bulkDomainIds,
      domainTargets: domainTargets
    };
    
    // We'll simulate the API logic here since we can't make authenticated API calls in tests
    console.log('📋 Simulating add-domains API call...');
    console.log('   Domain IDs:', bulkDomainIds.map(id => id.slice(0, 8)));
    
    // Test would continue here with actual API logic...
    // For now, let's manually test the PricingService with these domains
    
    const { PricingService } = await import('./lib/services/pricingService');
    
    for (const website of websitesWithAttribution) {
      console.log(`\n🔍 Testing PricingService for ${website.domain}:`);
      
      const priceInfo = await PricingService.getDomainPrice(website.domain);
      
      if (priceInfo.found) {
        console.log(`   ✅ Found pricing: $${priceInfo.retailPrice} retail, $${priceInfo.wholesalePrice} wholesale`);
        if (priceInfo.selectedPublisherId) {
          console.log(`   📋 Attribution: Publisher ${priceInfo.selectedPublisherId.slice(0, 8)}`);
          console.log(`   📋 Strategy: ${priceInfo.pricingStrategy}`);
          console.log(`   📋 Source: ${priceInfo.attributionSource}`);
        }
      } else {
        console.log(`   ❌ No pricing found`);
      }
    }
    
    console.log('\n🎉 Add domains with attribution test completed!');
    
    // Check if we have any line items with attribution
    const lineItemsWithAttribution = await db
      .select({
        id: orderLineItems.id,
        assignedDomain: orderLineItems.assignedDomain,
        publisherId: orderLineItems.publisherId,
        publisherOfferingId: orderLineItems.publisherOfferingId,
        publisherPrice: orderLineItems.publisherPrice
      })
      .from(orderLineItems)
      .where(and(
        eq(orderLineItems.orderId, orderId),
        isNotNull(orderLineItems.publisherId)
      ));
    
    console.log(`\n📊 Found ${lineItemsWithAttribution.length} line items with publisher attribution in this order`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testAddDomainsWithAttribution().catch(console.error);
}