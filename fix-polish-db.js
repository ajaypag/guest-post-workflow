#!/usr/bin/env node

/**
 * Direct database fix for Polish sections column size issues
 * Fixes the "Failed query: insert into polish_sections" error
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixPolishColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔧 Starting Polish columns fix...');
    
    // Check current column sizes
    console.log('\n📊 Checking current column sizes...');
    const currentCols = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'polish_sections' 
      AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts', 'engagement_score', 'clarity_score')
      ORDER BY column_name
    `);
    
    console.log('Current column sizes:');
    currentCols.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });

    // Apply fixes
    console.log('\n🔄 Applying column fixes...');
    
    // Fix polish_approach to TEXT (main culprit)
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN polish_approach TYPE TEXT');
    console.log('  ✅ polish_approach → TEXT');
    
    // Ensure title can handle long titles  
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN title TYPE VARCHAR(500)');
    console.log('  ✅ title → VARCHAR(500)');
    
    // Ensure all text content columns are TEXT
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN strengths TYPE TEXT');
    console.log('  ✅ strengths → TEXT');
    
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN weaknesses TYPE TEXT');
    console.log('  ✅ weaknesses → TEXT');
    
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN brand_conflicts TYPE TEXT');
    console.log('  ✅ brand_conflicts → TEXT');
    
    // Fix score columns to accept decimals (8.5, 9.0, etc.)
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN engagement_score TYPE REAL');
    console.log('  ✅ engagement_score → REAL (allows decimals)');
    
    await pool.query('ALTER TABLE polish_sections ALTER COLUMN clarity_score TYPE REAL');
    console.log('  ✅ clarity_score → REAL (allows decimals)');

    // Verify the fixes
    console.log('\n📊 Verifying fixes...');
    const updatedCols = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'polish_sections' 
      AND column_name IN ('polish_approach', 'title', 'strengths', 'weaknesses', 'brand_conflicts', 'engagement_score', 'clarity_score')
      ORDER BY column_name
    `);
    
    console.log('Updated column sizes:');
    updatedCols.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });

    console.log('\n🎉 Polish columns fix completed successfully!');
    console.log('\nThe Polish agent should now be able to save content without column size errors.');

  } catch (error) {
    console.error('❌ Error fixing Polish columns:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
  } finally {
    await pool.end();
  }
}

// Run the fix
fixPolishColumns().catch(console.error);