#!/usr/bin/env tsx

/**
 * Script to audit and optionally remove broken image references from marketing pages
 * 
 * Usage:
 *   npm run audit:images        # Check for broken images (dry run)
 *   npm run audit:images:fix    # Remove broken image code
 * 
 * Can be run as part of deployment process or scheduled job
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';

// Configuration
const MARKETING_DIRS = [
  'app',
  'components',
];

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
const TIMEOUT_MS = 5000;

interface BrokenImage {
  file: string;
  line: number;
  url: string;
  type: 'img-tag' | 'next-image' | 'bg-image' | 'url-reference';
  code: string;
}

// Patterns to detect image references
const IMAGE_PATTERNS = [
  // HTML img tags
  /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // Next.js Image components
  /<Image[^>]+src=["']([^"']+)["'][^>]*>/gi,
  // Background images in style
  /backgroundImage:\s*["']url\(([^)]+)\)["']/gi,
  // URL references in objects
  /(?:image|img|src|logo|icon|thumbnail):\s*["']([^"']+)["']/gi,
];

// Skip these patterns (known external services, placeholders, etc)
const SKIP_PATTERNS = [
  /^data:image\//,           // Data URLs
  /^blob:/,                   // Blob URLs
  /placeholder/i,             // Placeholder images
  /unsplash\.com/,           // Unsplash images
  /cloudinary\.com/,         // Cloudinary
  /imgur\.com/,              // Imgur
  /gravatar\.com/,           // Gravatar
  /github\.com.*\.(?:png|jpg|jpeg|gif|svg)/,  // GitHub avatars/images
];

// Known broken domains/patterns to always flag
const KNOWN_BROKEN_PATTERNS = [
  /linkio\.com\/wp-content/,  // Old WordPress uploads that no longer exist
  /your-domain\.com/,          // Placeholder domains
  /example\.com/,              // Example domains
];

async function checkImageExists(url: string): Promise<boolean> {
  // Check if it matches known broken patterns first
  if (KNOWN_BROKEN_PATTERNS.some(pattern => pattern.test(url))) {
    return false; // Known broken, don't even bother checking
  }

  try {
    // Local file check
    if (url.startsWith('/')) {
      const localPath = join(process.cwd(), 'public', url);
      try {
        await stat(localPath);
        return true;
      } catch {
        return false;
      }
    }

    // External URL check
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return response.ok;
      } catch {
        clearTimeout(timeout);
        return false;
      }
    }

    // Relative path without leading slash - check in public folder
    const localPath = join(process.cwd(), 'public', url);
    try {
      await stat(localPath);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

async function findBrokenImages(content: string, filePath: string): Promise<BrokenImage[]> {
  const brokenImages: BrokenImage[] = [];
  const lines = content.split('\n');
  const checkedUrls = new Set<string>();

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Skip if line is commented out
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      continue;
    }

    for (const pattern of IMAGE_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(line)) !== null) {
        const url = match[1];
        
        // Skip if already checked or matches skip patterns
        if (checkedUrls.has(url) || SKIP_PATTERNS.some(p => p.test(url))) {
          continue;
        }
        
        checkedUrls.add(url);
        
        // Check if it's an image file
        const ext = extname(url.split('?')[0]).toLowerCase();
        if (!IMAGE_EXTENSIONS.includes(ext) && !url.includes('image')) {
          continue;
        }

        // Check if image exists
        const exists = await checkImageExists(url);
        if (!exists) {
          let type: BrokenImage['type'] = 'url-reference';
          if (match[0].includes('<img')) type = 'img-tag';
          else if (match[0].includes('<Image')) type = 'next-image';
          else if (match[0].includes('backgroundImage')) type = 'bg-image';
          
          brokenImages.push({
            file: filePath,
            line: lineNum + 1,
            url,
            type,
            code: line.trim(),
          });
        }
      }
    }
  }

  return brokenImages;
}

async function scanFile(filePath: string): Promise<BrokenImage[]> {
  const content = await readFile(filePath, 'utf-8');
  return findBrokenImages(content, filePath);
}

async function scanDirectory(dir: string): Promise<BrokenImage[]> {
  const results: BrokenImage[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    // Skip node_modules, .next, and other build directories
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory()) {
      const subResults = await scanDirectory(fullPath);
      results.push(...subResults);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
        const fileResults = await scanFile(fullPath);
        results.push(...fileResults);
      }
    }
  }

  return results;
}

async function removeImageCode(brokenImage: BrokenImage): Promise<void> {
  const content = await readFile(brokenImage.file, 'utf-8');
  const lines = content.split('\n');
  
  // Simple approach: comment out the line with broken image
  // More sophisticated removal would need AST parsing
  if (lines[brokenImage.line - 1]?.includes(brokenImage.url)) {
    // For JSX, wrap in conditional render that always returns null
    if (brokenImage.type === 'img-tag' || brokenImage.type === 'next-image') {
      lines[brokenImage.line - 1] = `{/* Broken image removed: ${brokenImage.url} */}`;
    } else {
      // For other types, comment out the line
      lines[brokenImage.line - 1] = `// Broken image removed: ${brokenImage.url}`;
    }
    
    await writeFile(brokenImage.file, lines.join('\n'));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  
  console.log('🔍 Scanning for broken images in marketing pages...\n');
  
  const allBrokenImages: BrokenImage[] = [];
  
  for (const dir of MARKETING_DIRS) {
    const dirPath = join(process.cwd(), dir);
    try {
      const results = await scanDirectory(dirPath);
      allBrokenImages.push(...results);
    } catch (error) {
      console.warn(`⚠️  Could not scan directory ${dir}:`, error);
    }
  }
  
  if (allBrokenImages.length === 0) {
    console.log('✅ No broken images found!');
    process.exit(0);
  }
  
  console.log(`\n❌ Found ${allBrokenImages.length} broken images:\n`);
  
  // Group by file for better readability
  const byFile = allBrokenImages.reduce((acc, img) => {
    if (!acc[img.file]) acc[img.file] = [];
    acc[img.file].push(img);
    return acc;
  }, {} as Record<string, BrokenImage[]>);
  
  for (const [file, images] of Object.entries(byFile)) {
    console.log(`\n📄 ${file}:`);
    for (const img of images) {
      console.log(`   Line ${img.line}: ${img.url} (${img.type})`);
      console.log(`   Code: ${img.code.substring(0, 100)}${img.code.length > 100 ? '...' : ''}`);
    }
  }
  
  if (shouldFix) {
    console.log('\n🔧 Removing broken image references...\n');
    
    for (const img of allBrokenImages) {
      try {
        await removeImageCode(img);
        console.log(`   ✅ Fixed: ${img.file}:${img.line}`);
      } catch (error) {
        console.error(`   ❌ Failed to fix ${img.file}:${img.line}:`, error);
      }
    }
    
    console.log('\n✨ Broken images have been removed!');
    console.log('📝 Note: Please review the changes and test your application.');
  } else {
    console.log('\n💡 To remove these broken images, run:');
    console.log('   npm run audit:images:fix');
  }
  
  // Exit with error code if broken images found (useful for CI/CD)
  process.exit(allBrokenImages.length > 0 ? 1 : 0);
}

// Run the script
main().catch(console.error);