import 'dotenv/config';
import { db } from './lib/db/connection';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  console.log('=== CHECKING ACTUAL DATABASE STATE ===\n');
  
  try {
    // 1. Check what publisher tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'publisher%'
      ORDER BY table_name
    `);
    
    console.log('Publisher Tables Found:');
    (tables as any).rows.forEach((r: any) => console.log(`  - ${r.table_name}`));
    console.log('');
    
    // 2. Check migration history (if table exists)
    try {
      const migrations = await db.execute(sql`
        SELECT name, executed_at 
        FROM drizzle_migrations 
        WHERE name LIKE '%publisher%'
        ORDER BY executed_at
      `);
      
      console.log('Publisher Migrations Applied:');
      (migrations as any).rows.forEach((r: any) => {
        console.log(`  - ${r.name} (${new Date(r.executed_at).toISOString().split('T')[0]})`);
      });
      console.log('');
    } catch (e) {
      console.log('Migration history not available (drizzle_migrations table not found)\n');
    }
    
    // 3. Check key table structures
    const keyTables = [
      'publisher_offerings',
      'publisher_offering_relationships',
      'publishers',
      'publisher_email_claims'
    ];
    
    for (const tableName of keyTables) {
      try {
        const columns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${tableName}
          ORDER BY ordinal_position
        `);
        
        if ((columns as any).rows.length > 0) {
          console.log(`\n${tableName} structure:`);
          (columns as any).rows.forEach((c: any) => {
            console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
          });
          
          // Count rows
          const count = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
          console.log(`  Total rows: ${(count as any).rows[0].count}`);
        }
      } catch (e) {
        console.log(`\n${tableName}: DOES NOT EXIST`);
      }
    }
    
    // 4. Check for schema conflicts
    console.log('\n=== CHECKING FOR CONFLICTS ===\n');
    
    // Check publisher_offerings columns
    try {
      const offeringsCheck = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN column_name = 'publisher_id' THEN 1 END) as has_publisher_id,
          COUNT(CASE WHEN column_name = 'publisher_website_id' THEN 1 END) as has_publisher_website_id,
          COUNT(CASE WHEN column_name = 'publisher_relationship_id' THEN 1 END) as has_publisher_relationship_id,
          COUNT(CASE WHEN column_name = 'offering_name' THEN 1 END) as has_offering_name
        FROM information_schema.columns 
        WHERE table_name = 'publisher_offerings'
      `);
      
      const check = (offeringsCheck as any).rows[0];
      console.log('publisher_offerings column check:');
      console.log(`  publisher_id: ${check.has_publisher_id > 0 ? '✅' : '❌'}`);
      console.log(`  publisher_website_id: ${check.has_publisher_website_id > 0 ? '✅' : '❌'}`);
      console.log(`  publisher_relationship_id: ${check.has_publisher_relationship_id > 0 ? '✅' : '❌'}`);
      console.log(`  offering_name: ${check.has_offering_name > 0 ? '✅' : '❌'}`);
    } catch (e) {
      console.log('Could not check publisher_offerings columns');
    }
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`Total publisher tables: ${(tables as any).rows.length}`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
  
  process.exit(0);
}

checkDatabase();