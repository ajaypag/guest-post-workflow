#!/usr/bin/env tsx

/**
 * Test script for keyword generation automation
 * Tests the complete OpenAI keyword generation workflow
 * 
 * Usage: npx tsx scripts/test-keyword-generation.ts
 */

import { generateKeywords, formatKeywordsForStorage, parseKeywordsFromStorage } from '../lib/services/keywordGenerationService';

async function testKeywordGeneration() {
  console.log('🧪 Testing OpenAI Keyword Generation');
  console.log('=====================================');

  // Test URLs for different types of content
  const testUrls = [
    'https://example.com/how-to-build-website',
    'https://sample-blog.com/best-seo-practices',
  ];

  for (const testUrl of testUrls) {
    console.log(`\n🔍 Testing URL: ${testUrl}`);
    console.log('-'.repeat(50));

    try {
      // Step 1: Test direct keyword generation
      console.log('📝 Step 1: Generating keywords with OpenAI...');
      const result = await generateKeywords(testUrl);

      if (result.success) {
        console.log('✅ Keywords generated successfully:');
        console.log(`   Count: ${result.keywords.length}`);
        console.log(`   Keywords: ${result.keywords.join(', ')}`);
        console.log(`   Prompt ID: ${result.promptId}`);
        console.log(`   Conversation ID: ${result.conversationId}`);
        
        // Step 2: Test keyword formatting
        console.log('\n📦 Step 2: Testing keyword formatting...');
        const formatted = formatKeywordsForStorage(result.keywords);
        const parsed = parseKeywordsFromStorage(formatted);
        
        console.log(`   Formatted: ${formatted}`);
        console.log(`   Parsed back: ${parsed.join(', ')}`);
        console.log(`   ✅ Round-trip successful: ${result.keywords.length === parsed.length}`);
        
      } else {
        console.log('❌ Keywords generation failed:');
        console.log(`   Error: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
    }

    console.log('\n' + '='.repeat(50));
  }

  console.log('\n🏁 Keyword generation testing completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Keywords column is already added to database');
  console.log('   2. Test API endpoints: /api/keywords/generate and /api/target-pages/[id]/keywords');
  console.log('   3. Use AI Keywords buttons in client target pages section');
  console.log('\n📋 Implementation features:');
  console.log('   • Uses OpenAI Responses API with your prompt ID');
  console.log('   • Two-step process: initial keywords + listicle analysis');
  console.log('   • Automatic keyword parsing and storage');
  console.log('   • UI components for easy keyword generation');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testKeywordGeneration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testKeywordGeneration };