import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Check admin permissions
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[MIGRATION] Starting line items tables creation...');

    const tablesCreated = [];
    const tablesSkipped = [];

    // Check if tables already exist
    const existingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('order_line_items', 'line_item_changes', 'line_item_templates', 'order_benchmarks')
    `);

    const existingTableNames = existingTables.rows.map((row: any) => row.table_name);

    // Create order_line_items table
    if (!existingTableNames.includes('order_line_items')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS order_line_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          client_id UUID NOT NULL REFERENCES clients(id),
          
          -- Target Information
          target_page_id UUID REFERENCES target_pages(id),
          target_page_url TEXT,
          anchor_text TEXT,
          
          -- Assignment Information
          assigned_domain_id UUID REFERENCES bulk_analysis_domains(id),
          assigned_domain VARCHAR(255),
          
          -- Pricing
          estimated_price INTEGER,
          wholesale_price INTEGER,
          approved_price INTEGER,
          
          -- Status Tracking
          status VARCHAR(50) DEFAULT 'draft',
          
          -- Delivery Information
          workflow_id UUID,
          draft_url TEXT,
          published_url TEXT,
          delivered_at TIMESTAMP,
          
          -- Metadata
          metadata JSONB DEFAULT '{}',
          
          -- User Tracking
          added_by_user_id UUID REFERENCES users(id),
          approved_by_user_id UUID REFERENCES users(id),
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_line_items_order ON order_line_items(order_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_line_items_client ON order_line_items(client_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_line_items_status ON order_line_items(status)`);
      
      tablesCreated.push('order_line_items');
    } else {
      tablesSkipped.push('order_line_items');
    }

    // Create line_item_changes table for audit trail
    if (!existingTableNames.includes('line_item_changes')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS line_item_changes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          line_item_id UUID NOT NULL REFERENCES order_line_items(id) ON DELETE CASCADE,
          field_name VARCHAR(100) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          changed_by UUID REFERENCES users(id),
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          change_reason TEXT
        )
      `);
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_changes_line_item ON line_item_changes(line_item_id)`);
      
      tablesCreated.push('line_item_changes');
    } else {
      tablesSkipped.push('line_item_changes');
    }

    // Create line_item_templates table for future use
    if (!existingTableNames.includes('line_item_templates')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS line_item_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          default_anchor_text TEXT,
          default_instructions TEXT,
          pricing_rules JSONB,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      tablesCreated.push('line_item_templates');
    } else {
      tablesSkipped.push('line_item_templates');
    }

    // Create order_benchmarks table
    if (!existingTableNames.includes('order_benchmarks')) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS order_benchmarks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          benchmark_type VARCHAR(50) NOT NULL,
          benchmark_data JSONB NOT NULL,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          notes TEXT
        )
      `);
      
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_benchmarks_order ON order_benchmarks(order_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON order_benchmarks(benchmark_type)`);
      
      tablesCreated.push('order_benchmarks');
    } else {
      tablesSkipped.push('order_benchmarks');
    }

    console.log('[MIGRATION] Line items tables creation completed');
    console.log('Tables created:', tablesCreated);
    console.log('Tables skipped (already exist):', tablesSkipped);

    return NextResponse.json({
      success: true,
      message: tablesCreated.length > 0 
        ? `Successfully created ${tablesCreated.length} tables` 
        : 'All tables already exist',
      tablesCreated,
      tablesSkipped,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MIGRATION] Error creating line items tables:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create line items tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}