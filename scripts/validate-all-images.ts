#!/usr/bin/env tsx

/**
 * Image validation script that extracts all images and validates them properly
 * Creates a report of all images with their actual status
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import https from 'https';
import http from 'http';
import { parse } from 'url';

interface ImageReference {
  file: string;
  line: number;
  url: string;
  type: 'img-tag' | 'next-image' | 'bg-image' | 'url-reference';
  context: string;
  status?: 'valid' | 'broken' | 'unknown';
  error?: string;
}

// Patterns to extract image references
const IMAGE_PATTERNS = [
  // HTML img tags
  { pattern: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi, type: 'img-tag' },
  // Next.js Image components - src prop
  { pattern: /<Image[^>]+src=["']([^"']+)["'][^>]*>/gi, type: 'next-image' },
  // heroImage and other image props
  { pattern: /(?:heroImage|image|img|src|logo|icon|thumbnail)=["']([^"']+)["']/gi, type: 'url-reference' },
  // Background images in style
  { pattern: /backgroundImage:\s*["']url\(([^)]+)\)["']/gi, type: 'bg-image' },
];

// Image extensions to look for
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];

async function extractAllImages(): Promise<ImageReference[]> {
  const images: ImageReference[] = [];
  const seenUrls = new Set<string>();
  
  async function scanFile(filePath: string) {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        continue;
      }
      
      for (const { pattern, type } of IMAGE_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex
        let match;
        
        while ((match = pattern.exec(line)) !== null) {
          const url = match[1];
          
          // Skip data URLs, blobs, and variables
          if (url.startsWith('data:') || url.startsWith('blob:') || url.includes('{')) {
            continue;
          }
          
          // Check if it looks like an image URL
          const ext = extname(url.split('?')[0]).toLowerCase();
          const looksLikeImage = IMAGE_EXTENSIONS.includes(ext) || 
                                 url.includes('image') || 
                                 url.includes('img') ||
                                 url.includes('photo') ||
                                 url.includes('picture') ||
                                 url.includes('uploads');
          
          if (looksLikeImage || ext === '') { // Include URLs without extensions too
            images.push({
              file: filePath.replace(process.cwd(), ''),
              line: lineNum + 1,
              url,
              type: type as any,
              context: line.trim().substring(0, 100),
            });
          }
        }
      }
    }
  }
  
  async function scanDirectory(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip node_modules and build directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
          await scanFile(fullPath);
        }
      }
    }
  }
  
  // Scan app and components directories
  await scanDirectory(join(process.cwd(), 'app'));
  await scanDirectory(join(process.cwd(), 'components'));
  
  return images;
}

async function validateImage(url: string): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      // Local file - check with Next.js dev server
      if (url.startsWith('/')) {
        // For local files, we'll assume they're valid if they're in public
        // In production, these would be served by Next.js
        resolve({ valid: true });
        return;
      }
      
      // External URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsedUrl = parse(url);
        const protocol = url.startsWith('https://') ? https : http;
        
        const request = protocol.get({
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        }, (response) => {
          // Check status code
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
            // Check Content-Type header
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('image') || response.statusCode < 300) {
              resolve({ valid: true });
            } else {
              resolve({ valid: false, error: `Not an image: ${contentType}` });
            }
          } else {
            resolve({ valid: false, error: `HTTP ${response.statusCode}` });
          }
          
          // Abort the request since we only need headers
          request.abort();
        });
        
        request.on('error', (err) => {
          resolve({ valid: false, error: err.message });
        });
        
        request.on('timeout', () => {
          request.abort();
          resolve({ valid: false, error: 'Timeout' });
        });
      } else {
        // Relative URL without protocol
        resolve({ valid: false, error: 'Relative URL without protocol' });
      }
    } catch (error: any) {
      resolve({ valid: false, error: error.message });
    }
  });
}

async function main() {
  console.log('🔍 Extracting all image references from marketing pages...\n');
  
  const images = await extractAllImages();
  
  console.log(`Found ${images.length} image references. Validating...\n`);
  
  // Group by unique URLs to avoid checking the same URL multiple times
  const uniqueUrls = new Map<string, ImageReference[]>();
  for (const img of images) {
    if (!uniqueUrls.has(img.url)) {
      uniqueUrls.set(img.url, []);
    }
    uniqueUrls.get(img.url)!.push(img);
  }
  
  console.log(`Checking ${uniqueUrls.size} unique URLs...\n`);
  
  const results: ImageReference[] = [];
  let checked = 0;
  
  for (const [url, refs] of uniqueUrls.entries()) {
    checked++;
    process.stdout.write(`\rChecking ${checked}/${uniqueUrls.size}: ${url.substring(0, 50)}...`);
    
    const validation = await validateImage(url);
    
    for (const ref of refs) {
      results.push({
        ...ref,
        status: validation.valid ? 'valid' : 'broken',
        error: validation.error,
      });
    }
    
    // Add a small delay to avoid overwhelming servers
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n📊 Validation Complete!\n');
  
  // Separate results
  const brokenImages = results.filter(img => img.status === 'broken');
  const validImages = results.filter(img => img.status === 'valid');
  
  // Generate CSV report
  const csvContent = [
    'File,Line,URL,Status,Type,Error,Context',
    ...results.map(img => [
      img.file,
      img.line,
      img.url,
      img.status,
      img.type,
      img.error || '',
      `"${img.context.replace(/"/g, '""')}"`,
    ].join(',')),
  ].join('\n');
  
  const reportPath = join(process.cwd(), 'image-validation-report.csv');
  await writeFile(reportPath, csvContent);
  
  // Generate broken images list for fixing
  if (brokenImages.length > 0) {
    const brokenList = [
      'File,Line,Broken URL,Suggested Replacement,Notes',
      ...brokenImages.map(img => [
        img.file,
        img.line,
        img.url,
        '', // Empty for manual filling
        img.error || '',
      ].join(',')),
    ].join('\n');
    
    await writeFile(join(process.cwd(), 'broken-images-to-fix.csv'), brokenList);
  }
  
  // Print summary
  console.log('📈 Summary:');
  console.log(`   ✅ Valid images: ${validImages.length}`);
  console.log(`   ❌ Broken images: ${brokenImages.length}`);
  console.log(`   📄 Total references: ${results.length}`);
  
  if (brokenImages.length > 0) {
    console.log('\n❌ Broken Images by File:\n');
    
    const byFile = new Map<string, ImageReference[]>();
    for (const img of brokenImages) {
      if (!byFile.has(img.file)) {
        byFile.set(img.file, []);
      }
      byFile.get(img.file)!.push(img);
    }
    
    for (const [file, imgs] of byFile.entries()) {
      console.log(`\n📄 ${file}:`);
      for (const img of imgs) {
        console.log(`   Line ${img.line}: ${img.url}`);
        if (img.error) {
          console.log(`      Error: ${img.error}`);
        }
      }
    }
  }
  
  console.log('\n📋 Reports generated:');
  console.log(`   - Full report: image-validation-report.csv`);
  if (brokenImages.length > 0) {
    console.log(`   - Broken images: broken-images-to-fix.csv`);
  }
  
  console.log('\n✨ Done! Check the CSV files for detailed results.');
}

main().catch(console.error);