import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  console.log('[User System Migration] Starting migration...');
  const log: string[] = [];
  
  try {
    // Step 1: Add user_type column to users table
    log.push('Adding user_type column to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'internal'
    `);
    log.push('✓ Added user_type column');
    
    // Step 2: Update existing users to 'internal' type
    log.push('Updating existing users to internal type...');
    await db.execute(sql`
      UPDATE users 
      SET user_type = 'internal' 
      WHERE user_type IS NULL OR user_type = ''
    `);
    log.push('✓ Updated existing users');
    
    // Step 3: Update role column to support new roles
    log.push('Updating role column constraints...');
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN role TYPE VARCHAR(50)
    `);
    log.push('✓ Updated role column');
    
    // Step 4: Create invitations table
    log.push('Creating invitations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        role VARCHAR(50) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        accepted_at TIMESTAMP,
        invited_by UUID NOT NULL REFERENCES users(id),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log.push('✓ Created invitations table');
    
    // Step 5: Create user_client_access table (for advertisers)
    log.push('Creating user_client_access table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_client_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        access_level VARCHAR(50) DEFAULT 'viewer',
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, client_id)
      )
    `);
    log.push('✓ Created user_client_access table');
    
    // Step 6: Create user_website_access table (for publishers)
    log.push('Creating user_website_access table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_website_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        access_level VARCHAR(50) DEFAULT 'publisher_member',
        granted_by UUID REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, website_id)
      )
    `);
    log.push('✓ Created user_website_access table');
    
    // Step 7: Create indexes
    log.push('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_client_access_user_id ON user_client_access(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_client_access_client_id ON user_client_access(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_website_access_user_id ON user_website_access(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_website_access_website_id ON user_website_access(website_id)'
    ];
    
    for (const indexSql of indexes) {
      await db.execute(sql.raw(indexSql));
    }
    log.push('✓ Created all indexes');
    
    // Step 8: Add trigger for invitations updated_at
    log.push('Adding triggers...');
    await db.execute(sql`
      CREATE OR REPLACE TRIGGER update_invitations_updated_at 
      BEFORE UPDATE ON invitations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    log.push('✓ Added triggers');
    
    log.push('✅ User system migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'User system migration completed',
      log
    });
    
  } catch (error: any) {
    console.error('[User System Migration] Error:', error);
    log.push(`❌ Error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Migration failed',
      detail: error.detail || undefined,
      log
    }, { status: 500 });
  }
}

// Rollback endpoint
export async function DELETE() {
  const log: string[] = [];
  
  try {
    log.push('Starting rollback...');
    
    // Drop tables in reverse order
    await db.execute(sql`DROP TABLE IF EXISTS user_website_access CASCADE`);
    log.push('✓ Dropped user_website_access');
    
    await db.execute(sql`DROP TABLE IF EXISTS user_client_access CASCADE`);
    log.push('✓ Dropped user_client_access');
    
    await db.execute(sql`DROP TABLE IF EXISTS invitations CASCADE`);
    log.push('✓ Dropped invitations');
    
    // Remove user_type column
    await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS user_type`);
    log.push('✓ Removed user_type column');
    
    return NextResponse.json({
      success: true,
      message: 'User system rollback completed',
      log
    });
    
  } catch (error: any) {
    console.error('[User System Migration] Rollback error:', error);
    log.push(`❌ Error: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Rollback failed',
      log
    }, { status: 500 });
  }
}