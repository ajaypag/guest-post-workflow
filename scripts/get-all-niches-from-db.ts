import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

async function getAllNichesFromDatabase() {
  console.log('='.repeat(80));
  console.log('EXTRACTING ALL UNIQUE VALUES FROM WEBSITES TABLE');
  console.log('='.repeat(80));

  // Get all unique niches
  const nichesResult = await db.execute(sql`
    SELECT DISTINCT unnest(niche) as niche 
    FROM websites 
    WHERE niche IS NOT NULL 
    ORDER BY niche
  `);
  
  console.log('\n📊 NICHES IN WEBSITES TABLE:');
  console.log(`Total unique niches: ${nichesResult.rows.length}`);
  console.log('\nComplete list:');
  const niches = nichesResult.rows.map((row: any) => row.niche);
  console.log(niches.join(', '));

  // Get all unique categories  
  const categoriesResult = await db.execute(sql`
    SELECT DISTINCT unnest(categories) as category 
    FROM websites 
    WHERE categories IS NOT NULL 
    ORDER BY category
  `);

  console.log('\n📊 CATEGORIES IN WEBSITES TABLE:');
  console.log(`Total unique categories: ${categoriesResult.rows.length}`);
  console.log('\nComplete list:');
  const categories = categoriesResult.rows.map((row: any) => row.category);
  console.log(categories.join(', '));

  // Get all unique website types
  const typesResult = await db.execute(sql`
    SELECT DISTINCT unnest(website_type) as type 
    FROM websites 
    WHERE website_type IS NOT NULL 
    ORDER BY type
  `);

  console.log('\n📊 WEBSITE TYPES IN WEBSITES TABLE:');
  console.log(`Total unique types: ${typesResult.rows.length}`);
  console.log('\nComplete list:');
  const types = typesResult.rows.map((row: any) => row.type);
  console.log(types.join(', '));

  console.log('\n' + '='.repeat(80));
  
  process.exit(0);
}

getAllNichesFromDatabase().catch(console.error);