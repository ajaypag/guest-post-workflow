const { chromium } = require('playwright');

async function checkSchema() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to schema audit page...');
  await page.goto('http://localhost:3001/admin/schema-audit');
  await page.waitForSelector('h1', { timeout: 10000 });
  
  // Wait for tables to load
  await page.waitForTimeout(2000);
  
  // Get all table info
  const tables = await page.evaluate(() => {
    const result = {};
    document.querySelectorAll('.border.rounded-lg').forEach(tableDiv => {
      const tableName = tableDiv.querySelector('.text-xl.font-bold')?.textContent || '';
      const rowCount = tableDiv.querySelector('.bg-blue-100')?.textContent || '';
      
      const columns = [];
      tableDiv.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          columns.push({
            name: cells[0].textContent,
            type: cells[1].textContent,
            nullable: cells[2]?.textContent || '',
          });
        }
      });
      
      const foreignKeys = [];
      tableDiv.querySelectorAll('.bg-gray-50 .font-mono').forEach(fk => {
        foreignKeys.push(fk.textContent);
      });
      
      result[tableName] = { rowCount, columns, foreignKeys };
    });
    return result;
  });
  
  console.log('\n=== ACTUAL DATABASE SCHEMA ===\n');
  
  for (const [tableName, info] of Object.entries(tables)) {
    console.log(`📦 ${tableName} (${info.rowCount})`);
    console.log('  Columns:');
    info.columns.forEach(col => {
      console.log(`    - ${col.name}: ${col.type} ${col.nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    if (info.foreignKeys.length > 0) {
      console.log('  Foreign Keys:');
      info.foreignKeys.forEach(fk => {
        console.log(`    - ${fk}`);
      });
    }
    console.log('');
  }
  
  // Check for issues
  const tableNames = Object.keys(tables);
  console.log('\n=== SCHEMA ANALYSIS ===\n');
  console.log('Tables found:', tableNames.length);
  console.log('Tables:', tableNames.join(', '));
  
  // Check for the problematic tables
  const hasOfferings = tableNames.includes('publisher_offerings');
  const hasRelationships = tableNames.includes('publisher_offering_relationships');
  const hasPublisherWebsites = tableNames.includes('publisher_websites');
  
  console.log('\nKey tables:');
  console.log(`  publisher_offerings: ${hasOfferings ? '✅' : '❌'}`);
  console.log(`  publisher_offering_relationships: ${hasRelationships ? '✅' : '❌'}`);
  console.log(`  publisher_websites: ${hasPublisherWebsites ? '✅' : '❌'}`);
  
  await browser.close();
}

checkSchema().catch(console.error);