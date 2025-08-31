import { db } from '../lib/db/connection';
import { websites, publisherWebsites, publisherOfferings, publisherOfferingRelationships, publishers } from '../lib/db/schema';
import { eq, sql, isNotNull, and } from 'drizzle-orm';

async function auditExistingConnections() {
  console.log('🔍 Auditing Existing Publisher-Website-Offering Connections\n');
  
  // Get a sample of working connections (websites that have all relationships)
  const workingConnections = await db
    .select({
      // Website fields
      websiteId: websites.id,
      domain: websites.domain,
      guestPostCost: websites.guestPostCost,
      
      // Publisher fields
      publisherId: publishers.id,
      publisherEmail: publishers.email,
      publisherStatus: publishers.accountStatus,
      publisherSource: publishers.source,
      
      // PublisherWebsite connection fields
      pwId: publisherWebsites.id,
      pwPublisherId: publisherWebsites.publisherId,
      pwWebsiteId: publisherWebsites.websiteId,
      pwCanEditPricing: publisherWebsites.canEditPricing,
      pwCanEditAvailability: publisherWebsites.canEditAvailability,
      pwCanViewAnalytics: publisherWebsites.canViewAnalytics,
      pwStatus: publisherWebsites.status,
      pwAddedAt: publisherWebsites.addedAt,
      
      // Offering fields
      offeringId: publisherOfferings.id,
      offeringPublisherId: publisherOfferings.publisherId,
      offeringType: publisherOfferings.offeringType,
      offeringName: publisherOfferings.offeringName,
      offeringBasePrice: publisherOfferings.basePrice,
      offeringCurrency: publisherOfferings.currency,
      offeringTurnaroundDays: publisherOfferings.turnaroundDays,
      offeringCurrentAvailability: publisherOfferings.currentAvailability,
      offeringIsActive: publisherOfferings.isActive,
      offeringMinWordCount: publisherOfferings.minWordCount,
      offeringMaxWordCount: publisherOfferings.maxWordCount,
      
      // OfferingRelationship fields
      porId: publisherOfferingRelationships.id,
      porPublisherId: publisherOfferingRelationships.publisherId,
      porOfferingId: publisherOfferingRelationships.offeringId,
      porWebsiteId: publisherOfferingRelationships.websiteId,
      porCustomPrice: publisherOfferingRelationships.customPrice,
      porCustomTerms: publisherOfferingRelationships.customTerms,
      porIsActive: publisherOfferingRelationships.isActive,
      porNotes: publisherOfferingRelationships.notes
    })
    .from(websites)
    .innerJoin(publisherWebsites, eq(publisherWebsites.websiteId, websites.id))
    .innerJoin(publishers, eq(publishers.id, publisherWebsites.publisherId))
    .innerJoin(publisherOfferingRelationships, eq(publisherOfferingRelationships.websiteId, websites.id))
    .innerJoin(publisherOfferings, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
    .where(isNotNull(websites.guestPostCost))
    .limit(5);
  
  console.log(`📊 Analyzing ${workingConnections.length} complete connections\n`);
  
  if (workingConnections.length === 0) {
    console.log('❌ No complete connections found!');
    return;
  }
  
  // Analyze publisher_websites fields
  console.log('1️⃣ PUBLISHER_WEBSITES Connection Fields:');
  console.log('   Required fields:');
  console.log('   - id: UUID (always present)');
  console.log('   - publisher_id: UUID (links to publisher)');
  console.log('   - website_id: UUID (links to website)');
  console.log('\n   Optional fields with typical values:');
  
  const pwSample = workingConnections[0];
  console.log(`   - can_edit_pricing: ${pwSample.pwCanEditPricing} (typical: ${workingConnections.every(w => w.pwCanEditPricing === true) ? 'true' : 'varies'})`);
  console.log(`   - can_edit_availability: ${pwSample.pwCanEditAvailability} (typical: ${workingConnections.every(w => w.pwCanEditAvailability === true) ? 'true' : 'varies'})`);
  console.log(`   - can_view_analytics: ${pwSample.pwCanViewAnalytics} (typical: ${workingConnections.every(w => w.pwCanViewAnalytics === true) ? 'true' : 'varies'})`);
  console.log(`   - status: "${pwSample.pwStatus}" (typical: ${workingConnections.every(w => w.pwStatus === 'active') ? 'active' : 'varies'})`);
  
  // Analyze publisher_offerings fields
  console.log('\n2️⃣ PUBLISHER_OFFERINGS Fields:');
  console.log('   Required fields:');
  console.log('   - id: UUID');
  console.log('   - publisher_id: UUID (links to publisher)');
  console.log('   - offering_type: varchar(50)');
  console.log('   - base_price: integer (in cents)');
  console.log('   - currency: varchar(10)');
  console.log('   - current_availability: varchar(50)');
  console.log('\n   Common values:');
  
  const offeringSample = workingConnections[0];
  console.log(`   - offering_type: "${offeringSample.offeringType}" (all: ${workingConnections.every(w => w.offeringType === 'guest_post') ? 'guest_post' : 'varies'})`);
  console.log(`   - offering_name: ${offeringSample.offeringName ? `"${offeringSample.offeringName}"` : 'NULL'}`);
  console.log(`   - currency: "${offeringSample.offeringCurrency}"`);
  console.log(`   - current_availability: "${offeringSample.offeringCurrentAvailability}"`);
  console.log(`   - is_active: ${offeringSample.offeringIsActive}`);
  console.log(`   - turnaround_days: ${offeringSample.offeringTurnaroundDays || 'NULL'}`);
  console.log(`   - min_word_count: ${offeringSample.offeringMinWordCount || 'NULL'}`);
  console.log(`   - max_word_count: ${offeringSample.offeringMaxWordCount || 'NULL'}`);
  
  // Analyze publisher_offering_relationships fields
  console.log('\n3️⃣ PUBLISHER_OFFERING_RELATIONSHIPS Fields:');
  console.log('   Required fields:');
  console.log('   - id: UUID');
  console.log('   - publisher_id: UUID');
  console.log('   - offering_id: UUID (can be NULL!)');
  console.log('   - website_id: UUID');
  console.log('\n   Optional fields:');
  
  const porSample = workingConnections[0];
  console.log(`   - custom_price: ${porSample.porCustomPrice || 'NULL'} (typically NULL)`);
  console.log(`   - custom_terms: ${porSample.porCustomTerms || 'NULL'} (typically NULL)`);
  console.log(`   - is_active: ${porSample.porIsActive} (typically true)`);
  console.log(`   - notes: ${porSample.porNotes || 'NULL'} (typically NULL)`);
  
  // Check for consistency
  console.log('\n4️⃣ CONSISTENCY CHECKS:');
  
  for (const conn of workingConnections) {
    const priceMatch = conn.offeringBasePrice === Math.round(parseFloat(conn.guestPostCost) * 100);
    console.log(`\n   ${conn.domain}:`);
    console.log(`   - guest_post_cost: $${conn.guestPostCost}`);
    console.log(`   - offering base_price: $${conn.offeringBasePrice / 100} (${conn.offeringBasePrice} cents)`);
    console.log(`   - Prices match: ${priceMatch ? '✅' : '❌'}`);
    console.log(`   - Publisher matches in all tables: ${
      conn.publisherId === conn.pwPublisherId && 
      conn.publisherId === conn.offeringPublisherId && 
      conn.publisherId === conn.porPublisherId ? '✅' : '❌'
    }`);
    console.log(`   - Website matches in all tables: ${
      conn.websiteId === conn.pwWebsiteId && 
      conn.websiteId === conn.porWebsiteId ? '✅' : '❌'
    }`);
  }
  
  // Get stats on NULL vs populated fields
  const offeringFieldStats = await db
    .select({
      totalOfferings: sql<number>`COUNT(*)`,
      withName: sql<number>`COUNT(offering_name)`,
      withTurnaround: sql<number>`COUNT(turnaround_days)`,
      withMinWords: sql<number>`COUNT(min_word_count)`,
      withMaxWords: sql<number>`COUNT(max_word_count)`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`
    })
    .from(publisherOfferings);
  
  console.log('\n5️⃣ OFFERING FIELD POPULATION STATS:');
  const stats = offeringFieldStats[0];
  console.log(`   Total offerings: ${stats.totalOfferings}`);
  console.log(`   With offering_name: ${stats.withName} (${Math.round(stats.withName / stats.totalOfferings * 100)}%)`);
  console.log(`   With turnaround_days: ${stats.withTurnaround} (${Math.round(stats.withTurnaround / stats.totalOfferings * 100)}%)`);
  console.log(`   With word counts: ${stats.withMinWords} (${Math.round(stats.withMinWords / stats.totalOfferings * 100)}%)`);
  console.log(`   Active: ${stats.activeCount} (${Math.round(stats.activeCount / stats.totalOfferings * 100)}%)`);
  
  console.log('\n✅ RECOMMENDED VALUES FOR NEW CONNECTIONS:');
  console.log('\nPublisherWebsites:');
  console.log('{\n  publisherId,\n  websiteId,\n  canEditPricing: true,\n  canEditAvailability: true,\n  canViewAnalytics: true,\n  status: "active"\n}');
  
  console.log('\nPublisherOfferings:');
  console.log('{\n  publisherId,\n  offeringType: "guest_post",\n  offeringName: "Guest Post",\n  basePrice: priceCents,\n  currency: "USD",\n  currentAvailability: "available",\n  isActive: true\n}');
  
  console.log('\nPublisherOfferingRelationships:');
  console.log('{\n  publisherId,\n  offeringId,\n  websiteId,\n  isActive: true\n}');
  
  process.exit(0);
}

auditExistingConnections().catch(console.error);