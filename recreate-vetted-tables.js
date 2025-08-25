const { Client } = require('pg');
const fs = require('fs');

async function recreateVettedTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Drop existing tables (in reverse order due to foreign keys)
    console.log('🗑️ Dropping existing vetted tables...');
    
    await client.query('DROP TABLE IF EXISTS vetted_request_projects CASCADE;');
    console.log('✅ Dropped vetted_request_projects');
    
    await client.query('DROP TABLE IF EXISTS vetted_request_clients CASCADE;');
    console.log('✅ Dropped vetted_request_clients');
    
    await client.query('DROP TABLE IF EXISTS vetted_sites_requests CASCADE;');
    console.log('✅ Dropped vetted_sites_requests');

    // Read and execute the migration
    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync('migrations/0068_add_vetted_sites_requests.sql', 'utf8');
    
    // Extract just the vetted sites part
    const lines = migrationSQL.split('\n');
    let vettedSQL = '';
    let inVettedSection = false;
    
    for (const line of lines) {
      if (line.includes('vetted_sites_requests') || line.includes('vetted_request_clients') || line.includes('vetted_request_projects')) {
        inVettedSection = true;
      } else if (line.trim() === '' || line.startsWith('--')) {
        // Keep empty lines and comments
      } else if (line.startsWith('CREATE TABLE') && !line.includes('vetted')) {
        inVettedSection = false;
      } else if (line.startsWith('CREATE INDEX') && !line.includes('vetted')) {
        inVettedSection = false;
      }
      
      if (inVettedSection || line.trim() === '' || line.startsWith('--')) {
        vettedSQL += line + '\n';
      }
    }
    
    if (vettedSQL.trim()) {
      console.log('🔧 Recreating vetted sites tables...');
      console.log('SQL preview (first 500 chars):', vettedSQL.substring(0, 500));
      await client.query(vettedSQL);
      console.log('✅ Tables recreated successfully');
    } else {
      console.log('❌ No vetted sites SQL found in migration file');
    }

    // Verify tables were created
    const finalTables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE '%vetted%';
    `);
    
    console.log('📊 Final vetted tables:', finalTables.rows.map(r => r.tablename));

    // Check the column type for target_urls
    const columnInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vetted_sites_requests' AND column_name = 'target_urls';
    `);
    
    console.log('🔍 target_urls column info:', columnInfo.rows);

  } catch (error) {
    console.error('❌ Recreation failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await client.end();
    console.log('🏁 Recreation script completed');
  }
}

recreateVettedTables();