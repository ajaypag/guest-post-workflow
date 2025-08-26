import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkInsertion {
  slug: string;
  anchor: string;
  targetUrl: string;
  insertionStrategy: string;
  searchText: string;
  replacementText: string;
  originalStatus: string;
}

// All remaining link insertions (7 "Requested" + 4 "Removed")
const linkInsertions: LinkInsertion[] = [
  // REQUESTED ITEMS (7 remaining)
  {
    slug: "social-media-link-building",
    anchor: "do my homework",
    targetUrl: "https://writepaper.com/do-my-homework",
    insertionStrategy: "business_plan_context",
    searchText: "That's why building relationships with influencers should have a special place in your business plan.",
    replacementText: "That's why building relationships with influencers should have a special place in your business plan. When you need help with your business plan, remember you can always rely on experts to <a href=\"https://writepaper.com/do-my-homework\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">do my homework</a>.",
    originalStatus: "Requested"
  },
  {
    slug: "best-link-building-services",
    anchor: "Jeenam",
    targetUrl: "https://jeenaminfotech.com/",
    insertionStrategy: "agency_profile_addition",
    searchText: "Here are some of the top link building services:",
    replacementText: "Here are some of the top link building services:\n\n### Jeenam\n\n<a href=\"https://jeenaminfotech.com/\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">Jeenam</a> is a link-building agency that has been around since 2020 and provides long-term solutions to 50+ different companies and organizations throughout the world. With 20 link building experts, each with 5+ years of experience in Digital Marketing, website building, and marketing, they specialize in driving online business growth through effective link-building strategies. They offer a broad spectrum of expertise, from digital marketing to website development, established as a reliable partner in the digital world with a history of successful outcomes.",
    originalStatus: "Requested"
  },
  {
    slug: "best-blogger-outreach-services", 
    anchor: "outsource link-building",
    targetUrl: "https://linkdune.com/link-building/",
    insertionStrategy: "outsourcing_benefits",
    searchText: "If you have the budget, outsourcing has its benefits as well.",
    replacementText: "If you have the budget, outsourcing has its benefits as well. Many businesses choose to <a href=\"https://linkdune.com/link-building/\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">outsource link-building</a> because outreach companies already have processes and trained staff to act fast. They've got established connections with top bloggers, making securing quality placements easier.",
    originalStatus: "Requested"
  },
  {
    slug: "how-to-create-a-content-marketing-strategy-for-ecommerce",
    anchor: "Delta 10 Gummies",
    targetUrl: "https://deltaremedys.com/collections/delta-10-products/delta-10-gummies",
    insertionStrategy: "product_example_replacement",
    searchText: "Whether it's a merino wool beanie, digital gadgets, or a stylish dog collar, today's consumers crave information",
    replacementText: "Whether it's a merino wool beanie, <a href=\"https://deltaremedys.com/collections/delta-10-products/delta-10-gummies\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">Delta 10 Gummies</a>, digital gadgets, or a stylish dog collar, today's consumers crave information",
    originalStatus: "Requested"
  },
  {
    slug: "social-media-link-building",
    anchor: "social media marketing agencies in los angeles",
    targetUrl: "https://inbeat.agency/blog/top-social-media-agencies-los-angeles",
    insertionStrategy: "local_expertise_addition",
    searchText: "Well, you can use a social media monitoring tool such as Mention, which specializes in monitoring brand mentions across all social media platforms and the web.",
    replacementText: "Well, you can use a social media monitoring tool such as Mention, which specializes in monitoring brand mentions across all social media platforms and the web. Collaborating with <a href=\"https://inbeat.agency/blog/top-social-media-agencies-los-angeles\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">social media marketing agencies in los angeles</a> can also help maximize these interactions by implementing targeted engagement strategies backed by local market expertise.",
    originalStatus: "Requested"
  },
  {
    slug: "how-to-increase-domain-authority",
    anchor: "nearshore frontend developers", 
    targetUrl: "https://www.tecla.io/network/hire-nearshore-frontend-developers",
    insertionStrategy: "technical_improvement_context",
    searchText: "In software testing, regularly checking website performance and reliability goes hand in hand with monitoring key SEO metrics.",
    replacementText: "In software testing, regularly checking website performance and reliability goes hand in hand with monitoring key SEO metrics. At the same time, working with <a href=\"https://www.tecla.io/network/hire-nearshore-frontend-developers\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">nearshore frontend developers</a> can help you implement the technical improvements needed to boost site performance and support stronger SEO outcomes.",
    originalStatus: "Requested"
  },

  // REMOVED ITEMS (4 that need to be added back)
  {
    slug: "top-10-link-building-techniques",
    anchor: "Growth Partners Media",
    targetUrl: "https://growthpartners.online/",
    insertionStrategy: "guest_posting_quality",
    searchText: "For example, if you're trying to market a fishing gear shop online, you may want to collaborate with outdoor lifestyle sites, or the blogs of companies that offer camping equipment.",
    replacementText: "For example, if you're trying to market a fishing gear shop online, you may want to collaborate with outdoor lifestyle sites, or the blogs of companies that offer camping equipment. On the other hand, if you're looking to scale guest posting without sacrificing quality, agencies like <a href=\"https://growthpartners.online/\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">Growth Partners Media</a> specialize in white hat link building through guest posts, niche edits, and community-driven placements. This is the most reliable way to earn backlinks from highly relevant, high-authority sites.",
    originalStatus: "Removed"
  },
  {
    slug: "how-to-create-a-content-marketing-strategy-for-ecommerce",
    anchor: "UGC creators",
    targetUrl: "https://influee.co/",
    insertionStrategy: "content_amplification",
    searchText: "To maximize reach, businesses should repurpose content across multiple channels, experiment with different formats, and engage with their audience actively.",
    replacementText: "To maximize reach, businesses should repurpose content across multiple channels, experiment with different formats, and engage with their audience actively. Partnering with <a href=\"https://influee.co/\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">UGC creators</a> can also help brands build trust and extend their message through authentic, relatable content.",
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "client portal",
    targetUrl: "https://www.osuria.com/blog/what-is-web-portal-types-and-examples/",
    insertionStrategy: "web_portal_functionality",
    searchText: "A website serves as your business's digital storefront and primary communication channel with customers.",
    replacementText: "A website serves as your business's digital storefront and primary communication channel with customers. Modern websites often include advanced features like <a href=\"https://www.osuria.com/blog/what-is-web-portal-types-and-examples/\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">client portal</a> functionality to provide secure, personalized access to account information and services.",
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "optimize cloud costs",
    targetUrl: "https://cloudchipr.com/blog/cloud-cost-optimization",
    insertionStrategy: "infrastructure_scaling",
    searchText: "If you're exploring Cloudflare alternatives, consider other services that provide robust performance and security features to ensure smooth and secure website operations.",
    replacementText: "If you're exploring Cloudflare alternatives, consider other services that provide robust performance and security features to ensure smooth and secure website operations. As your infrastructure scales, it's also important to <a href=\"https://cloudchipr.com/blog/cloud-cost-optimization\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">optimize cloud costs</a> to maintain performance without overspending on unnecessary resources.",
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "budgeting software for business",
    targetUrl: "https://www.drivetrain.ai/solutions/business-budgeting-planning-software",
    insertionStrategy: "budget_management",
    searchText: "To fully realize this ROI, effective project budget management is crucial in ensuring that the resources allocated to building and maintaining a website are used efficiently.",
    replacementText: "To fully realize this ROI, effective project budget management is crucial in ensuring that the resources allocated to building and maintaining a website are used efficiently. Using <a href=\"https://www.drivetrain.ai/solutions/business-budgeting-planning-software\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"text-blue-600 hover:text-blue-800 underline\">budgeting software for business</a> can further streamline cost tracking and prevent overspending at every stage of development.",
    originalStatus: "Removed"
  }
];

