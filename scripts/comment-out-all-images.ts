#!/usr/bin/env tsx

/**
 * Script to comment out all image references in marketing pages
 * This is a quick fix to remove all potentially broken images
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

async function commentOutImages(filePath: string): Promise<boolean> {
  let content = await readFile(filePath, 'utf-8');
  const originalContent = content;
  
  // Comment out <Image components
  content = content.replace(/<Image\s+[^>]*\/>/g, (match) => {
    return `{/* ${match} */}`;
  });
  
  // Comment out multi-line Image components
  content = content.replace(/<Image\s+[^>]*>[^<]*<\/Image>/g, (match) => {
    return `{/* ${match} */}`;
  });
  
  // Comment out img tags
  content = content.replace(/<img\s+[^>]*\/?>/g, (match) => {
    return `{/* ${match} */}`;
  });
  
  // Comment out heroImage props in BlogPostTemplate
  content = content.replace(/heroImage="[^"]*"/g, 'heroImage=""');
  
  // Comment out src props that look like images (but not in already commented sections)
  content = content.replace(/(\s+)src="(https?:\/\/[^"]*\.(png|jpg|jpeg|gif|webp|svg)[^"]*)"/g, (match, spaces) => {
    if (!match.includes('/*')) {
      return `${spaces}src="" // Commented out: ${match.trim()}`;
    }
    return match;
  });
  
  if (content !== originalContent) {
    await writeFile(filePath, content);
    return true;
  }
  
  return false;
}

async function processDirectory(dir: string): Promise<number> {
  let modifiedCount = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    // Skip node_modules and build directories
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    
    if (entry.isDirectory()) {
      modifiedCount += await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (['.tsx', '.jsx'].includes(ext)) {
        // Only process marketing pages (blog posts, etc)
        const relativePath = fullPath.replace(process.cwd(), '');
        
        // Skip non-marketing pages
        if (relativePath.includes('/admin/') || 
            relativePath.includes('/api/') ||
            relativePath.includes('/account/') ||
            relativePath.includes('/components/') && !relativePath.includes('BlogPostTemplate')) {
          continue;
        }
        
        const modified = await commentOutImages(fullPath);
        if (modified) {
          console.log(`✓ Commented out images in: ${relativePath}`);
          modifiedCount++;
        }
      }
    }
  }
  
  return modifiedCount;
}

async function main() {
  console.log('🔧 Commenting out all images in marketing pages...\n');
  
  const modifiedCount = await processDirectory(join(process.cwd(), 'app'));
  
  // Also process BlogPostTemplate component
  const templatePath = join(process.cwd(), 'components', 'BlogPostTemplate.tsx');
  try {
    const modified = await commentOutImages(templatePath);
    if (modified) {
      console.log(`✓ Commented out images in: /components/BlogPostTemplate.tsx`);
    }
  } catch (err) {
    // Template might not exist
  }
  
  console.log(`\n✨ Done! Modified ${modifiedCount} files.`);
  console.log('📝 All images have been commented out. You can uncomment them later when you have valid URLs.');
}

main().catch(console.error);