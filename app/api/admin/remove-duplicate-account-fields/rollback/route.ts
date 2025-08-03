import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting rollback: adding duplicate account fields back to orders table...');

    // First check which columns already exist
    const columnsQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('account_email', 'account_name', 'account_company')
    `);

    const existingColumns = Array.isArray(columnsQuery) ? 
      columnsQuery.map((row: any) => row.column_name) : 
      (columnsQuery as any).rows?.map((row: any) => row.column_name) || [];
    
    if (existingColumns.length === 3) {
      return NextResponse.json({
        success: true,
        message: 'All duplicate columns already exist - no rollback needed',
        addedColumns: []
      });
    }

    console.log(`Found existing columns: ${existingColumns.join(', ') || 'none'}`);

    const addedColumns: string[] = [];

    // Add account_email column if it doesn't exist
    if (!existingColumns.includes('account_email')) {
      try {
        console.log('Adding account_email column...');
        await db.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN account_email VARCHAR(255)
        `);
        addedColumns.push('account_email');
        console.log('Successfully added account_email column');
      } catch (error: any) {
        console.error('Error adding account_email column:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to add account_email column: ${error.message}`,
          addedColumns
        }, { status: 500 });
      }
    }

    // Add account_name column if it doesn't exist
    if (!existingColumns.includes('account_name')) {
      try {
        console.log('Adding account_name column...');
        await db.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN account_name VARCHAR(255)
        `);
        addedColumns.push('account_name');
        console.log('Successfully added account_name column');
      } catch (error: any) {
        console.error('Error adding account_name column:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to add account_name column: ${error.message}`,
          addedColumns
        }, { status: 500 });
      }
    }

    // Add account_company column if it doesn't exist
    if (!existingColumns.includes('account_company')) {
      try {
        console.log('Adding account_company column...');
        await db.execute(sql`
          ALTER TABLE orders 
          ADD COLUMN account_company VARCHAR(255)
        `);
        addedColumns.push('account_company');
        console.log('Successfully added account_company column');
      } catch (error: any) {
        console.error('Error adding account_company column:', error);
        return NextResponse.json({
          success: false,
          error: `Failed to add account_company column: ${error.message}`,
          addedColumns
        }, { status: 500 });
      }
    }

    // Populate the columns with data from accounts table
    if (addedColumns.length > 0) {
      try {
        console.log('Populating duplicate columns with data from accounts table...');
        await db.execute(sql`
          UPDATE orders 
          SET 
            account_email = accounts.email,
            account_name = COALESCE(accounts.contact_name, accounts.company_name),
            account_company = accounts.company_name
          FROM accounts 
          WHERE orders.account_id = accounts.id
          AND orders.account_id IS NOT NULL
        `);
        console.log('Successfully populated duplicate columns with account data');
      } catch (error: any) {
        console.error('Error populating duplicate columns:', error);
        // Don't fail the rollback if population fails - columns are restored
        console.log('Columns were restored but data population failed - you may need to populate manually');
      }
    }

    // Verify columns were added
    const verificationQuery = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('account_email', 'account_name', 'account_company')
    `);

    const finalColumns = Array.isArray(verificationQuery) ? 
      verificationQuery.map((row: any) => row.column_name) : 
      (verificationQuery as any).rows?.map((row: any) => row.column_name) || [];
    
    if (finalColumns.length < 3) {
      return NextResponse.json({
        success: false,
        error: `Rollback incomplete - only ${finalColumns.length}/3 columns exist: ${finalColumns.join(', ')}`,
        addedColumns
      }, { status: 500 });
    }

    console.log('Rollback completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Successfully restored duplicate account fields to orders table',
      addedColumns,
      note: addedColumns.length > 0 ? 'Columns were populated with current account data' : 'All columns already existed'
    });

  } catch (error: any) {
    console.error('Error during rollback:', error);
    return NextResponse.json({
      success: false,
      error: 'Rollback failed',
      details: error.message
    }, { status: 500 });
  }
}