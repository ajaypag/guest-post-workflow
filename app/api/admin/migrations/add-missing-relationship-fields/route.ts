import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { execute } = await request.json();

    if (!execute) {
      return NextResponse.json({ 
        message: 'Dry run - migration not executed',
        description: 'Will add contact info, notes, and payment fields to publisher_offering_relationships'
      });
    }

    // Execute migration - Add contact information fields
    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50)
    `);

    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)
    `);

    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)
    `);

    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)
    `);

    // Add notes fields
    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS internal_notes TEXT
    `);

    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS publisher_notes TEXT
    `);

    // Add commission/payment fields
    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS commission_rate VARCHAR(50)
    `);

    await db.execute(sql`
      ALTER TABLE publisher_offering_relationships 
      ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255)
    `);

    // Verify the columns were added
    const columns = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'publisher_offering_relationships'
      AND column_name IN (
        'verification_method', 'contact_email', 'contact_phone', 'contact_name',
        'internal_notes', 'publisher_notes', 'commission_rate', 'payment_terms'
      )
      ORDER BY column_name
    `);

    // Record migration completion
    await db.execute(sql`
      INSERT INTO migration_history (migration_name, success, applied_by)
      VALUES ('0043_add_missing_relationship_fields', true, 'admin')
      ON CONFLICT (migration_name) DO UPDATE
      SET executed_at = NOW(), success = true
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      details: {
        columnsAdded: [
          'verification_method',
          'contact_email', 
          'contact_phone',
          'contact_name',
          'internal_notes',
          'publisher_notes',
          'commission_rate',
          'payment_terms'
        ],
        verification: columns.rows
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}