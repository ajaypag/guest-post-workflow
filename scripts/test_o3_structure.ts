// Test what O3 runner actually returns
import fs from 'fs';

// Load the saved O3 response
const savedResponse = JSON.parse(fs.readFileSync('/tmp/o3_response_1756998347022.json', 'utf8'));

// Simulate what the runner might return
console.log('Testing different possibilities:\n');

// 1. Direct output field?
console.log('1. Has direct result.output?', 'output' in savedResponse);

// 2. Check currentStep
if (savedResponse.state?.currentStep?.output) {
  console.log('2. Found at result.state.currentStep.output (string)');
  const parsed = JSON.parse(savedResponse.state.currentStep.output);
  console.log('   Domain:', parsed.domain);
  console.log('   Niches:', parsed.niches);
}

// 3. Check what the actual library might return
// The library might return a simplified structure
const possibleSimplified = {
  output: savedResponse.state?.currentStep?.output || null,
  state: savedResponse.state
};

console.log('\n3. If library returns simplified structure:');
console.log('   result.output exists?', 'output' in possibleSimplified);
console.log('   result.output type?', typeof possibleSimplified.output);
if (typeof possibleSimplified.output === 'string') {
  const parsed = JSON.parse(possibleSimplified.output);
  console.log('   Parsed data - Domain:', parsed.domain);
  console.log('   Parsed data - Niches:', parsed.niches);
}

// 4. The actual issue - result.output is being set to something but it's not the right data
console.log('\n4. Analyzing the problem:');
console.log('   The code says "Got O3 response from result.output object"');
console.log('   But result.output must be undefined or wrong type');
console.log('   Because later it fails the domain check');