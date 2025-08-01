/**
 * Migration script to add normalizedUrl column and populate existing data
 * Run this after adding the normalizedUrl column to the database
 */

import { db } from '@/lib/db/connection';
import { targetPages } from '@/lib/db/schema';

// URL normalization function - matches the one used in ClientService
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Force HTTPS, remove www, normalize trailing slash
    return `https://${urlObj.hostname.replace(/^www\./, '')}${urlObj.pathname.replace(/\/$/, '') || '/'}${urlObj.search}${urlObj.hash}`;
  } catch {
    return url; // Return original if invalid
  }
}

async function migrateNormalizedUrls() {
  console.log('🚀 Starting normalized URL migration...');
  
  try {
    // Get all target pages that don't have normalized URLs yet
    const pages = await db
      .select()
      .from(targetPages)
      .where(isNull(targetPages.normalizedUrl));
    
    console.log(`📊 Found ${pages.length} pages to migrate`);
    
    if (pages.length === 0) {
      console.log('✅ No pages need migration');
      return;
    }
    
    let processed = 0;
    const batchSize = 100;
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      
      // Update each page in the batch
      await Promise.all(
        batch.map(async (page) => {
          const normalized = normalizeUrl(page.url);
          
          await db
            .update(targetPages)
            .set({ normalizedUrl: normalized })
            .where(eq(targetPages.id, page.id));
          
          processed++;
          
          if (processed % 50 === 0) {
            console.log(`📈 Processed ${processed}/${pages.length} pages`);
          }
        })
      );
    }
    
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Total pages processed: ${processed}`);
    
    // Verify migration
    const remainingPages = await db
      .select({ count: sql<number>`count(*)` })
      .from(targetPages)
      .where(isNull(targetPages.normalizedUrl));
    
    console.log(`🔍 Pages still without normalized URLs: ${remainingPages[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Import required functions
import { isNull, eq, sql } from 'drizzle-orm';

// Run migration if called directly
if (require.main === module) {
  migrateNormalizedUrls()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateNormalizedUrls };