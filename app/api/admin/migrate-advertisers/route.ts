import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { users } from '@/lib/db/schema';
import { orders } from '@/lib/db/orderSchema';
import { eq } from 'drizzle-orm';

async function checkTableExists(tableName: string) {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    );
  `);
  return result.rows[0].exists;
}

async function checkColumnExists(tableName: string, columnName: string) {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    );
  `);
  return result.rows[0].exists;
}

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      // Check migration status
      const advertisersTableExists = await checkTableExists('advertisers');
      const publishersTableExists = await checkTableExists('publishers');
      const publisherWebsitesTableExists = await checkTableExists('publisher_websites');
      const advertiserIdColumnExists = await checkColumnExists('orders', 'advertiser_id');

      // Get existing data that would be migrated
      const clientUsers = await db.query.users.findMany({
        where: eq(users.role, 'client'),
        columns: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Count orders that reference user IDs
      const ordersResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM orders WHERE user_id IS NOT NULL
      `);
      const ordersWithUserId = parseInt(String(ordersResult.rows[0].count));

      return NextResponse.json({
        advertisersTableExists,
        publishersTableExists,
        publisherWebsitesTableExists,
        advertiserIdColumnExists,
        existingData: {
          clientUsers: clientUsers.length,
          sampleClients: clientUsers.slice(0, 3).map(u => u.email),
          ordersWithUserId,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'migrate') {
      // Run the migration
      await db.execute(sql`
        -- Create advertisers table
        CREATE TABLE IF NOT EXISTS advertisers (
          id UUID PRIMARY KEY,
          
          -- Authentication fields
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          
          -- Profile information
          contact_name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          website VARCHAR(255),
          
          -- Business information
          tax_id VARCHAR(100),
          billing_address TEXT,
          billing_city VARCHAR(100),
          billing_state VARCHAR(100),
          billing_zip VARCHAR(20),
          billing_country VARCHAR(100),
          
          -- Payment terms
          credit_terms VARCHAR(50) DEFAULT 'prepay',
          credit_limit BIGINT DEFAULT 0,
          
          -- Relationship to internal client
          primary_client_id UUID REFERENCES clients(id),
          
          -- Account status
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          email_verified BOOLEAN DEFAULT false,
          email_verification_token VARCHAR(255),
          
          -- Password reset
          reset_token VARCHAR(255),
          reset_token_expiry TIMESTAMP,
          
          -- Notes and preferences
          internal_notes TEXT,
          order_preferences TEXT,
          
          -- Timestamps
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMP
        );
      `);

      // Create indexes for advertisers
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_advertisers_email ON advertisers(email);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_advertisers_status ON advertisers(status);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_advertisers_client ON advertisers(primary_client_id);`);

      // Create publishers table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS publishers (
          id UUID PRIMARY KEY,
          
          -- Authentication fields
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          
          -- Profile information
          contact_name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          phone VARCHAR(50),
          
          -- Business information
          tax_id VARCHAR(100),
          payment_email VARCHAR(255),
          payment_method VARCHAR(50) DEFAULT 'paypal',
          
          -- Banking info (encrypted)
          bank_name VARCHAR(255),
          bank_account_number VARCHAR(255),
          bank_routing_number VARCHAR(255),
          
          -- Commission settings
          commission_rate INTEGER DEFAULT 40,
          minimum_payout BIGINT DEFAULT 10000,
          
          -- Account status
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          email_verified BOOLEAN DEFAULT false,
          email_verification_token VARCHAR(255),
          
          -- Password reset
          reset_token VARCHAR(255),
          reset_token_expiry TIMESTAMP,
          
          -- Content guidelines
          content_guidelines TEXT,
          prohibited_topics TEXT,
          turnaround_time INTEGER DEFAULT 7,
          
          -- Notes
          internal_notes TEXT,
          
          -- Timestamps
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMP
        );
      `);

      // Create indexes for publishers
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_publishers_email ON publishers(email);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_publishers_status ON publishers(status);`);

      // Create publisher_websites link table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS publisher_websites (
          id UUID PRIMARY KEY,
          publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
          website_id UUID NOT NULL,
          
          -- Permissions
          can_edit_pricing BOOLEAN DEFAULT true,
          can_edit_availability BOOLEAN DEFAULT true,
          can_view_analytics BOOLEAN DEFAULT true,
          
          -- Status
          status VARCHAR(20) DEFAULT 'active',
          
          -- Timestamps
          added_at TIMESTAMP NOT NULL DEFAULT NOW(),
          removed_at TIMESTAMP
        );
      `);

      // Create indexes for publisher_websites
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_publisher_websites_publisher ON publisher_websites(publisher_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_publisher_websites_website ON publisher_websites(website_id);`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_publisher_website_unique ON publisher_websites(publisher_id, website_id);`);

      // Add advertiser_id column to orders table
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS advertiser_id UUID REFERENCES advertisers(id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_orders_advertiser ON orders(advertiser_id);`);

      return NextResponse.json({ 
        success: true,
        message: 'Migration completed successfully',
      });

    } else if (action === 'rollback') {
      // Rollback the migration
      await db.execute(sql`DROP TABLE IF EXISTS publisher_websites CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS publishers CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS advertisers CASCADE;`);
      
      // Note: We're not removing the advertiser_id column from orders
      // to avoid data loss if it's already populated

      return NextResponse.json({ 
        success: true,
        message: 'Rollback completed successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json(
      { error: 'Failed to run migration: ' + (error as Error).message },
      { status: 500 }
    );
  }
}