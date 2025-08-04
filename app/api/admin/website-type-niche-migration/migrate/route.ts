import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  console.log('🔄 Adding website_type and niche columns...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add website_type column
    await client.query(`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS website_type TEXT[]
    `);
    
    // Add niche column  
    await client.query(`
      ALTER TABLE websites 
      ADD COLUMN IF NOT EXISTS niche TEXT[]
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Successfully added website_type and niche columns');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully added website_type and niche columns to websites table'
    });
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding columns:', error);
    return NextResponse.json(
      { error: 'Failed to add columns', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}