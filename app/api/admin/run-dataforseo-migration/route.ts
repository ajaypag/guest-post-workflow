import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];
    
    // Check if keyword_analysis_results table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'keyword_analysis_results'
      );
    `);
    
    const tableExists = tableCheck.rows[0]?.exists || false;
    
    if (!tableExists) {
      console.log('Creating DataForSEO tables...');
      
      // Read and apply migration 0005
      const migration5Path = path.join(process.cwd(), 'lib/db/migrations/0005_add_dataforseo_tables.sql');
      const migration5SQL = fs.readFileSync(migration5Path, 'utf-8');
      
      // Split by semicolon and execute each statement separately
      const statements = migration5SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await db.execute(sql.raw(statement));
        } catch (err) {
          console.error('Error executing statement:', statement.substring(0, 50) + '...', err);
        }
      }
      
      results.push('Created keyword_analysis_results table');
      results.push('Created keyword_analysis_batches table');
      results.push('Added DataForSEO columns to bulk_analysis_domains');
    } else {
      results.push('keyword_analysis_results table already exists');
    }
    
    // Check if analysis_batch_id column exists
    const columnCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'keyword_analysis_results' 
        AND column_name = 'analysis_batch_id'
      );
    `);
    
    const columnExists = columnCheck.rows[0]?.exists || false;
    
    if (!columnExists) {
      console.log('Adding batch analysis columns...');
      
      // Read and apply migration 0007
      const migration7Path = path.join(process.cwd(), 'lib/db/migrations/0007_add_dataforseo_batch_columns.sql');
      const migration7SQL = fs.readFileSync(migration7Path, 'utf-8');
      
      // Split by semicolon and execute each statement separately
      const statements = migration7SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await db.execute(sql.raw(statement));
        } catch (err) {
          console.error('Error executing statement:', statement.substring(0, 50) + '...', err);
        }
      }
      
      results.push('Added analysis_batch_id column');
      results.push('Added is_incremental column');
      results.push('Created batch analysis indexes');
    } else {
      results.push('Batch analysis columns already exist');
    }
    
    // Verify tables and columns
    const verifyResults = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'keyword_analysis_results') as results_table,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'keyword_analysis_batches') as batches_table,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'keyword_analysis_results' AND column_name = 'analysis_batch_id') as batch_id_column,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name = 'dataforseo_status') as status_column
    `);
    
    const verify = verifyResults.rows[0] as any;
    console.log('Verification results:', verify);
    
    return NextResponse.json({
      success: true,
      results,
      verification: {
        keyword_analysis_results: Number(verify?.results_table || 0) > 0,
        keyword_analysis_batches: Number(verify?.batches_table || 0) > 0,
        batch_columns: Number(verify?.batch_id_column || 0) > 0,
        dataforseo_status: Number(verify?.status_column || 0) > 0
      }
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}