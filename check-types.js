const { execSync } = require('child_process');

console.log('Running TypeScript type check...\n');

try {
  execSync('npx tsc --noEmit', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('\n✅ No TypeScript errors found!');
  process.exit(0);
} catch (error) {
  console.log('\n❌ TypeScript errors found');
  process.exit(1);
}