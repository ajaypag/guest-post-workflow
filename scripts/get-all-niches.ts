import { db } from '@/lib/db';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

async function getAllNiches() {
  try {
    // Get all unique niches
    const nichesResult = await db.execute(sql`
      SELECT DISTINCT unnest(niche) as niche 
      FROM ${websites} 
      WHERE niche IS NOT NULL 
      ORDER BY niche
    `);
    
    // Get all unique categories
    const categoriesResult = await db.execute(sql`
      SELECT DISTINCT unnest(categories) as category 
      FROM ${websites} 
      WHERE categories IS NOT NULL 
      ORDER BY category
    `);

    // Get all unique website types
    const typesResult = await db.execute(sql`
      SELECT DISTINCT unnest(website_type) as type 
      FROM ${websites} 
      WHERE website_type IS NOT NULL 
      ORDER BY type
    `);

    console.log('\n=== NICHES IN WEBSITES TABLE ===');
    console.log('Total unique niches:', nichesResult.rows.length);
    nichesResult.rows.forEach((row: any) => {
      console.log(`- ${row.niche}`);
    });

    console.log('\n=== CATEGORIES IN WEBSITES TABLE ===');
    console.log('Total unique categories:', categoriesResult.rows.length);
    categoriesResult.rows.forEach((row: any) => {
      console.log(`- ${row.category}`);
    });

    console.log('\n=== WEBSITE TYPES IN WEBSITES TABLE ===');
    console.log('Total unique types:', typesResult.rows.length);
    typesResult.rows.forEach((row: any) => {
      console.log(`- ${row.type}`);
    });

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit(0);
  }
}

getAllNiches();