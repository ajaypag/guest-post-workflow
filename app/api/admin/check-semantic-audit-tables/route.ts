import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if audit_sessions table exists
    const auditSessionsCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_sessions'
      ) as exists
    `);

    // Check if audit_sections table exists  
    const auditSectionsCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_sections'
      ) as exists
    `);

    const auditSessionsExists = (auditSessionsCheck as any)[0]?.exists === true;
    const auditSectionsExists = (auditSectionsCheck as any)[0]?.exists === true;

    let message = '';
    if (auditSessionsExists && auditSectionsExists) {
      message = 'Both audit_sessions and audit_sections tables exist';
    } else if (auditSessionsExists && !auditSectionsExists) {
      message = 'audit_sessions exists but audit_sections is missing';
    } else if (!auditSessionsExists && auditSectionsExists) {
      message = 'audit_sections exists but audit_sessions is missing';
    } else {
      message = 'Neither audit_sessions nor audit_sections tables exist';
    }

    return NextResponse.json({
      exists: auditSessionsExists && auditSectionsExists,
      auditSessionsExists,
      auditSectionsExists,
      message
    });

  } catch (error) {
    console.error('Error checking semantic audit tables:', error);
    return NextResponse.json(
      { error: 'Failed to check semantic audit tables' },
      { status: 500 }
    );
  }
}