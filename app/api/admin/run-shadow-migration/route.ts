import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { migration } = await request.json();
    
    // Only allow the two specific migrations
    if (migration !== '0055_shadow_publisher_support.sql' && 
        migration !== '0056_email_processing_infrastructure.sql') {
      return NextResponse.json({ error: 'Invalid migration' }, { status: 400 });
    }

    // Read the migration file
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const filePath = path.join(migrationsDir, migration);
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Execute the migration
    try {
      await db.execute(sql.raw(content));
      
      return NextResponse.json({ 
        success: true, 
        message: `Migration ${migration} completed successfully` 
      });
      
    } catch (dbError: any) {
      // Check if it's just "already exists" errors
      if (dbError.message?.includes('already exists')) {
        return NextResponse.json({ 
          success: true, 
          message: 'Migration already applied (tables/columns already exist)' 
        });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}