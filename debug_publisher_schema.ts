import { db } from './lib/db/connection';
import { sql } from 'drizzle-orm';

async function debugPublisherSchema() {
  console.log('🔍 Debugging publisher schema...');
  
  try {
    // Check the actual columns in publishers table
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'publishers' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Publishers table columns:');
    console.log('Columns result:', columns);
    
    if (columns && columns.length > 0) {
      for (const col of columns) {
        console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      }
    } else {
      console.log('   No columns found or invalid result');
    }
    
    // Try to get a sample publisher
    const samplePublisher = await db.execute(sql`
      SELECT id, email, contact_name, company_name, is_shadow 
      FROM publishers 
      LIMIT 1;
    `);
    
    if (samplePublisher.length > 0) {
      console.log('\n📋 Sample publisher:');
      console.log(JSON.stringify(samplePublisher[0], null, 2));
    } else {
      console.log('\n⚠️  No publishers found in the database');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  debugPublisherSchema().catch(console.error);
}