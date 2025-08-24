// Manual test to check if gaps are parsing correctly
const testGaps = [
  {"category": "Business Model", "question": "Is there a permanent free tier or community edition of Linkio beyond the 7-day free trial?", "importance": "high"}, 
  {"category": "Business Model", "question": "Does Linkio offer an enterprise or custom plan for users needing more than the Plus plan limits?", "importance": "high"}, 
  {"category": "Company", "question": "What is the current status of Linkio's leadership and ownership?", "importance": "medium"}
];

console.log('Test gaps data:');
console.log(`Number of gaps: ${testGaps.length}`);
console.log(`First gap category: ${testGaps[0].category}`);
console.log(`First gap question: ${testGaps[0].question}`);
console.log(`First gap importance: ${testGaps[0].importance}`);

// Test the conditional logic
if (testGaps && testGaps.length > 0) {
  console.log('✅ Gaps should render');
  testGaps.forEach((gap, idx) => {
    console.log(`Gap ${idx + 1}: ${gap.importance?.toUpperCase() || 'MEDIUM'} - ${gap.category || 'General'}: ${gap.question || 'Question not available'}`);
  });
} else {
  console.log('❌ No gaps to render');
}