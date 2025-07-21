const fs = require('fs');
const path = require('path');

function listRoutes(dir, basePath = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      listRoutes(filePath, path.join(basePath, file));
    } else if (file === 'page.tsx' || file === 'page.ts' || file === 'page.jsx' || file === 'page.js') {
      console.log(`Route found: ${basePath || '/'}`);
    }
  });
}

console.log('=== Listing all app routes ===');
const appDir = path.join(__dirname, '..', 'app');
if (fs.existsSync(appDir)) {
  listRoutes(appDir);
} else {
  console.log('App directory not found!');
}
console.log('=== End of routes ===');