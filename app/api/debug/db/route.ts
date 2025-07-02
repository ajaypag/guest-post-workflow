import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { testConnection } from '@/lib/db/connection';

export async function GET() {
  try {
    // Test basic connection
    const connectionResult = await testConnection();
    
    // Check if users table exists and get its structure
    const tableCheck = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    // Check if there are any users
    const userCount = await db.execute(`SELECT COUNT(*) as count FROM users;`);
    
    // Check database version and extensions
    const dbInfo = await db.execute(`
      SELECT version() as version, 
             current_database() as database,
             current_user as user;
    `);
    
    // Check if gen_random_uuid() function is available
    const uuidCheck = await db.execute(`SELECT gen_random_uuid() as test_uuid;`);
    
    return NextResponse.json({
      connection: connectionResult,
      tableStructure: tableCheck,
      userCount: userCount,
      databaseInfo: dbInfo,
      uuidFunction: uuidCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}