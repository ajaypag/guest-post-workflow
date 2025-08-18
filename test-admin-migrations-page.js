// Test that all migrations are properly listed on admin page
const puppeteer = require('puppeteer');

async function testAdminMigrationsPage() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Testing Admin Migrations Page');
  console.log('=============================\n');
  
  try {
    // First, we need to login as admin
    // Since we don't have admin credentials, let's check if the migrations are in the page source
    
    // Check the publisher migrations page structure
    await page.goto('http://localhost:3000/admin/publisher-migrations');
    
    const pageContent = await page.content();
    
    // Check for all critical migrations
    const migrations = [
      { num: '1', name: 'Publisher Offerings System', file: '0035' },
      { num: '2', name: 'Publisher Relationship Columns', file: '0038' },
      { num: '3', name: 'Website Publisher Columns', file: '0039' },
      { num: '4', name: 'Publisher Offering Columns', file: '0040' },
      { num: '5', name: 'Publisher Performance Columns', file: '0041' },
      { num: '6', name: 'Fix Offering ID Nullable', file: '0042' },
      { num: '7', name: 'Add Missing Relationship Fields', file: '0043' },
      { num: '8', name: 'Make Airtable ID Nullable', file: '0044' },
      { num: '9', name: 'Domain Normalization', file: '0037' }
    ];
    
    console.log('Checking for migrations on admin page:\n');
    
    const foundMigrations = [];
    const missingMigrations = [];
    
    for (const migration of migrations) {
      // Check if migration name appears in page
      if (pageContent.includes(migration.name)) {
        foundMigrations.push(migration);
        console.log(`✅ Migration ${migration.num}: ${migration.name} (${migration.file})`);
      } else {
        missingMigrations.push(migration);
        console.log(`❌ Migration ${migration.num}: ${migration.name} (${migration.file}) - NOT FOUND`);
      }
    }
    
    // Check for critical elements
    console.log('\n\nCritical Migrations Status:');
    console.log('-----------------------------');
    
    if (pageContent.includes('0043')) {
      console.log('✅ Migration 0043 (Add Missing Relationship Fields) - FOUND');
      console.log('   This prevents 500 errors in publisher portal');
    } else {
      console.log('❌ Migration 0043 - MISSING! This will cause 500 errors!');
    }
    
    if (pageContent.includes('0044')) {
      console.log('✅ Migration 0044 (Make Airtable ID Nullable) - FOUND');
      console.log('   This enables manual website addition');
    } else {
      console.log('❌ Migration 0044 - MISSING! Publishers cannot add websites!');
    }
    
    // Check for API endpoints
    console.log('\n\nAPI Endpoints Check:');
    console.log('--------------------');
    
    if (pageContent.includes('/api/admin/migrations/add-missing-relationship-fields')) {
      console.log('✅ Migration 0043 API endpoint configured');
    } else {
      console.log('❌ Migration 0043 API endpoint missing');
    }
    
    if (pageContent.includes('/api/admin/migrations/make-airtable-id-nullable')) {
      console.log('✅ Migration 0044 API endpoint configured');
    } else {
      console.log('❌ Migration 0044 API endpoint missing');
    }
    
    // Summary
    console.log('\n\n=============================');
    console.log('SUMMARY');
    console.log('=============================');
    console.log(`Found: ${foundMigrations.length} migrations`);
    console.log(`Missing: ${missingMigrations.length} migrations`);
    
    if (missingMigrations.length > 0) {
      console.log('\n⚠️ Missing migrations:');
      missingMigrations.forEach(m => {
        console.log(`   - ${m.name} (${m.file})`);
      });
    } else {
      console.log('\n✅ All migrations are present on the admin page!');
    }
    
    // Check if page requires authentication
    if (pageContent.includes('login') || pageContent.includes('Login')) {
      console.log('\n📝 Note: Admin page requires authentication to access');
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

testAdminMigrationsPage();