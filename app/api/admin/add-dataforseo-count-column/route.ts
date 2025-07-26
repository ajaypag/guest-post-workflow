import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Adding DataForSEO results count column...');
    
    // Add column to store DataForSEO results count
    await db.execute(sql`
      ALTER TABLE bulk_analysis_domains
      ADD COLUMN IF NOT EXISTS dataforseo_results_count INTEGER DEFAULT 0
    `);
    
    console.log('Column added successfully');
    
    // Update existing records with their actual counts
    console.log('Updating existing records with DataForSEO counts...');
    
    const domains = await db.execute(sql`
      SELECT id FROM bulk_analysis_domains WHERE has_dataforseo_results = true
    `);
    
    let updated = 0;
    for (const domain of domains.rows) {
      const results = await db.execute(sql`
        SELECT COUNT(DISTINCT keyword) as count
        FROM keyword_analysis_results
        WHERE bulk_analysis_domain_id = ${domain.id}::uuid
      `);
      
      if (results.rows[0]) {
        await db.execute(sql`
          UPDATE bulk_analysis_domains
          SET dataforseo_results_count = ${results.rows[0].count}
          WHERE id = ${domain.id}::uuid
        `);
        updated++;
      }
    }
    
    console.log(`Updated ${updated} domains with DataForSEO counts`);
    
    return NextResponse.json({ 
      success: true,
      message: `Column added and ${updated} domains updated`
    });
  } catch (error: any) {
    console.error('Error adding DataForSEO count column:', error);
    return NextResponse.json(
      { error: 'Failed to add column', details: error.message },
      { status: 500 }
    );
  }
}