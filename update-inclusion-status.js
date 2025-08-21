require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable';

async function updateInclusionStatus() {
  const pool = new Pool({ connectionString });
  
  try {
    // First, check how many line items need updating
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM order_line_items
      WHERE assigned_domain_id IS NOT NULL
      AND inclusion_status IS NULL
    `);
    
    console.log(`Found ${checkResult.rows[0].count} line items with assigned domains but no inclusion status`);
    
    if (checkResult.rows[0].count > 0) {
      // Update all line items with assigned domains to have 'included' status
      const updateResult = await pool.query(`
        UPDATE order_line_items
        SET inclusion_status = 'included',
            modified_at = NOW()
        WHERE assigned_domain_id IS NOT NULL
        AND inclusion_status IS NULL
        RETURNING id, order_id, assigned_domain
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} line items to have inclusion_status = 'included'`);
      
      // Show a few examples
      if (updateResult.rows.length > 0) {
        console.log('\nExamples of updated items:');
        updateResult.rows.slice(0, 3).forEach(row => {
          console.log(`  - Line item ${row.id} for order ${row.order_id} (domain: ${row.assigned_domain})`);
        });
      }
    } else {
      console.log('✅ No line items need updating - all assigned domains already have an inclusion status');
    }
    
    // Verify the update
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE inclusion_status = 'included') as included,
        COUNT(*) FILTER (WHERE inclusion_status = 'excluded') as excluded,
        COUNT(*) FILTER (WHERE inclusion_status = 'saved_for_later') as saved,
        COUNT(*) FILTER (WHERE inclusion_status IS NULL) as no_status,
        COUNT(*) as total
      FROM order_line_items
      WHERE assigned_domain_id IS NOT NULL
    `);
    
    console.log('\nFinal status distribution for line items with assigned domains:');
    console.log(`  Included: ${verifyResult.rows[0].included}`);
    console.log(`  Excluded: ${verifyResult.rows[0].excluded}`);
    console.log(`  Saved for Later: ${verifyResult.rows[0].saved}`);
    console.log(`  No Status: ${verifyResult.rows[0].no_status}`);
    console.log(`  Total: ${verifyResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Error updating inclusion status:', error.message);
  } finally {
    await pool.end();
  }
}

updateInclusionStatus();