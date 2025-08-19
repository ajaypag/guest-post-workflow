import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('🔍 Fetching publishers from database...');
    
    // Get all publishers with basic info
    const result = await db.execute(sql`
      SELECT 
        p.id, 
        p.email, 
        p.contact_name, 
        p.company_name, 
        p.account_status, 
        p.confidence_score, 
        p.source,
        p.created_at,
        COUNT(w.id) as website_count
      FROM publishers p
      LEFT JOIN websites w ON w.source = 'manyreach' AND w.created_at > p.created_at - INTERVAL '1 hour'
      GROUP BY p.id, p.email, p.contact_name, p.company_name, p.account_status, p.confidence_score, p.source, p.created_at
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('✅ Found', result.rows.length, 'publishers');
    
    return NextResponse.json({
      success: true,
      publishers: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch publishers:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}