import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  console.log('🔄 Creating GIN indexes for website_type and niche columns...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create GIN index for website_type array column
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_websites_website_type 
      ON websites USING GIN(website_type)
    `);
    
    // Create GIN index for niche array column  
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_websites_niche 
      ON websites USING GIN(niche)
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Successfully created GIN indexes for website_type and niche');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully created GIN indexes for efficient array filtering on website_type and niche columns'
    });
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating indexes:', error);
    return NextResponse.json(
      { error: 'Failed to create indexes', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}