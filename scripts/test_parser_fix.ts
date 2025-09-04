// Test the parser fix
import fs from 'fs';

const response = JSON.parse(fs.readFileSync('/tmp/o3_response_1756998347022.json', 'utf8'));

// Simulate what our fixed code will do
let output: any = null;

// Try direct output first
if (response.output) {
  if (typeof response.output === 'string') {
    try {
      output = JSON.parse(response.output);
      console.log(`✅ Parsed O3 response from result.output string`);
      if (output && output.domain) {
        console.log(`✅ Returning valid analysis for ${output.domain}`);
        console.log('OUTPUT:', JSON.stringify(output, null, 2));
        process.exit(0);
      }
    } catch (e) {
      console.error(`Failed to parse result.output as JSON`);
    }
  } else if (typeof response.output === 'object') {
    const keys = Object.keys(response.output);
    if (keys.length === 0) {
      console.log(`⚠️ result.output is empty object {}, continuing to check other locations...`);
    } else if (response.output.domain) {
      console.log(`✅ Got valid O3 response from result.output object`);
      console.log('OUTPUT:', JSON.stringify(response.output, null, 2));
      process.exit(0);
    } else {
      console.log(`❌ result.output is object with keys [${keys.join(', ')}] but no domain property`);
    }
  }
}

// Check for output in currentStep (newer O3 structure)
if (!output && response.state && response.state.currentStep && response.state.currentStep.output) {
  if (typeof response.state.currentStep.output === 'string') {
    try {
      output = JSON.parse(response.state.currentStep.output);
      console.log(`✅ Parsed O3 response from result.state.currentStep.output`);
      if (output && output.domain) {
        console.log(`✅ Returning valid analysis for ${output.domain}`);
        console.log('OUTPUT:', JSON.stringify(output, null, 2));
        
        // Show what we'll save
        console.log('\nData to save:');
        console.log('- Existing niches:', output.niches);
        console.log('- Suggested new niches:', output.suggestedNewNiches);
        console.log('- Combined niches:', [...output.niches, ...(output.suggestedNewNiches || [])]);
        console.log('- Categories:', output.categories);
        console.log('- Suggested new categories:', output.suggestedNewCategories);
        process.exit(0);
      }
    } catch (e) {
      console.error(`Failed to parse result.state.currentStep.output as JSON`);
    }
  }
}

console.log('❌ Could not find valid output in response');