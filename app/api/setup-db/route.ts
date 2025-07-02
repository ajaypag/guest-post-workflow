import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const client = await pool.connect();

    try {
      // Create tables directly
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          website VARCHAR(255),
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS client_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(client_id, user_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS target_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          domain VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          notes TEXT,
          added_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id),
          client_id UUID,
          title VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          content JSONB,
          target_pages JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          step_id VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          inputs JSONB,
          outputs JSONB,
          completed_at TIMESTAMP,
          position INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_client_assignments_user_id ON client_assignments(user_id);');

      // Check if admin user exists
      const adminCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@example.com']
      );

      if (adminCheck.rows.length === 0) {
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await client.query(
          `INSERT INTO users (email, name, password_hash, role, is_active) 
           VALUES ($1, $2, $3, $4, $5)`,
          ['admin@example.com', 'Admin User', hashedPassword, 'admin', true]
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Database setup completed successfully',
        tables_created: ['users', 'clients', 'client_assignments', 'target_pages', 'workflows', 'workflow_steps'],
        admin_user_created: adminCheck.rows.length === 0
      });

    } finally {
      client.release();
      await pool.end();
    }

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}