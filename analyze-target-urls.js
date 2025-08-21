const { db } = require('./lib/db/connection');
const { orderLineItems } = require('./lib/db/orderLineItemSchema');
const { targetPages } = require('./lib/db/schema');
const { clients } = require('./lib/db/schema');
const { sql } = require('drizzle-orm');

async function analyzeTargetUrls() {
  try {
    console.log('🔍 Analyzing Target URL and Client Relationship System...\n');

    // 1. Get total counts
    const lineItemCount = await db.select({ count: sql`count(*)` }).from(orderLineItems);
    const targetPagesCount = await db.select({ count: sql`count(*)` }).from(targetPages);
    const clientsCount = await db.select({ count: sql`count(*)` }).from(clients);

    console.log('📊 Database Overview:');
    console.log(`   • Total line items: ${lineItemCount[0].count}`);
    console.log(`   • Total target pages: ${targetPagesCount[0].count}`);
    console.log(`   • Total clients: ${clientsCount[0].count}\n`);

    // 2. Analyze line items with target URLs
    const lineItemStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_line_items,
        COUNT(target_page_url) as with_free_text_url,
        COUNT(target_page_id) as with_linked_target_page,
        COUNT(CASE WHEN target_page_url IS NOT NULL AND target_page_id IS NOT NULL THEN 1 END) as with_both,
        COUNT(CASE WHEN target_page_url IS NULL AND target_page_id IS NULL THEN 1 END) as with_neither
      FROM order_line_items
      WHERE status != 'cancelled'
    `);

    console.log('🎯 Line Item Target URL Usage:');
    const stats = lineItemStats[0];
    console.log(`   • Total active line items: ${stats.total_line_items}`);
    console.log(`   • Using free text URL: ${stats.with_free_text_url} (${((stats.with_free_text_url / stats.total_line_items) * 100).toFixed(1)}%)`);
    console.log(`   • Using linked target page: ${stats.with_linked_target_page} (${((stats.with_linked_target_page / stats.total_line_items) * 100).toFixed(1)}%)`);
    console.log(`   • Using both: ${stats.with_both} (${((stats.with_both / stats.total_line_items) * 100).toFixed(1)}%)`);
    console.log(`   • Using neither: ${stats.with_neither} (${((stats.with_neither / stats.total_line_items) * 100).toFixed(1)}%)\n`);

    // 3. Check for potential cross-client contamination
    const crossClientIssues = await db.execute(sql`
      SELECT DISTINCT
        oli.client_id,
        c.name as client_name,
        oli.target_page_url,
        tp.client_id as target_page_client_id,
        tc.name as target_page_client_name
      FROM order_line_items oli
      LEFT JOIN target_pages tp ON oli.target_page_url = tp.url AND oli.client_id != tp.client_id
      LEFT JOIN clients c ON oli.client_id = c.id
      LEFT JOIN clients tc ON tp.client_id = tc.id
      WHERE oli.target_page_url IS NOT NULL 
        AND tp.id IS NOT NULL 
        AND oli.status != 'cancelled'
      LIMIT 10
    `);

    console.log('🚨 Potential Cross-Client Target URL Issues:');
    if (crossClientIssues.length === 0) {
      console.log('   ✅ No obvious cross-client target URL issues found');
    } else {
      console.log(`   ⚠️  Found ${crossClientIssues.length} potential issues:`);
      crossClientIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Client "${issue.client_name}" using URL "${issue.target_page_url}"`);
        console.log(`      • URL belongs to: "${issue.target_page_client_name}"`);
      });
    }
    console.log('');

    // 4. Analyze free text URLs that could match target pages
    const freeTextAnalysis = await db.execute(sql`
      WITH free_text_urls AS (
        SELECT DISTINCT
          oli.client_id,
          oli.target_page_url,
          c.name as client_name,
          COUNT(*) as usage_count
        FROM order_line_items oli
        LEFT JOIN clients c ON oli.client_id = c.id
        WHERE oli.target_page_url IS NOT NULL 
          AND oli.target_page_id IS NULL
          AND oli.status != 'cancelled'
        GROUP BY oli.client_id, oli.target_page_url, c.name
      ),
      matching_target_pages AS (
        SELECT 
          ftu.client_id,
          ftu.target_page_url,
          ftu.client_name,
          ftu.usage_count,
          tp.id as matching_target_page_id,
          tp.client_id as tp_client_id,
          tc.name as tp_client_name,
          CASE WHEN ftu.client_id = tp.client_id THEN 'same_client' ELSE 'different_client' END as match_type
        FROM free_text_urls ftu
        LEFT JOIN target_pages tp ON ftu.target_page_url = tp.url
        LEFT JOIN clients tc ON tp.client_id = tc.id
        WHERE tp.id IS NOT NULL
      )
      SELECT 
        match_type,
        COUNT(*) as count,
        SUM(usage_count) as total_usage
      FROM matching_target_pages
      GROUP BY match_type
      ORDER BY match_type
    `);

    console.log('🔗 Free Text URLs vs Target Pages Analysis:');
    if (freeTextAnalysis.length === 0) {
      console.log('   • No free text URLs match existing target pages');
    } else {
      freeTextAnalysis.forEach(result => {
        if (result.match_type === 'same_client') {
          console.log(`   ✅ Same client matches: ${result.count} URLs, ${result.total_usage} total usages`);
        } else {
          console.log(`   ⚠️  Cross-client matches: ${result.count} URLs, ${result.total_usage} total usages`);
        }
      });
    }
    console.log('');

    // 5. Check for domain normalization issues
    const urlVariationAnalysis = await db.execute(sql`
      WITH url_analysis AS (
        SELECT 
          target_page_url,
          COUNT(*) as usage_count,
          COUNT(DISTINCT client_id) as client_count
        FROM order_line_items
        WHERE target_page_url IS NOT NULL AND status != 'cancelled'
        GROUP BY target_page_url
        HAVING COUNT(DISTINCT client_id) > 1
      )
      SELECT 
        target_page_url,
        usage_count,
        client_count
      FROM url_analysis
      ORDER BY client_count DESC, usage_count DESC
      LIMIT 10
    `);

    console.log('🌐 URLs Used by Multiple Clients:');
    if (urlVariationAnalysis.length === 0) {
      console.log('   ✅ No URLs are shared between multiple clients');
    } else {
      console.log('   ⚠️  Found URLs used by multiple clients:');
      urlVariationAnalysis.forEach((url, index) => {
        console.log(`   ${index + 1}. "${url.target_page_url}"`);
        console.log(`      • Used ${url.usage_count} times by ${url.client_count} clients`);
      });
    }
    console.log('');

    // 6. Summary and recommendations
    console.log('📋 Summary and Data Consistency Analysis:');
    console.log('');

    const totalFreeText = parseInt(stats.with_free_text_url);
    const totalLinked = parseInt(stats.with_linked_target_page);
    const totalBoth = parseInt(stats.with_both);

    if (totalFreeText > totalLinked) {
      console.log('   🎯 FINDING: Free text URLs are more common than linked target pages');
      console.log('      • This suggests the system is primarily used in "free text" mode');
    }

    if (totalBoth > 0) {
      console.log(`   🔄 FINDING: ${totalBoth} line items have both free text AND linked target pages`);
      console.log('      • This dual state could cause confusion about which takes precedence');
    }

    if (crossClientIssues.length > 0) {
      console.log('   🚨 RISK: Free text URLs match target pages from different clients');
      console.log('      • This could lead to data leakage or incorrect associations');
    }

    if (urlVariationAnalysis.length > 0) {
      console.log('   🌐 RISK: Same URLs used by multiple clients');
      console.log('      • May indicate clients targeting competitors or shared landing pages');
    }

  } catch (error) {
    console.error('Error analyzing database:', error);
  }
}

analyzeTargetUrls().then(() => process.exit(0));