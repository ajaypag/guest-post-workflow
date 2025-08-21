import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';

async function checkDomainData() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  const domainName = 'naturaplug.com';
  
  try {
    // Check line items for this domain
    console.log('\n=== LINE ITEMS WITH NATURAPLUG.COM ===\n');
    const lineItems = await db
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));
    
    const naturalPlugItems = lineItems.filter(item => 
      item.assignedDomain?.toLowerCase().includes('naturaplug') ||
      item.metadata?.toString().toLowerCase().includes('naturaplug')
    );
    
    if (naturalPlugItems.length > 0) {
      naturalPlugItems.forEach(item => {
        console.log('Line Item:', item.id);
        console.log('  Assigned Domain ID:', item.assignedDomainId);
        console.log('  Assigned Domain:', item.assignedDomain);
        console.log('  Estimated Price:', item.estimatedPrice, '(cents)');
        console.log('  Wholesale Price:', item.wholesalePrice, '(cents)');
        console.log('  Retail Price:', item.retailPrice, '(cents)');
        console.log('  Metadata:', JSON.stringify(item.metadata, null, 2));
        console.log('---');
      });
    } else {
      console.log('No line items found with naturaplug.com');
    }
    
    // Check bulk analysis domains table
    console.log('\n=== BULK ANALYSIS DOMAIN DATA ===\n');
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.domain, domainName))
      .limit(5);
    
    if (domains.length > 0) {
      domains.forEach(domain => {
        console.log('Domain ID:', domain.id);
        console.log('  Domain:', domain.domain);
        console.log('  DR:', domain.domainRating);
        console.log('  Traffic:', domain.traffic);
        console.log('  Price:', domain.price);
        console.log('  Guest Post Cost:', domain.guestPostCost);
        console.log('  Estimated Price:', domain.estimatedPrice);
        console.log('  Wholesale Price:', domain.wholesalePrice);
        console.log('  Project ID:', domain.projectId);
        console.log('  Client ID:', domain.clientId);
        console.log('  Has DataForSEO Results:', domain.hasDataForSeoResults);
        console.log('  DataForSEO Count:', domain.dataForSeoResultsCount);
        console.log('  Qualification Status:', domain.qualificationStatus);
        console.log('---');
      });
    } else {
      console.log('No domain found in bulk analysis domains table');
    }
    
    // Find the specific assigned domain
    console.log('\n=== CHECKING ASSIGNED DOMAIN ID ===\n');
    const itemWithDomain = lineItems.find(item => item.assignedDomainId);
    if (itemWithDomain && itemWithDomain.assignedDomainId) {
      console.log('Found assigned domain ID:', itemWithDomain.assignedDomainId);
      
      const assignedDomain = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(eq(bulkAnalysisDomains.id, itemWithDomain.assignedDomainId));
      
      if (assignedDomain.length > 0) {
        console.log('Assigned Domain Details:');
        console.log('  Domain:', assignedDomain[0].domain);
        console.log('  DR:', assignedDomain[0].domainRating);
        console.log('  Traffic:', assignedDomain[0].traffic);
        console.log('  Price:', assignedDomain[0].price);
        console.log('  Guest Post Cost:', assignedDomain[0].guestPostCost);
        console.log('  Estimated Price:', assignedDomain[0].estimatedPrice);
        console.log('  Wholesale Price:', assignedDomain[0].wholesalePrice);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDomainData();