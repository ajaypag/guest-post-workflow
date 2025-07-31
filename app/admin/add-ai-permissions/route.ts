import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting AI permissions migration...');

    // Add AI permission columns to accounts table
    await db.execute(`
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS ai_permissions TEXT DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS can_use_ai_keywords BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS can_use_ai_descriptions BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS can_use_ai_content_generation BOOLEAN DEFAULT false
    `);

    console.log('✅ AI permission columns added successfully');

    return NextResponse.json({
      success: true,
      message: 'AI permissions columns added successfully'
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}