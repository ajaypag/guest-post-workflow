import { db } from './lib/db/connection';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { targetPages } from './lib/db/schema';
import { clients } from './lib/db/schema';
import { sql } from 'drizzle-orm';

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
    const stats = (lineItemStats as any)[0] as any;
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
    const crossClientIssuesArray = (crossClientIssues as unknown) as any[];
    if (crossClientIssuesArray.length === 0) {
      console.log('   ✅ No obvious cross-client target URL issues found');
    } else {
      console.log(`   ⚠️  Found ${crossClientIssuesArray.length} potential issues:`);
      crossClientIssuesArray.forEach((issue: any, index) => {
        console.log(`   ${index + 1}. Client "${issue.client_name}" using URL "${issue.target_page_url}"`);
        console.log(`      • URL belongs to: "${issue.target_page_client_name}"`);
      });
    }
    console.log('');

    // 4. Check for domain normalization issues
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
    const urlVariationAnalysisArray = (urlVariationAnalysis as unknown) as any[];
    if (urlVariationAnalysisArray.length === 0) {
      console.log('   ✅ No URLs are shared between multiple clients');
    } else {
      console.log('   ⚠️  Found URLs used by multiple clients:');
      urlVariationAnalysisArray.forEach((url: any, index) => {
        console.log(`   ${index + 1}. "${url.target_page_url}"`);
        console.log(`      • Used ${url.usage_count} times by ${url.client_count} clients`);
      });
    }
    console.log('');

    // 5. Sample some actual data
    const sampleData = await db.execute(sql`
      SELECT 
        oli.id,
        c.name as client_name,
        oli.target_page_url,
        oli.target_page_id,
        tp.url as linked_target_page_url,
        tp.client_id as target_page_client_id
      FROM order_line_items oli
      LEFT JOIN clients c ON oli.client_id = c.id
      LEFT JOIN target_pages tp ON oli.target_page_id = tp.id
      WHERE oli.status != 'cancelled'
        AND (oli.target_page_url IS NOT NULL OR oli.target_page_id IS NOT NULL)
      LIMIT 10
    `);

    console.log('📝 Sample Line Items (showing target URL patterns):');
    const sampleDataArray = (sampleData as unknown) as any[];
    if (sampleDataArray.length === 0) {
      console.log('   • No line items found with target URLs');
    } else {
      sampleDataArray.forEach((item: any, index) => {
        console.log(`   ${index + 1}. Client: ${item.client_name}`);
        if (item.target_page_url) {
          console.log(`      • Free text URL: ${item.target_page_url}`);
        }
        if (item.target_page_id) {
          console.log(`      • Linked target page: ${item.linked_target_page_url}`);
          if (item.target_page_client_id !== item.client_id) {
            console.log(`      • ⚠️  Target page belongs to different client!`);
          }
        }
      });
    }
    console.log('');

    // 6. Summary
    console.log('📋 Key Findings and Risks:');
    console.log('');

    const totalFreeText = parseInt(stats.with_free_text_url);
    const totalLinked = parseInt(stats.with_linked_target_page);
    const totalBoth = parseInt(stats.with_both);

    if (totalFreeText > totalLinked) {
      console.log('   🎯 FINDING: Free text URLs dominate over linked target pages');
      console.log('      • Users prefer flexibility of free text input');
    }

    if (totalBoth > 0) {
      console.log(`   🔄 FINDING: ${totalBoth} line items have BOTH target types`);
      console.log('      • This could cause confusion about which URL is authoritative');
    }

    if (crossClientIssuesArray.length > 0) {
      console.log('   🚨 RISK: Cross-client target URL contamination detected');
    }

    if (urlVariationAnalysisArray.length > 0) {
      console.log('   🌐 RISK: Same URLs used by multiple clients');
    }

  } catch (error) {
    console.error('Error analyzing database:', error);
  }
}

analyzeTargetUrls().then(() => process.exit(0));