import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq, sql, like } from 'drizzle-orm';

async function normalizeWebsiteDomains() {
  console.log('🔄 Starting website domain normalization...\n');
  
  try {
    // First, get all websites that need normalization
    console.log('1️⃣ Checking websites that need normalization...');
    
    const unnormalizedWebsites = await db.execute(sql`
      SELECT 
        id,
        domain,
        CASE
          WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
          WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')  
          ELSE domain
        END as step1,
        CASE
          WHEN domain LIKE 'www.%' OR domain LIKE 'WWW.%' THEN regexp_replace(
            CASE
              WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
              WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
              ELSE domain
            END, '^www\.', '', 'i')
          ELSE 
            CASE
              WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
              WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
              ELSE domain
            END
        END as step2,
        lower(trim(trailing '/' from 
          CASE
            WHEN domain LIKE 'www.%' OR domain LIKE 'WWW.%' THEN regexp_replace(
              CASE
                WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                ELSE domain
              END, '^www\.', '', 'i')
            ELSE 
              CASE
                WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                ELSE domain
              END
          END
        )) as normalized_domain
      FROM websites
      WHERE 
        domain LIKE 'www.%' 
        OR domain LIKE 'WWW.%'
        OR domain LIKE 'http://%'
        OR domain LIKE 'https://%'
        OR domain LIKE '%/'
        OR domain != lower(trim(domain))
      ORDER BY domain
    `);
    
    console.log(`Found ${unnormalizedWebsites.rows.length} websites that need normalization\n`);
    
    if (unnormalizedWebsites.rows.length === 0) {
      console.log('✅ All domains are already normalized!');
      process.exit(0);
    }
    
    // Show examples
    console.log('📋 Sample normalization preview:');
    unnormalizedWebsites.rows.slice(0, 10).forEach((row: any) => {
      console.log(`  ${row.domain} → ${row.normalized_domain}`);
    });
    console.log('');
    
    // Check for potential conflicts after normalization
    console.log('2️⃣ Checking for potential conflicts after normalization...');
    
    const conflictCheck = await db.execute(sql`
      WITH normalized AS (
        SELECT 
          id,
          domain as original_domain,
          lower(trim(trailing '/' from 
            CASE
              WHEN domain LIKE 'www.%' OR domain LIKE 'WWW.%' THEN regexp_replace(
                CASE
                  WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  ELSE domain
                END, '^www\.', '', 'i')
              ELSE 
                CASE
                  WHEN domain LIKE 'https://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  WHEN domain LIKE 'http://%' THEN regexp_replace(domain, '^https?://', '', 'i')
                  ELSE domain
                END
            END
          )) as normalized_domain
        FROM websites
        WHERE 
          domain LIKE 'www.%' 
          OR domain LIKE 'WWW.%'
          OR domain LIKE 'http://%'
          OR domain LIKE 'https://%'
          OR domain LIKE '%/'
          OR domain != lower(trim(domain))
      )
      SELECT 
        n.normalized_domain,
        n.original_domain as conflicting_unnormalized,
        w.domain as existing_normalized,
        n.id as unnormalized_id,
        w.id as normalized_id
      FROM normalized n
      JOIN websites w ON w.domain = n.normalized_domain
      WHERE w.id != n.id
      ORDER BY n.normalized_domain
    `);
    
    if (conflictCheck.rows.length > 0) {
      console.log(`❌ CONFLICTS DETECTED! ${conflictCheck.rows.length} websites would create duplicates:`);
      conflictCheck.rows.forEach((row: any) => {
        console.log(`  CONFLICT: "${row.conflicting_unnormalized}" would become "${row.normalized_domain}" but "${row.existing_normalized}" already exists`);
        console.log(`    - Unnormalized ID: ${row.unnormalized_id}`);
        console.log(`    - Existing ID: ${row.normalized_id}`);
      });
      console.log('\n⚠️ You must manually resolve these conflicts before running normalization!');
      console.log('Consider merging data or checking if these are truly different websites.');
      process.exit(1);
    }
    
    console.log('✅ No conflicts detected - safe to proceed with normalization\n');
    
    // Perform the normalization
    console.log('3️⃣ Normalizing domains...');
    
    let normalizedCount = 0;
    let errorCount = 0;
    
    for (const row of unnormalizedWebsites.rows) {
      const website = row as any;
      
      try {
        // Update the domain to normalized version
        await db.execute(sql`
          UPDATE websites 
          SET 
            domain = ${website.normalized_domain},
            updated_at = NOW()
          WHERE id = ${website.id}
        `);
        
        console.log(`✅ ${website.domain} → ${website.normalized_domain}`);
        normalizedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to normalize ${website.domain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Normalization Summary:');
    console.log(`   ✅ Successfully normalized: ${normalizedCount} domains`);
    console.log(`   ❌ Errors: ${errorCount} domains`);
    console.log(`   📋 Total processed: ${normalizedCount + errorCount} domains`);
    
    // Verify the results
    console.log('\n4️⃣ Verifying normalization results...');
    
    const remainingUnnormalized = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE 
        domain LIKE 'www.%' 
        OR domain LIKE 'WWW.%'
        OR domain LIKE 'http://%'
        OR domain LIKE 'https://%'
        OR domain LIKE '%/'
        OR domain != lower(trim(domain))
    `);
    
    const remaining = (remainingUnnormalized.rows[0] as any).count;
    
    if (remaining === 0) {
      console.log('✅ Perfect! All domains are now normalized.');
    } else {
      console.log(`⚠️ ${remaining} domains still need normalization. Check for edge cases.`);
    }
    
    // Show final stats
    const totalWebsites = await db.execute(sql`SELECT COUNT(*) as count FROM websites`);
    const totalCount = (totalWebsites.rows[0] as any).count;
    
    console.log(`\n📈 Final database state:`);
    console.log(`   Total websites: ${totalCount}`);
    console.log(`   Normalized domains: ${totalCount - remaining}`);
    console.log(`   Still need normalization: ${remaining}`);
    
    console.log('\n🎉 Domain normalization complete!');
    
  } catch (error) {
    console.error('❌ Normalization failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

normalizeWebsiteDomains();