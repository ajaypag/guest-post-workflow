#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  'app/api/publisher/invoices/route.ts',
  'app/api/publisher/payment-profile/route.ts', 
  'app/api/publisher/orders/[lineItemId]/status/route.ts'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if sql is already imported
  if (!content.includes("import { sql }") && !content.includes("{ sql,")) {
    // Add sql import after drizzle-orm imports
    if (content.includes("from 'drizzle-orm'")) {
      content = content.replace(
        /from 'drizzle-orm';/,
        ", sql } from 'drizzle-orm';"
      );
    } else {
      // Add new import line after db import
      content = content.replace(
        /import { db } from '@\/lib\/db\/connection';/,
        "import { db } from '@/lib/db/connection';\nimport { sql } from 'drizzle-orm';"
      );
    }
  }
  
  // For dynamic queries with args array, we need to keep using prepared statements
  // But we need to convert them to use sql`` template syntax where possible
  
  // Count how many db.execute({ we have
  const matches = content.match(/await db\.execute\(\{/g);
  if (matches) {
    console.log(`Found ${matches.length} db.execute({ calls in ${file}`);
    
    // For now, let's convert them to use sql.raw() which accepts strings
    // This is a temporary fix for TypeScript compilation
    
    // Replace db.execute({ sql: `...`, args: [...] }) pattern with prepared statement
    // We need to use sql`` for simple cases and keep complex dynamic SQL as is
    
    // For complex dynamic queries, we'll need manual fixes
    console.log(`Please manually review and fix ${file}`);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});

console.log('\nNote: Complex dynamic queries need manual review.');
console.log('The TypeScript error is because db.execute expects sql`` template or sql.raw()');