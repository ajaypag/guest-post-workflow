import { db } from '../lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '../lib/db/schema';
import { eq, sql, isNotNull, and } from 'drizzle-orm';

async function auditExistingConnections() {
  console.log('🔍 Auditing Existing Publisher-Website-Offering Connections\n');
  
  // First, get some sample publisher_websites connections
  console.log('1️⃣ PUBLISHER_WEBSITES Table Analysis:');
  const pwSamples = await db
    .select()
    .from(publisherWebsites)
    .limit(5);
  
  if (pwSamples.length > 0) {
    console.log('\nSample publisher_websites record:');
    const sample = pwSamples[0];
    console.log('Fields that are populated:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        console.log(`  ${key}: ${typeof value === 'boolean' ? value : `"${value}"`}`);
      }
    });
    
    console.log('\nFields that are NULL:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        console.log(`  ${key}: NULL`);
      }
    });
  }
  
  // Check offerings
  console.log('\n2️⃣ PUBLISHER_OFFERINGS Table Analysis:');
  const offeringSamples = await db
    .select()
    .from(publisherOfferings)
    .limit(5);
  
  if (offeringSamples.length > 0) {
    console.log('\nSample publisher_offerings record:');
    const sample = offeringSamples[0];
    console.log('Fields that are populated:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'basePrice') {
          console.log(`  ${key}: ${value} cents ($${value/100})`);
        } else if (key === 'attributes') {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`  ${key}: ${typeof value === 'boolean' ? value : `"${value}"`}`);
        }
      }
    });
    
    console.log('\nFields that are NULL:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        console.log(`  ${key}: NULL`);
      }
    });
    
    // Check common values
    console.log('\nCommon offering_type values:');
    const offeringTypes = await db
      .select({
        type: publisherOfferings.offeringType,
        count: sql<number>`COUNT(*)`
      })
      .from(publisherOfferings)
      .groupBy(publisherOfferings.offeringType);
    
    offeringTypes.forEach(t => {
      console.log(`  ${t.type}: ${t.count} offerings`);
    });
  }
  
  // Check offering relationships
  console.log('\n3️⃣ PUBLISHER_OFFERING_RELATIONSHIPS Table Analysis:');
  const porSamples = await db
    .select()
    .from(publisherOfferingRelationships)
    .limit(5);
  
  if (porSamples.length > 0) {
    console.log('\nSample publisher_offering_relationships record:');
    const sample = porSamples[0];
    console.log('Fields that are populated:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        console.log(`  ${key}: ${typeof value === 'boolean' ? value : `"${value}"`}`);
      }
    });
    
    console.log('\nFields that are NULL:');
    Object.entries(sample).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        console.log(`  ${key}: NULL`);
      }
    });
  }
  
  // Get statistics
  console.log('\n4️⃣ STATISTICS:');
  
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM publisher_websites) as pw_count,
      (SELECT COUNT(*) FROM publisher_offerings) as offering_count,
      (SELECT COUNT(*) FROM publisher_offering_relationships) as por_count,
      (SELECT COUNT(*) FROM publisher_websites WHERE status = 'active') as active_pw,
      (SELECT COUNT(*) FROM publisher_offerings WHERE is_active = true) as active_offerings,
      (SELECT COUNT(*) FROM publisher_offering_relationships WHERE is_active = true) as active_por
  `);
  
  const s = stats.rows[0];
  console.log(`\nTotal records:`);
  console.log(`  publisher_websites: ${s.pw_count}`);
  console.log(`  publisher_offerings: ${s.offering_count}`);
  console.log(`  publisher_offering_relationships: ${s.por_count}`);
  console.log(`\nActive records:`);
  console.log(`  Active publisher_websites: ${s.active_pw} (${Math.round(s.active_pw/s.pw_count*100)}%)`);
  console.log(`  Active offerings: ${s.active_offerings} (${Math.round(s.active_offerings/s.offering_count*100)}%)`);
  console.log(`  Active relationships: ${s.active_por} (${Math.round(s.active_por/s.por_count*100)}%)`);
  
  // Check for websites with complete setup
  const completeSetup = await db.execute(sql`
    SELECT COUNT(DISTINCT w.id) as complete_count
    FROM websites w
    INNER JOIN publisher_websites pw ON pw.website_id = w.id
    INNER JOIN publisher_offering_relationships por ON por.website_id = w.id
    INNER JOIN publisher_offerings po ON po.id = por.offering_id
    WHERE w.guest_post_cost IS NOT NULL
  `);
  
  console.log(`\nWebsites with complete setup (all relationships): ${completeSetup.rows[0].complete_count}`);
  
  // Check price consistency
  console.log('\n5️⃣ PRICE CONSISTENCY CHECK:');
  const priceCheck = await db.execute(sql`
    SELECT 
      w.domain,
      w.guest_post_cost::numeric as website_price,
      po.base_price / 100.0 as offering_price,
      ABS(w.guest_post_cost::numeric - po.base_price / 100.0) as difference
    FROM websites w
    INNER JOIN publisher_offering_relationships por ON por.website_id = w.id
    INNER JOIN publisher_offerings po ON po.id = por.offering_id
    WHERE w.guest_post_cost IS NOT NULL
    ORDER BY difference DESC
    LIMIT 5
  `);
  
  console.log('\nTop 5 price differences:');
  priceCheck.rows.forEach((row: any) => {
    console.log(`  ${row.domain}: website=$${row.website_price}, offering=$${row.offering_price}, diff=$${row.difference}`);
  });
  
  console.log('\n✅ RECOMMENDED VALUES FOR NEW CONNECTIONS:');
  console.log('\nWhen creating publisher_websites:');
  console.log(`await db.insert(publisherWebsites).values({
    publisherId: publisherId,
    websiteId: websiteId,
    canEditPricing: true,
    canEditAvailability: true,
    canViewAnalytics: true,
    status: 'active'
  });`);
  
  console.log('\nWhen creating publisher_offerings:');
  console.log(`await db.insert(publisherOfferings).values({
    publisherId: publisherId,
    offeringType: 'guest_post',
    offeringName: 'Guest Post',
    basePrice: priceCents, // Convert dollars to cents!
    currency: 'USD',
    currentAvailability: 'available',
    isActive: true
  });`);
  
  console.log('\nWhen creating publisher_offering_relationships:');
  console.log(`await db.insert(publisherOfferingRelationships).values({
    publisherId: publisherId,
    offeringId: offeringId,
    websiteId: websiteId,
    isActive: true
  });`);
  
  process.exit(0);
}

auditExistingConnections().catch(console.error);