import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  console.log('[Verify User System Migration] Starting verification...');
  const results: any = {};
  
  try {
    // 1. Check user_type column
    console.log('[Verify] Checking user_type column...');
    const userTypeResult = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'user_type'
    `);
    results.userTypeColumn = userTypeResult.rows[0] || null;
    console.log('[Verify] user_type column:', results.userTypeColumn);
    
    // 2. Check if any users have user_type set
    console.log('[Verify] Checking user_type values...');
    const userTypeValues = await db.execute(sql`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users
      GROUP BY user_type
    `);
    results.userTypeDistribution = userTypeValues.rows;
    console.log('[Verify] User type distribution:', results.userTypeDistribution);
    
    // 3. Check invitations table
    console.log('[Verify] Checking invitations table...');
    const invitationsTable = await db.execute(sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'invitations') as column_count
      FROM information_schema.tables 
      WHERE table_name = 'invitations'
    `);
    results.invitationsTable = invitationsTable.rows[0] || null;
    console.log('[Verify] Invitations table:', results.invitationsTable);
    
    // 4. Check user_client_access table
    console.log('[Verify] Checking user_client_access table...');
    const clientAccessTable = await db.execute(sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_client_access') as column_count
      FROM information_schema.tables 
      WHERE table_name = 'user_client_access'
    `);
    results.userClientAccessTable = clientAccessTable.rows[0] || null;
    console.log('[Verify] user_client_access table:', results.userClientAccessTable);
    
    // 5. Check user_website_access table
    console.log('[Verify] Checking user_website_access table...');
    const websiteAccessTable = await db.execute(sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_website_access') as column_count
      FROM information_schema.tables 
      WHERE table_name = 'user_website_access'
    `);
    results.userWebsiteAccessTable = websiteAccessTable.rows[0] || null;
    console.log('[Verify] user_website_access table:', results.userWebsiteAccessTable);
    
    // 6. Check indexes
    console.log('[Verify] Checking indexes...');
    const indexes = await db.execute(sql`
      SELECT 
        indexname,
        tablename
      FROM pg_indexes
      WHERE tablename IN ('users', 'invitations', 'user_client_access', 'user_website_access')
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    results.indexes = indexes.rows;
    console.log('[Verify] Indexes found:', results.indexes.length);
    
    // 7. Check trigger on invitations
    console.log('[Verify] Checking triggers...');
    const triggers = await db.execute(sql`
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers
      WHERE event_object_table = 'invitations'
    `);
    results.triggers = triggers.rows;
    console.log('[Verify] Triggers:', results.triggers);
    
    // Summary
    const migrationComplete = 
      results.userTypeColumn !== null &&
      results.invitationsTable !== null &&
      results.userClientAccessTable !== null &&
      results.userWebsiteAccessTable !== null &&
      results.indexes.length >= 8; // We expect at least 8 indexes
    
    console.log('[Verify] Migration complete:', migrationComplete);
    console.log('[Verify] Full results:', JSON.stringify(results, null, 2));
    
    return NextResponse.json({
      success: true,
      migrationComplete,
      summary: {
        userTypeColumn: results.userTypeColumn !== null,
        userTypeValues: results.userTypeDistribution,
        invitationsTable: results.invitationsTable !== null,
        userClientAccessTable: results.userClientAccessTable !== null,
        userWebsiteAccessTable: results.userWebsiteAccessTable !== null,
        indexesCreated: results.indexes.length,
        triggersCreated: results.triggers.length
      },
      details: results
    });
    
  } catch (error: any) {
    console.error('[Verify User System Migration] Error:', error);
    
    // Try to get more specific error info
    let errorDetails = error.message || 'Unknown error';
    if (error.code === '42P01') {
      errorDetails = 'One or more tables do not exist';
    } else if (error.code === '42703') {
      errorDetails = 'user_type column does not exist';
    }
    
    return NextResponse.json({
      success: false,
      error: errorDetails,
      errorCode: error.code,
      migrationComplete: false,
      results
    }, { status: 500 });
  }
}