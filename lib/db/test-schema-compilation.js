#!/usr/bin/env node

/**
 * Schema Compilation Test
 * Tests if all Drizzle schemas can be imported without TypeScript/JavaScript errors
 */

console.log('Testing schema compilation...\n');

const testImports = [
  './schema.ts',
  './accountSchema.ts', 
  './websiteSchema.ts',
  './publisherCrmSchema.ts',
  './orderSchema.ts',
  './bulkAnalysisSchema.ts',
];

let allSuccessful = true;
const results = [];

for (const schemaFile of testImports) {
  try {
    console.log(`Testing ${schemaFile}...`);
    
    // Try to require/import the schema
    const schema = require(schemaFile);
    
    // Check if it exports some expected properties
    const hasExports = Object.keys(schema).length > 0;
    
    if (hasExports) {
      console.log(`✅ ${schemaFile} - OK (${Object.keys(schema).length} exports)`);
      results.push({ file: schemaFile, status: 'OK', exports: Object.keys(schema).length });
    } else {
      console.log(`⚠️  ${schemaFile} - Warning: No exports found`);
      results.push({ file: schemaFile, status: 'WARNING', exports: 0 });
    }
    
  } catch (error) {
    console.log(`❌ ${schemaFile} - ERROR: ${error.message}`);
    results.push({ file: schemaFile, status: 'ERROR', error: error.message });
    allSuccessful = false;
  }
}

console.log('\n' + '='.repeat(60));
console.log('SCHEMA COMPILATION TEST RESULTS');
console.log('='.repeat(60));

results.forEach(result => {
  const status = result.status === 'OK' ? '✅' : 
                result.status === 'WARNING' ? '⚠️ ' : '❌';
  console.log(`${status} ${result.file}: ${result.status}`);
  if (result.error) console.log(`   Error: ${result.error}`);
  if (result.exports) console.log(`   Exports: ${result.exports}`);
});

console.log('\n' + '='.repeat(60));
if (allSuccessful) {
  console.log('✅ ALL SCHEMAS COMPILED SUCCESSFULLY');
  console.log('Database schema files are ready for migration.');
} else {
  console.log('❌ SOME SCHEMAS FAILED TO COMPILE');
  console.log('Fix the errors above before proceeding with migration.');
}
console.log('='.repeat(60));

process.exit(allSuccessful ? 0 : 1);