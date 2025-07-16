import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if polish_sessions table exists
    const polishSessionsCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sessions'
      ) as exists
    `);

    // Check if polish_sections table exists  
    const polishSectionsCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sections'
      ) as exists
    `);

    const polishSessionsExists = (polishSessionsCheck as any)[0]?.exists === true;
    const polishSectionsExists = (polishSectionsCheck as any)[0]?.exists === true;

    let message = '';
    if (polishSessionsExists && polishSectionsExists) {
      message = 'Both polish_sessions and polish_sections tables exist';
    } else if (polishSessionsExists && !polishSectionsExists) {
      message = 'polish_sessions exists but polish_sections is missing';
    } else if (!polishSessionsExists && polishSectionsExists) {
      message = 'polish_sections exists but polish_sessions is missing';
    } else {
      message = 'Neither polish_sessions nor polish_sections tables exist';
    }

    return NextResponse.json({
      exists: polishSessionsExists && polishSectionsExists,
      polishSessionsExists,
      polishSectionsExists,
      message
    });

  } catch (error) {
    console.error('Error checking polish tables:', error);
    return NextResponse.json(
      { error: 'Failed to check polish tables' },
      { status: 500 }
    );
  }
}