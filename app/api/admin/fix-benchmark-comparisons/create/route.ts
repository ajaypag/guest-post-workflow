import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Create the benchmark_comparisons table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS benchmark_comparisons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Links to benchmark and order
        benchmark_id UUID NOT NULL REFERENCES order_benchmarks(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        
        -- Comparison timing
        compared_at TIMESTAMP NOT NULL DEFAULT NOW(),
        compared_by UUID REFERENCES users(id),
        
        -- Comparison results stored as JSONB
        comparison_data JSONB NOT NULL,
        
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create indexes for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_comparison_benchmark 
      ON benchmark_comparisons(benchmark_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_comparison_order 
      ON benchmark_comparisons(order_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_comparison_latest 
      ON benchmark_comparisons(order_id, compared_at DESC)
    `);
    
    // Verify the table was created
    const verification = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'benchmark_comparisons'
      ORDER BY ordinal_position
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully created benchmark_comparisons table',
      columns: verification.rows,
      indexes: [
        'idx_comparison_benchmark',
        'idx_comparison_order', 
        'idx_comparison_latest'
      ]
    });
    
  } catch (error: any) {
    console.error('Error creating benchmark_comparisons table:', error);
    
    // Check if error is because table already exists
    if (error.message?.includes('already exists')) {
      return NextResponse.json({
        success: false,
        message: 'Table already exists',
        error: 'Table benchmark_comparisons already exists'
      });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create table',
        details: error.detail || error.stack
      },
      { status: 500 }
    );
  }
}