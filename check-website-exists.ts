import { db } from './lib/db/connection';
import { websites } from './lib/db/websiteSchema';
import { or, eq, sql } from 'drizzle-orm';

async function checkWebsite() {
  const domainName = 'valasys.com';
  
  console.log(`\n=== Checking website for ${domainName} ===\n`);
  
  // Try simple exact match first
  const exactMatch = await db.query.websites.findFirst({
    where: eq(websites.domain, domainName)
  });
  
  console.log('Exact match:', exactMatch ? 'Found' : 'Not found');
  
  // Try with www prefix
  const wwwMatch = await db.query.websites.findFirst({
    where: eq(websites.domain, `www.${domainName}`)
  });
  
  console.log('WWW match:', wwwMatch ? 'Found' : 'Not found');
  
  // List all websites to see what we have
  const allWebsites = await db.select({
    domain: websites.domain,
    guestPostCost: websites.guestPostCost,
    domainRating: websites.domainRating
  }).from(websites).limit(10);
  
  console.log('\nFirst 10 websites in database:');
  allWebsites.forEach(w => {
    console.log(`  ${w.domain} - Cost: $${w.guestPostCost || 0}, DR: ${w.domainRating || 0}`);
  });
  
  // Check if the domains we're trying to assign exist
  const testDomains = ['valasys.com', 'trackmyhashtag.com'];
  
  console.log('\nChecking specific domains:');
  for (const domain of testDomains) {
    const found = await db.query.websites.findFirst({
      where: or(
        eq(websites.domain, domain),
        eq(websites.domain, `www.${domain}`)
      )
    });
    console.log(`  ${domain}: ${found ? 'EXISTS' : 'NOT FOUND'}`);
  }
  
  process.exit(0);
}

checkWebsite().catch(console.error);