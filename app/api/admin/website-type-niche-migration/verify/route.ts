import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { db } from '@/lib/db/connection';

const pool = (db as any).$client as Pool;

export async function POST(request: NextRequest) {
  console.log('🔍 Verifying migration completion...');
  
  try {
    // Check that both columns exist with correct types
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND table_schema = 'public'
      AND column_name IN ('website_type', 'niche')
      ORDER BY column_name
    `);
    
    const websiteTypeColumn = columnsResult.rows.find(row => row.column_name === 'website_type');
    const nicheColumn = columnsResult.rows.find(row => row.column_name === 'niche');
    
    // Check that indexes exist
    const indexesResult = await pool.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'websites' 
      AND indexname IN ('idx_websites_website_type', 'idx_websites_niche')
      ORDER BY indexname
    `);
    
    const websiteTypeIndex = indexesResult.rows.find(row => row.indexname === 'idx_websites_website_type');
    const nicheIndex = indexesResult.rows.find(row => row.indexname === 'idx_websites_niche');
    
    // Get a count of websites to show table status
    const countResult = await pool.query('SELECT COUNT(*) FROM websites');
    const websiteCount = parseInt(countResult.rows[0].count);
    
    const issues = [];
    
    if (!websiteTypeColumn) {
      issues.push('website_type column is missing');
    } else if (websiteTypeColumn.data_type !== 'ARRAY') {
      issues.push(`website_type column has wrong type: ${websiteTypeColumn.data_type} (expected ARRAY)`);
    }
    
    if (!nicheColumn) {
      issues.push('niche column is missing');
    } else if (nicheColumn.data_type !== 'ARRAY') {
      issues.push(`niche column has wrong type: ${nicheColumn.data_type} (expected ARRAY)`);
    }
    
    if (!websiteTypeIndex) {
      issues.push('idx_websites_website_type index is missing');
    }
    
    if (!nicheIndex) {
      issues.push('idx_websites_niche index is missing');
    }
    
    if (issues.length > 0) {
      console.log('❌ Migration verification failed:', issues);
      return NextResponse.json(
        { error: 'Migration verification failed', issues },
        { status: 400 }
      );
    }
    
    console.log('✅ Migration verification passed');
    
    return NextResponse.json({
      success: true,
      message: `Migration completed successfully! Both columns and indexes are in place. Ready to sync ${websiteCount.toLocaleString()} websites with new Website Type and Niche data from Airtable.`,
      details: {
        websiteTypeColumn: {
          exists: !!websiteTypeColumn,
          type: websiteTypeColumn?.data_type,
          nullable: websiteTypeColumn?.is_nullable === 'YES'
        },
        nicheColumn: {
          exists: !!nicheColumn,
          type: nicheColumn?.data_type,
          nullable: nicheColumn?.is_nullable === 'YES'
        },
        indexes: {
          websiteType: !!websiteTypeIndex,
          niche: !!nicheIndex
        },
        websiteCount
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error verifying migration:', error);
    return NextResponse.json(
      { error: 'Failed to verify migration', details: error.message },
      { status: 500 }
    );
  }
}