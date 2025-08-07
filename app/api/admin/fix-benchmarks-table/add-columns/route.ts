import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    const columnsAdded = [];
    
    // First check what columns are missing
    const tableInfo = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_benchmarks'
    `);
    
    const existingColumns = tableInfo.rows.map((row: any) => row.column_name);
    
    // Check if table exists at all
    if (existingColumns.length === 0) {
      // Create the entire table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS order_benchmarks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          version INTEGER NOT NULL DEFAULT 1,
          is_latest BOOLEAN NOT NULL DEFAULT true,
          captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
          captured_by UUID NOT NULL REFERENCES users(id),
          capture_reason VARCHAR(50) NOT NULL,
          benchmark_data JSONB NOT NULL,
          notes TEXT
        )
      `);
      
      // Create index for faster queries
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_order_benchmarks_order_id 
        ON order_benchmarks(order_id)
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_order_benchmarks_latest 
        ON order_benchmarks(order_id, is_latest) 
        WHERE is_latest = true
      `);
      
      return NextResponse.json({
        success: true,
        message: 'Created order_benchmarks table',
        tableCreated: true
      });
    }
    
    // Add missing columns one by one
    if (!existingColumns.includes('captured_by')) {
      // First check if there are any existing records
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM order_benchmarks
      `);
      const recordCount = parseInt(countResult.rows[0].count as string);
      
      if (recordCount === 0) {
        // No records, we can add NOT NULL constraint directly
        await db.execute(sql`
          ALTER TABLE order_benchmarks 
          ADD COLUMN captured_by UUID NOT NULL REFERENCES users(id)
        `);
      } else {
        // Has records, need to add nullable first, then update
        await db.execute(sql`
          ALTER TABLE order_benchmarks 
          ADD COLUMN captured_by UUID REFERENCES users(id)
        `);
        
        // Set a default value for existing records (system user or first admin)
        const systemUser = await db.execute(sql`
          SELECT id FROM users 
          WHERE email = 'system@localhost' 
          OR role = 'admin' 
          ORDER BY created_at 
          LIMIT 1
        `);
        
        if (systemUser.rows.length > 0) {
          const userId = systemUser.rows[0].id;
          await db.execute(sql`
            UPDATE order_benchmarks 
            SET captured_by = ${userId}
            WHERE captured_by IS NULL
          `);
          
          // Now make it NOT NULL
          await db.execute(sql`
            ALTER TABLE order_benchmarks 
            ALTER COLUMN captured_by SET NOT NULL
          `);
        }
      }
      columnsAdded.push('captured_by');
    }
    
    if (!existingColumns.includes('capture_reason')) {
      // Check if there are existing records
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM order_benchmarks
      `);
      const recordCount = parseInt(countResult.rows[0].count as string);
      
      if (recordCount === 0) {
        await db.execute(sql`
          ALTER TABLE order_benchmarks 
          ADD COLUMN capture_reason VARCHAR(50) NOT NULL
        `);
      } else {
        // Add as nullable first
        await db.execute(sql`
          ALTER TABLE order_benchmarks 
          ADD COLUMN capture_reason VARCHAR(50)
        `);
        
        // Set default value for existing records
        await db.execute(sql`
          UPDATE order_benchmarks 
          SET capture_reason = 'order_confirmed'
          WHERE capture_reason IS NULL
        `);
        
        // Make it NOT NULL
        await db.execute(sql`
          ALTER TABLE order_benchmarks 
          ALTER COLUMN capture_reason SET NOT NULL
        `);
      }
      columnsAdded.push('capture_reason');
    }
    
    if (!existingColumns.includes('notes')) {
      await db.execute(sql`
        ALTER TABLE order_benchmarks 
        ADD COLUMN notes TEXT
      `);
      columnsAdded.push('notes');
    }
    
    if (!existingColumns.includes('captured_at')) {
      await db.execute(sql`
        ALTER TABLE order_benchmarks 
        ADD COLUMN captured_at TIMESTAMP NOT NULL DEFAULT NOW()
      `);
      columnsAdded.push('captured_at');
    }
    
    if (!existingColumns.includes('version')) {
      await db.execute(sql`
        ALTER TABLE order_benchmarks 
        ADD COLUMN version INTEGER NOT NULL DEFAULT 1
      `);
      columnsAdded.push('version');
    }
    
    if (!existingColumns.includes('is_latest')) {
      await db.execute(sql`
        ALTER TABLE order_benchmarks 
        ADD COLUMN is_latest BOOLEAN NOT NULL DEFAULT true
      `);
      columnsAdded.push('is_latest');
    }
    
    // Create indexes if they don't exist
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_order_benchmarks_order_id 
      ON order_benchmarks(order_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_order_benchmarks_latest 
      ON order_benchmarks(order_id, is_latest) 
      WHERE is_latest = true
    `);
    
    return NextResponse.json({
      success: true,
      columnsAdded,
      message: columnsAdded.length > 0 
        ? `Added columns: ${columnsAdded.join(', ')}` 
        : 'No columns needed to be added'
    });
    
  } catch (error: any) {
    console.error('Error adding columns to benchmarks table:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to add columns',
        details: error.detail || error.stack
      },
      { status: 500 }
    );
  }
}