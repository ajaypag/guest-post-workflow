// Simple test to validate target matching functionality
const { execSync } = require('child_process');

async function runManualUITest() {
  console.log('🎯 Manual Frontend UI Test for Target URL Matching');
  console.log('==================================================');
  
  try {
    // Test 1: TypeScript compilation
    console.log('1. Testing TypeScript compilation...');
    const buildResult = execSync('timeout 180 npm run build', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    if (buildResult.includes('Compiled successfully')) {
      console.log('✅ TypeScript compilation: PASSED');
    } else {
      console.log('⚠️ TypeScript compilation: Check for issues');
    }
    
  } catch (error) {
    console.log(`❌ Build error: ${error.message}`);
  }
  
  // Test 2: Database Schema Validation
  console.log('\n2. Testing database schema...');
  try {
    const schemaTest = execSync(`
      DATABASE_URL="postgresql://postgres:postgres@localhost:5434/guest_post_workflow?sslmode=disable" \
      psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'bulk_analysis_domains' AND column_name IN ('suggested_target_url', 'target_match_data', 'target_matched_at');"
    `, { encoding: 'utf8' });
    
    if (schemaTest.includes('suggested_target_url') && 
        schemaTest.includes('target_match_data') && 
        schemaTest.includes('target_matched_at')) {
      console.log('✅ Database schema: Target matching fields present');
    } else {
      console.log('❌ Database schema: Missing target matching fields');
    }
  } catch (error) {
    console.log(`❌ Database schema test failed: ${error.message}`);
  }
  
  // Test 3: API Endpoint Availability
  console.log('\n3. Testing API endpoints...');
  try {
    // Check if API files exist
    const fs = require('fs');
    const targetMatchPath = 'app/api/clients/[id]/bulk-analysis/target-match/route.ts';
    const masterQualifyPath = 'app/api/clients/[id]/bulk-analysis/master-qualify/route.ts';
    
    if (fs.existsSync(targetMatchPath)) {
      console.log('✅ Target match endpoint: File exists');
    } else {
      console.log('❌ Target match endpoint: File missing');
    }
    
    if (fs.existsSync(masterQualifyPath)) {
      console.log('✅ Master qualify endpoint: File exists');
    } else {
      console.log('❌ Master qualify endpoint: File missing');
    }
    
  } catch (error) {
    console.log(`❌ API endpoint test failed: ${error.message}`);
  }
  
  // Test 4: Component File Validation
  console.log('\n4. Testing UI components...');
  try {
    const fs = require('fs');
    const bulkTablePath = 'components/BulkAnalysisTable.tsx';
    const typesPath = 'types/bulk-analysis.ts';
    
    if (fs.existsSync(bulkTablePath)) {
      const content = fs.readFileSync(bulkTablePath, 'utf8');
      if (content.includes('MatchQualityIndicator') && 
          content.includes('onRunTargetMatching') &&
          content.includes('suggestedTargetUrl')) {
        console.log('✅ BulkAnalysisTable: Target matching features present');
      } else {
        console.log('⚠️ BulkAnalysisTable: Some target matching features missing');
      }
    }
    
    if (fs.existsSync(typesPath)) {
      const content = fs.readFileSync(typesPath, 'utf8');
      if (content.includes('suggestedTargetUrl') && 
          content.includes('targetMatchData')) {
        console.log('✅ TypeScript types: Target matching fields present');
      } else {
        console.log('❌ TypeScript types: Target matching fields missing');
      }
    }
    
  } catch (error) {
    console.log(`❌ Component test failed: ${error.message}`);
  }
  
  // Test Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log('✅ = Feature implemented correctly');
  console.log('⚠️ = Feature partially implemented or needs review');
  console.log('❌ = Feature missing or has errors');
  
  console.log('\n🏁 Manual UI Testing Complete');
  console.log('Next steps: Test the UI in browser at /clients/[id]/bulk-analysis/projects/[projectId]');
}

runManualUITest().catch(console.error);