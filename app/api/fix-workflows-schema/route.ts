import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: false, // Coolify PostgreSQL doesn't use SSL
    });

    // Check if workflows table exists and has correct schema
    console.log('Checking workflows table schema...');
    
    const tableCheck = await pool.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workflows' 
      ORDER BY ordinal_position;
    `);

    console.log('Current workflows table schema:', tableCheck.rows);

    // Check if the id column has the right default
    const idColumn = tableCheck.rows.find(row => row.column_name === 'id');
    
    if (!idColumn) {
      // Table doesn't exist, create it
      console.log('Creating workflows table...');
      await pool.query(`
        CREATE TABLE workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_name VARCHAR(255) NOT NULL,
          client_url VARCHAR(255) NOT NULL,
          target_domain VARCHAR(255),
          current_step INTEGER NOT NULL DEFAULT 0,
          created_by UUID NOT NULL,
          created_by_name VARCHAR(255) NOT NULL,
          created_by_email VARCHAR(255),
          client_id UUID,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    } else if (!idColumn.column_default || !idColumn.column_default.includes('gen_random_uuid')) {
      // Fix the ID column default
      console.log('Fixing id column default...');
      await pool.query(`
        ALTER TABLE workflows 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
      `);
    }

    // Check workflow_steps table too
    console.log('Checking workflow_steps table...');
    const stepsTableCheck = await pool.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workflow_steps' 
      ORDER BY ordinal_position;
    `);

    console.log('Current workflow_steps table schema:', stepsTableCheck.rows);

    if (stepsTableCheck.rows.length === 0) {
      // Create workflow_steps table
      console.log('Creating workflow_steps table...');
      await pool.query(`
        CREATE TABLE workflow_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL,
          step_number INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          inputs JSONB NOT NULL DEFAULT '{}',
          outputs JSONB NOT NULL DEFAULT '{}',
          completed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    }

    await pool.end();

    return NextResponse.json({ 
      success: true, 
      message: 'Workflows schema fixed successfully',
      currentSchema: tableCheck.rows
    });
  } catch (error) {
    console.error('Workflows schema fix error:', error);
    return NextResponse.json(
      { error: `Workflows schema fix failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}