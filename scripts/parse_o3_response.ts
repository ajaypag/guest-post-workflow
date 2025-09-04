// Parse the O3 response to find the actual output
import fs from 'fs';

const filePath = '/tmp/o3_response_1756998347022.json';
const response = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Searching for O3 output...\n');

// 1. Check direct output
console.log('1. result.output:', JSON.stringify(response.output, null, 2));
console.log('   Type:', typeof response.output);
console.log('   Keys:', response.output ? Object.keys(response.output) : 'null');

// 2. Check state.currentStep
if (response.state?.currentStep) {
  console.log('\n2. result.state.currentStep:', JSON.stringify(response.state.currentStep, null, 2).substring(0, 200));
  if (response.state.currentStep.output) {
    console.log('   currentStep.output type:', typeof response.state.currentStep.output);
    try {
      const parsed = JSON.parse(response.state.currentStep.output);
      console.log('   ✅ PARSED currentStep.output:', JSON.stringify(parsed, null, 2).substring(0, 500));
    } catch (e) {
      console.log('   Not JSON:', response.state.currentStep.output);
    }
  }
}

// 3. Check modelResponses
if (response.state?.modelResponses?.[0]) {
  const mr = response.state.modelResponses[0];
  console.log('\n3. modelResponses[0].output length:', Array.isArray(mr.output) ? mr.output.length : 'not array');
  
  // Find the last message
  if (Array.isArray(mr.output)) {
    for (let i = mr.output.length - 1; i >= 0; i--) {
      const item = mr.output[i];
      if (item?.content) {
        console.log(`   Item ${i} has content:`, JSON.stringify(item.content).substring(0, 200));
        if (Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.text) {
              try {
                const parsed = JSON.parse(c.text);
                console.log(`   ✅ FOUND at output[${i}].content.text:`, JSON.stringify(parsed, null, 2).substring(0, 500));
                break;
              } catch (e) {
                // Not JSON
              }
            }
          }
        }
      }
    }
  }
}

// 4. Check for completedSteps
if (response.state?.completedSteps) {
  console.log('\n4. completedSteps:', response.state.completedSteps.length);
  for (const step of response.state.completedSteps) {
    if (step.output) {
      console.log('   Found step output:', typeof step.output);
      if (typeof step.output === 'string') {
        try {
          const parsed = JSON.parse(step.output);
          console.log('   ✅ PARSED completedStep.output:', JSON.stringify(parsed, null, 2).substring(0, 500));
        } catch (e) {
          // Not JSON
        }
      }
    }
  }
}