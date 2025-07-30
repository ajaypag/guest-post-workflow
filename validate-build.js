const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Running build validation...\n');

const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: __dirname,
  shell: true
});

let output = '';
let errorFound = false;

buildProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  
  if (text.includes('Type error:') || text.includes('Failed to compile')) {
    errorFound = true;
    console.log(text);
  }
  
  if (text.includes('Compiled successfully')) {
    console.log('✅ Build compiled successfully!');
  }
});

buildProcess.stderr.on('data', (data) => {
  const text = data.toString();
  if (text.includes('error')) {
    console.error(text);
  }
});

buildProcess.on('close', (code) => {
  if (code !== 0 || errorFound) {
    console.log('\n❌ Build failed with errors');
    // Extract and show the actual errors
    const lines = output.split('\n');
    let inError = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Type error:')) {
        inError = true;
      }
      if (inError && lines[i].trim() === '') {
        inError = false;
      }
      if (inError) {
        console.log(lines[i]);
      }
    }
    process.exit(1);
  } else {
    console.log('\n✅ Build completed successfully!');
    process.exit(0);
  }
});

// Timeout after 2 minutes
setTimeout(() => {
  console.log('\n⏱️ Build check timed out');
  buildProcess.kill();
  process.exit(1);
}, 120000);