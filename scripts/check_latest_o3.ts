// Check what the actual O3 response looks like
import fs from 'fs';

const file = '/tmp/o3_response_1756999697960.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Root level keys:', Object.keys(data));
console.log('Is root array?', Array.isArray(data));

// If it's an array at root
if (Array.isArray(data)) {
  console.log('\n🔴 ROOT IS ARRAY with', data.length, 'items');
  console.log('First item keys:', data[0] ? Object.keys(data[0]) : 'empty');
  
  // Check if it has the output structure
  if (data[0]?.state?.currentStep?.output) {
    console.log('\nFound at data[0].state.currentStep.output');
    const output = JSON.parse(data[0].state.currentStep.output);
    console.log('Parsed:', output);
  }
}

// Check for output property
if (data.output !== undefined) {
  console.log('\ndata.output type:', typeof data.output);
  console.log('data.output is array:', Array.isArray(data.output));
  if (Array.isArray(data.output)) {
    console.log('data.output length:', data.output.length);
    console.log('data.output[0]:', data.output[0]);
  }
}

// Check state.currentStep
if (data.state?.currentStep?.output) {
  console.log('\nFound at state.currentStep.output');
  try {
    const parsed = JSON.parse(data.state.currentStep.output);
    console.log('Parsed:', parsed);
  } catch (e) {
    console.log('Not JSON:', data.state.currentStep.output);
  }
}