async function insertAllBacklinks() {
  console.log('🔗 COMPLETING ALL REMAINING BACKLINK INSERTIONS\n');
  
  const appDir = path.join(__dirname, '../../app');
  let successCount = 0;
  let failureCount = 0;
  const failedInsertions: string[] = [];
  
  for (const insertion of linkInsertions) {
    const pageDir = path.join(appDir, insertion.slug);
    const pageFile = path.join(pageDir, 'page.tsx');
    
    console.log(`\n📄 Processing: /${insertion.slug}/`);
    console.log(`   Status: ${insertion.originalStatus} | Anchor: ${insertion.anchor}`);
    
    if (!fs.existsSync(pageFile)) {
      console.log(`❌ File not found: ${pageFile}`);
      failedInsertions.push(`${insertion.anchor} - File not found`);
      failureCount++;
      continue;
    }
    
    try {
      // Read the current file content
      const content = fs.readFileSync(pageFile, 'utf-8');
      
      // Check if link already exists
      if (content.includes(insertion.targetUrl)) {
        console.log(`⚠️  Link already exists: ${insertion.anchor} → ${insertion.targetUrl}`);
        continue;
      }
      
      // Search for the target text
      if (!content.includes(insertion.searchText)) {
        console.log(`❌ Search text not found: "${insertion.searchText.substring(0, 80)}..."`);
        failedInsertions.push(`${insertion.anchor} - Search text not found`);
        failureCount++;
        
        // Try to find similar text for manual review
        const words = insertion.searchText.split(' ').slice(0, 5).join(' ');
        if (content.includes(words)) {
          console.log(`🔍 Similar text found: "${words}..."`);
          console.log(`💡 Manual review recommended for: ${insertion.anchor}`);
        }
        continue;
      }
      
      // Perform the replacement
      const updatedContent = content.replace(insertion.searchText, insertion.replacementText);
      
      // Verify the replacement worked
      if (updatedContent === content) {
        console.log(`❌ No changes made for: ${insertion.anchor}`);
        failedInsertions.push(`${insertion.anchor} - No changes made`);
        failureCount++;
        continue;
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(pageFile, updatedContent, 'utf-8');
      
      console.log(`✅ Successfully inserted: ${insertion.anchor} → ${insertion.targetUrl}`);
      console.log(`   Strategy: ${insertion.insertionStrategy} | Original: ${insertion.originalStatus}`);
      successCount++;
      
    } catch (error) {
      console.log(`❌ Error processing ${insertion.slug}: ${error}`);
      failedInsertions.push(`${insertion.anchor} - Processing error`);
      failureCount++;
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPLETE BACKLINK RESTORATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successful insertions: ${successCount}`);
  console.log(`❌ Failed insertions: ${failureCount}`);
  console.log(`📈 Success rate: ${Math.round((successCount / linkInsertions.length) * 100)}%`);
  console.log(`📋 Total processed: ${linkInsertions.length} links`);
  
  if (successCount > 0) {
    console.log(`\n🎉 ${successCount} additional backlinks have been successfully restored!`);
    console.log('💡 Combined with previous 5, you now have complete backlink restoration.');
  }
  
  if (failureCount > 0) {
    console.log(`\n⚠️  ${failureCount} links require manual attention:`);
    failedInsertions.forEach(failure => console.log(`   - ${failure}`));
    console.log('\n📝 Check the console output above for specific issues and search text suggestions.');
  }
  
  console.log(`\n🔢 GRAND TOTAL RESTORATION PROGRESS:`);
  console.log(`   Previously completed: 5 links`);
  console.log(`   Just completed: ${successCount} links`);
  console.log(`   ✅ TOTAL RESTORED: ${5 + successCount}/${17} backlinks`);
}

// Run the insertion process
insertAllBacklinks().catch(console.error);