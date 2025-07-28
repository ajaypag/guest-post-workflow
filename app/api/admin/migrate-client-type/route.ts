import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting client type migration...');
    
    // Step 1: Add client_type column
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'client'
    `);
    console.log('Added client_type column');
    
    // Step 2: Update existing records
    await db.execute(sql`
      UPDATE clients 
      SET client_type = 'client' 
      WHERE client_type IS NULL
    `);
    console.log('Updated existing records');
    
    // Step 3: Create index for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_clients_type 
      ON clients(client_type)
    `);
    console.log('Created index on client_type');
    
    // Step 4: Add conversion tracking columns
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS converted_from_prospect_at TIMESTAMP
    `);
    console.log('Added converted_from_prospect_at column');
    
    await db.execute(sql`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS conversion_notes TEXT
    `);
    console.log('Added conversion_notes column');
    
    // Get final stats
    const statsQuery = sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN client_type = 'prospect' THEN 1 ELSE 0 END) as prospects,
        SUM(CASE WHEN client_type = 'client' THEN 1 ELSE 0 END) as clients
      FROM clients
    `;
    
    const stats = await db.execute(statsQuery);
    const finalStats = {
      total: Number(stats.rows[0].total),
      prospects: Number(stats.rows[0].prospects),
      clients: Number(stats.rows[0].clients)
    };
    
    return NextResponse.json({
      success: true,
      message: 'Client type migration completed successfully',
      stats: finalStats,
      changes: {
        columnsAdded: ['client_type', 'converted_from_prospect_at', 'conversion_notes'],
        indexesCreated: ['idx_clients_type'],
        recordsUpdated: finalStats.clients
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