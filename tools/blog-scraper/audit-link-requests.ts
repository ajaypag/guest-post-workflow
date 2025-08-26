import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkRequest {
  pageUrl: string;
  anchor: string;
  targetUrl: string;
  modification: string;
  status: string;
  requester: string;
}

// List of pages from the CSV (removing trailing slashes)
const csvPages = [
  'how-to-create-a-content-marketing-strategy-for-ecommerce',
  'social-media-link-building',
  'link-prospecting',
  'how-to-use-seo-to-improve-conversion-rate',
  'best-link-building-services',
  'best-blogger-outreach-services',
  'why-every-business-needs-a-website',
  'how-to-increase-domain-authority',
  'top-10-link-building-techniques',
  'best-blogs/finance-blogs-to-follow' // This one doesn't exist in current structure
];

async function auditPages() {
  console.log('=== LINK REQUESTS AUDIT REPORT ===\n');
  
  const appDir = path.join(__dirname, '../../app');
  
  // Read CSV file
  const csvPath = path.join(__dirname, 'Link requests for Linkio - Sheet1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records: LinkRequest[] = [];
  
  // Simple CSV parsing - split by lines and parse each row
  const lines = csvContent.split('\n');
  
  // Skip first 2 lines (header rows)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line - handle quoted fields that may contain commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim()); // Add the last field
    
    if (fields[0] && fields[0].startsWith('https://')) { // If Page URL exists
      records.push({
        pageUrl: fields[0] || '',
        anchor: fields[1] || '',
        targetUrl: fields[2] || '',
        modification: fields[3] || '',
        status: fields[4] || '',
        requester: fields[5] || ''
      });
    }
  }
  
  console.log(`Total link requests: ${records.length}\n`);
  
  // Group by status
  const byStatus = {
    requested: records.filter(r => r.status.toLowerCase() === 'requested'),
    removed: records.filter(r => r.status.toLowerCase() === 'removed')
  };
  
  console.log(`Status breakdown:`);
  console.log(`- Requested: ${byStatus.requested.length}`);
  console.log(`- Removed: ${byStatus.removed.length}\n`);
  
  // Check which pages exist
  console.log('=== PAGE EXISTENCE CHECK ===\n');
  
  const pageExistence = new Map<string, boolean>();
  const uniquePages = new Set(records.map(r => {
    // Extract slug from URL
    const url = r.pageUrl.replace('https://www.linkio.com/', '').replace(/\/$/, '');
    return url;
  }));
  
  for (const pageSlug of uniquePages) {
    const pagePath = path.join(appDir, pageSlug);
    const exists = fs.existsSync(pagePath);
    pageExistence.set(pageSlug, exists);
    console.log(`${exists ? '✅' : '❌'} /${pageSlug}/`);
  }
  
  // Analyze link requests by page
  console.log('\n=== LINK REQUESTS BY PAGE ===\n');
  
  const pageGroups = new Map<string, LinkRequest[]>();
  records.forEach(record => {
    const slug = record.pageUrl.replace('https://www.linkio.com/', '').replace(/\/$/, '');
    if (!pageGroups.has(slug)) {
      pageGroups.set(slug, []);
    }
    pageGroups.get(slug)!.push(record);
  });
  
  // Sort pages by existence and then alphabetically
  const sortedPages = Array.from(pageGroups.keys()).sort((a, b) => {
    const aExists = pageExistence.get(a) || false;
    const bExists = pageExistence.get(b) || false;
    if (aExists && !bExists) return -1;
    if (!aExists && bExists) return 1;
    return a.localeCompare(b);
  });
  
  for (const pageSlug of sortedPages) {
    const requests = pageGroups.get(pageSlug)!;
    const exists = pageExistence.get(pageSlug);
    const requestedLinks = requests.filter(r => r.status.toLowerCase() === 'requested');
    
    console.log(`\n${exists ? '📄' : '⚠️ '} /${pageSlug}/ ${exists ? '(EXISTS)' : '(MISSING)'}`);
    console.log(`   Total requests: ${requests.length} (${requestedLinks.length} pending)`);
    
    if (requestedLinks.length > 0) {
      requestedLinks.forEach(req => {
        console.log(`   - ${req.anchor || 'Custom modification'} → ${req.targetUrl}`);
        if (req.modification) {
          console.log(`     Note: ${req.modification.substring(0, 100)}...`);
        }
      });
    }
  }
  
  // Summary
  console.log('\n=== SUMMARY ===\n');
  
  const existingPages = Array.from(pageExistence.entries()).filter(([_, exists]) => exists);
  const missingPages = Array.from(pageExistence.entries()).filter(([_, exists]) => !exists);
  
  console.log(`Pages that exist: ${existingPages.length}/${pageExistence.size}`);
  console.log(`Pages missing: ${missingPages.length}/${pageExistence.size}`);
  
  if (missingPages.length > 0) {
    console.log('\nMissing pages:');
    missingPages.forEach(([slug]) => {
      const reqs = pageGroups.get(slug)!;
      const pending = reqs.filter(r => r.status.toLowerCase() === 'requested').length;
      console.log(`  - /${slug}/ (${pending} pending requests)`);
    });
  }
  
  // Export actionable data
  const actionableData = {
    existingPages: existingPages.map(([slug]) => ({
      slug,
      requests: pageGroups.get(slug)!.filter(r => r.status.toLowerCase() === 'requested')
    })),
    missingPages: missingPages.map(([slug]) => ({
      slug,
      requests: pageGroups.get(slug)!.filter(r => r.status.toLowerCase() === 'requested')
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'link-requests-audit.json'),
    JSON.stringify(actionableData, null, 2)
  );
  
  console.log('\n✅ Audit complete! Results saved to link-requests-audit.json');
}

auditPages().catch(console.error);