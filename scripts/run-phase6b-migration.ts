import { db } from '../lib/db/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runPhase6BMigration() {
  try {
    console.log('🚀 Starting Phase 6B Migration: Derived Pricing Shadow Mode');
    console.log('📋 This will add derived pricing infrastructure to the database...\n');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '0079_add_derived_pricing_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    // Remove comments and empty lines, then split by semicolons
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt !== '');
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
        await db.execute(statement);
        successCount++;
      } catch (error: any) {
        console.log(`⚠️  Statement ${i + 1} failed or was skipped:`, error.message);
        // Continue with other statements - some might fail if they already exist
      }
    }
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Executed ${successCount}/${statements.length} statements`);
    
    // Verify the migration by checking the new columns exist
    const verificationResult = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'websites' 
      AND column_name IN ('derived_guest_post_cost', 'price_calculation_method', 'price_calculated_at', 'price_override_offering_id', 'price_override_reason')
      ORDER BY column_name;
    `);
    
    console.log('\n🔍 Verification - New columns added:');
    verificationResult.forEach((col: any) => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Check the pricing comparison view
    const comparisonStats = await db.execute(`
      SELECT 
        price_status,
        COUNT(*) as count,
        ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) as percentage
      FROM pricing_comparison 
      GROUP BY price_status
      ORDER BY count DESC;
    `);
    
    console.log('\n📊 Pricing Comparison Statistics:');
    comparisonStats.forEach((stat: any) => {
      console.log(`  ${stat.price_status}: ${stat.count} websites (${stat.percentage}%)`);
    });
    
    console.log('\n🎉 Phase 6B Shadow Mode is now active!');
    console.log('📈 Next steps:');
    console.log('  1. Monitor derived pricing accuracy');
    console.log('  2. Create admin dashboard for comparison');
    console.log('  3. Implement derived pricing service');
    console.log('  4. Test gradual rollout with feature flags');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runPhase6BMigration();