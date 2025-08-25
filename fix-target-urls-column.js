const { Client } = require('pg');

async function fixTargetUrlsColumn() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Check current column type
    const columnInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vetted_sites_requests' AND column_name = 'target_urls';
    `);
    
    console.log('🔍 Current target_urls column info:', columnInfo.rows);

    // Alter the column from TEXT[] to JSONB
    console.log('🔧 Converting target_urls column from TEXT[] to JSONB...');
    
    await client.query(`
      ALTER TABLE vetted_sites_requests 
      ALTER COLUMN target_urls TYPE JSONB 
      USING array_to_json(target_urls);
    `);
    
    console.log('✅ Column converted to JSONB');

    // Verify the change
    const newColumnInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vetted_sites_requests' AND column_name = 'target_urls';
    `);
    
    console.log('🔍 New target_urls column info:', newColumnInfo.rows);

  } catch (error) {
    console.error('❌ Column fix failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await client.end();
    console.log('🏁 Column fix completed');
  }
}

fixTargetUrlsColumn();