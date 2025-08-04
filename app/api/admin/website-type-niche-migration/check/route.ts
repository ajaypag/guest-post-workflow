import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  console.log('🔍 Checking existing website table columns...');
  
  try {
    // Check what columns exist in the websites table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES'
    }));
    
    const hasWebsiteType = existingColumns.some(col => col.name === 'website_type');
    const hasNiche = existingColumns.some(col => col.name === 'niche');
    
    console.log(`✅ Found ${existingColumns.length} columns. website_type: ${hasWebsiteType}, niche: ${hasNiche}`);
    
    return NextResponse.json({
      existingColumns,
      hasWebsiteType,
      hasNiche,
      totalColumns: existingColumns.length
    });
    
  } catch (error: any) {
    console.error('❌ Error checking columns:', error);
    return NextResponse.json(
      { error: 'Failed to check existing columns', details: error.message },
      { status: 500 }
    );
  }
}