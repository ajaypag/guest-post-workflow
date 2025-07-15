import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Use direct table access instead of information_schema
    // This avoids PostgreSQL transaction isolation issues
    let auditSessionsExists = false;
    let auditSectionsExists = false;

    try {
      await db.execute(sql`SELECT 1 FROM audit_sessions LIMIT 1`);
      auditSessionsExists = true;
      console.log('✅ Direct query confirms: audit_sessions table exists');
    } catch (error) {
      console.log('❌ audit_sessions table not accessible');
    }

    try {
      await db.execute(sql`SELECT 1 FROM audit_sections LIMIT 1`);
      auditSectionsExists = true;
      console.log('✅ Direct query confirms: audit_sections table exists');
    } catch (error) {
      console.log('❌ audit_sections table not accessible');
    }

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