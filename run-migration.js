const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Check if tables exist
    console.log('🔍 Checking existing tables...');
    const existingTables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE '%vetted%';
    `);
    
    console.log('Existing vetted tables:', existingTables.rows.map(r => r.tablename));

    if (existingTables.rows.length === 0) {
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
        console.log('🔧 Running vetted sites migration...');
        console.log('SQL to execute (first 500 chars):', vettedSQL.substring(0, 500));
        await client.query(vettedSQL);
        console.log('✅ Migration completed successfully');
      } else {
        console.log('❌ No vetted sites SQL found in migration file');
      }
    } else {
      console.log('✅ Vetted sites tables already exist');
    }

    // Verify tables were created
    const finalTables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' AND tablename LIKE '%vetted%';
    `);
    
    console.log('📊 Final vetted tables:', finalTables.rows.map(r => r.tablename));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await client.end();
    console.log('🏁 Migration script completed');
  }
}

runMigration();