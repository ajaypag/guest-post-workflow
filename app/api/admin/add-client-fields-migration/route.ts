import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST(request: NextRequest) {
  try {
    let accountIdAdded = false;
    let shareTokenAdded = false;
    let invitationIdAdded = false;
    let alreadyExists = false;

    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('account_id', 'share_token', 'invitation_id');
    `;
    
    const existingColumns = await db.execute<{ column_name: string }>(checkQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);

    // Add accountId column if it doesn't exist
    if (!existingColumnNames.includes('account_id')) {
      await db.execute(`
        ALTER TABLE clients 
        ADD COLUMN account_id UUID 
        REFERENCES accounts(id) ON DELETE CASCADE;
      `);
      accountIdAdded = true;
    } else {
      alreadyExists = true;
    }

    // Add shareToken column if it doesn't exist
    if (!existingColumnNames.includes('share_token')) {
      await db.execute(`
        ALTER TABLE clients 
        ADD COLUMN share_token VARCHAR(255) UNIQUE;
      `);
      shareTokenAdded = true;
    } else {
      alreadyExists = true;
    }

    // Add invitationId column if it doesn't exist
    if (!existingColumnNames.includes('invitation_id')) {
      await db.execute(`
        ALTER TABLE clients 
        ADD COLUMN invitation_id UUID 
        REFERENCES invitations(id) ON DELETE SET NULL;
      `);
      invitationIdAdded = true;
    } else {
      alreadyExists = true;
    }

    // Create index on shareToken for faster lookups
    if (shareTokenAdded) {
      await db.execute(`
        CREATE INDEX idx_clients_share_token ON clients(share_token) 
        WHERE share_token IS NOT NULL;
      `);
    }

    // Create index on accountId for faster queries
    if (accountIdAdded) {
      await db.execute(`
        CREATE INDEX idx_clients_account_id ON clients(account_id) 
        WHERE account_id IS NOT NULL;
      `);
    }

    return NextResponse.json({
      success: true,
      accountIdAdded,
      shareTokenAdded,
      invitationIdAdded,
      alreadyExists,
      message: 'Migration completed successfully'
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