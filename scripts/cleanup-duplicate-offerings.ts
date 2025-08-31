import { db } from '../lib/db/connection';
import { websites, publishers, publisherWebsites, publisherOfferings, publisherOfferingRelationships } from '../lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

async function cleanupDuplicateOfferings() {
  console.log('🧹 Cleaning up duplicate offerings...\n');
  
  const website = await db.select().from(websites).where(eq(websites.domain, 'techpreview.org')).limit(1);
  if (!website[0]) {
    console.log('❌ Website not found');
    process.exit(1);
  }
  
  console.log('Website: techpreview.org');
  
  // Get all offering relationships for this website
  const offeringRels = await db
    .select({
      relId: publisherOfferingRelationships.id,
      offeringId: publisherOfferingRelationships.offeringId,
      publisherId: publisherOfferingRelationships.publisherId,
      publisherEmail: publishers.email,
      price: publisherOfferings.basePrice,
      createdAt: publisherOfferingRelationships.createdAt
    })
    .from(publisherOfferingRelationships)
    .innerJoin(publisherOfferings, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
    .innerJoin(publishers, eq(publishers.id, publisherOfferingRelationships.publisherId))
    .where(eq(publisherOfferingRelationships.websiteId, website[0].id))
    .orderBy(publisherOfferingRelationships.createdAt);
  
  console.log(`Found ${offeringRels.length} offering relationships:`);
  
  const duplicates = new Map<string, typeof offeringRels>();
  
  offeringRels.forEach((rel, idx) => {
    const key = `${rel.publisherId}-${rel.price}`;
    console.log(`${idx + 1}. ${rel.publisherEmail} - $${(rel.price/100).toFixed(2)} (${rel.createdAt})`);
    
    if (!duplicates.has(key)) {
      duplicates.set(key, []);
    }
    duplicates.get(key)!.push(rel);
  });
  
  console.log('\nProcessing duplicates...');
  
  for (const [key, rels] of duplicates) {
    if (rels.length > 1) {
      console.log(`\n🔄 Found ${rels.length} duplicates for ${key}:`);
      
      // Keep the oldest one, delete the rest
      const [keep, ...toDelete] = rels.sort((a, b) => 
        new Date(a.createdAt as Date).getTime() - new Date(b.createdAt as Date).getTime()
      );
      
      console.log(`   ✅ Keeping: ${keep.publisherEmail} $${(keep.price/100).toFixed(2)} (${keep.createdAt})`);
      
      for (const rel of toDelete) {
        console.log(`   🗑️  Deleting: ${rel.publisherEmail} $${(rel.price/100).toFixed(2)} (${rel.createdAt})`);
        
        // Delete offering relationship
        await db.delete(publisherOfferingRelationships).where(eq(publisherOfferingRelationships.id, rel.relId));
        
        // Delete the offering itself if not used elsewhere
        const otherUses = await db
          .select()
          .from(publisherOfferingRelationships)
          .where(eq(publisherOfferingRelationships.offeringId, rel.offeringId))
          .limit(1);
        
        if (otherUses.length === 0) {
          await db.delete(publisherOfferings).where(eq(publisherOfferings.id, rel.offeringId));
          console.log(`     🗑️  Also deleted unused offering ${rel.offeringId}`);
        }
      }
    } else {
      console.log(`✅ ${key}: No duplicates`);
    }
  }
  
  console.log('\n🎉 Cleanup complete!');
  process.exit(0);
}

cleanupDuplicateOfferings().catch(console.error);