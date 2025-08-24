const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/guest_post_workflow'
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', '0071_session_store_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 0071_session_store_system.sql');
    console.log('==================================================');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        // Extract table name if it's a CREATE TABLE statement
        const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
        if (tableMatch) {
          console.log('✅ Created table:', tableMatch[1]);
        } else if (statement.includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)/i);
          if (indexMatch) {
            console.log('✅ Created index:', indexMatch[1]);
          }
        }
      } catch (err) {
        console.error('⚠️ Statement failed:', err.message);
        // Continue with other statements
      }
    }
    
    // Verify tables were created
    const verify = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_sessions', 'impersonation_logs', 'impersonation_actions')
      ORDER BY table_name
    `);
    
    console.log('\n=== Verification ===');
    if (verify.rows.length === 3) {
      console.log('✅ All 3 session store tables created successfully!');
      verify.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    } else {
      console.log('⚠️ Only', verify.rows.length, 'of 3 tables created');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();