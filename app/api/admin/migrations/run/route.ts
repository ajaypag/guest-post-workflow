import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  try {
    const { migrationId } = await request.json();
    
    if (!migrationId) {
      return NextResponse.json(
        { error: 'Migration ID is required' },
        { status: 400 }
      );
    }

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Check if migration already applied
    const existingResult = await pool.query(
      'SELECT * FROM migrations WHERE name = $1',
      [migrationId]
    );
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Migration already applied',
        migration: existingResult.rows[0]
      });
    }

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', `${migrationId}.sql`);
    let migrationSQL: string;
    
    try {
      migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Migration file not found',
          details: `Could not find ${migrationId}.sql`
        },
        { status: 404 }
      );
    }

    // Run migration in a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      console.log(`Running migration: ${migrationId}`);
      await client.query(migrationSQL);
      
      // Record successful migration
      await client.query(
        'INSERT INTO migrations (name, applied_at) VALUES ($1, NOW())',
        [migrationId]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Migration ${migrationId} completed successfully`);
      
      return NextResponse.json({
        success: true,
        message: `Migration ${migrationId} applied successfully`,
        appliedAt: new Date().toISOString()
      });
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Record failed migration
      try {
        await pool.query(
          'INSERT INTO migrations (name, applied_at, error) VALUES ($1, NOW(), $2)',
          [migrationId, error.message]
        );
      } catch (recordError) {
        console.error('Failed to record migration error:', recordError);
      }
      
      console.error(`❌ Migration ${migrationId} failed:`, error);
      
      return NextResponse.json({
        success: false,
        error: 'Migration failed',
        details: error.message,
        query: error.query
      });
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('Migration runner error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to run migration',
        details: error.message
      },
      { status: 500 }
    );
  }
}

async function ensureMigrationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        error TEXT
      );
    `);
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}