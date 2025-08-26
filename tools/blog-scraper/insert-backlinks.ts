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
}

// Define the link insertions based on audit results
const linkInsertions: LinkInsertion[] = [
  {
    slug: "how-to-create-a-content-marketing-strategy-for-ecommerce",
    anchor: "marketing planning software", 
    targetUrl: "https://niftypm.com/blog/marketing-planning-software/",
    insertionStrategy: "contextual",
    searchText: "Partnering with UGC creators can help brands build trust and extend their message through authentic, relatable content.",
    replacementText: "Partnering with UGC creators can help brands build trust and extend their message through authentic, relatable content. Additionally, using marketing planning software can help coordinate these partnerships and track their performance as part of your broader content marketing strategy."
  },
  {
    slug: "social-media-link-building",
    anchor: "free reminder app",
    targetUrl: "https://niftypm.com/blog/best-free-reminder-apps",
    insertionStrategy: "contextual_workflow",
    searchText: "Well, you can use a social media monitoring tool such as Mention, which specializes in monitoring brand mentions across all social media platforms and the web.",
    replacementText: "Well, you can use a social media monitoring tool such as Mention, which specializes in monitoring brand mentions across all social media platforms and the web. For marketers juggling multiple social media accounts, a free reminder app can help ensure you never miss important mentions or scheduled posts."
  },
  {
    slug: "link-prospecting", 
    anchor: "reverse image search",
    targetUrl: "https://imagetotext.me/reverse-image-search",
    insertionStrategy: "research_tools",
    searchText: "Do a reverse image search to check if someone has re-posted your pics and forgot to link to the original.",
    replacementText: "Do a reverse image search to check if someone has re-posted your pics and forgot to link to the original. Using professional reverse image search tools can make this process more efficient and comprehensive."
  },
  {
    slug: "how-to-use-seo-to-improve-conversion-rate",
    anchor: "specialized healthcare information", 
    targetUrl: "https://www.medesk.net/en/blog/who-owns-patients-medical-records/",
    insertionStrategy: "industry_specific",
    searchText: "In the competitive field of clinical genomics, this helps ensure your website attracts targeted visitors looking for specialized healthcare information and services.",
    replacementText: "In the competitive field of clinical genomics, this helps ensure your website attracts targeted visitors looking for specialized healthcare information and services, including resources about patient data management and compliance requirements."
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "mentoring software",
    targetUrl: "https://www.qooper.io/mentoring-software", 
    insertionStrategy: "business_tools",
    searchText: "Integrate customer support",
    replacementText: "Integrate customer support and mentoring software"
  }
];

async function insertBacklinks() {
  console.log('🔗 STARTING BACKLINK INSERTION PROCESS\n');
  
  const appDir = path.join(__dirname, '../../app');
  let successCount = 0;
  let failureCount = 0;
  
  for (const insertion of linkInsertions) {
    const pageDir = path.join(appDir, insertion.slug);
    const pageFile = path.join(pageDir, 'page.tsx');
    
    console.log(`\n📄 Processing: /${insertion.slug}/`);
    
    if (!fs.existsSync(pageFile)) {
      console.log(`❌ File not found: ${pageFile}`);
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
        console.log(`❌ Search text not found: "${insertion.searchText.substring(0, 50)}..."`);
        failureCount++;
        
        // Suggest similar text for manual review
        console.log(`🔍 Suggested manual review needed for: ${insertion.anchor}`);
        continue;
      }
      
      // Create the enhanced replacement text with proper link formatting  
      const linkElement = `<a href="${insertion.targetUrl}" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">${insertion.anchor}</a>`;
      const enhancedReplacement = insertion.replacementText.replace(insertion.anchor, linkElement);
      
      // Perform the replacement
      const updatedContent = content.replace(insertion.searchText, enhancedReplacement);
      
      // Write the updated content back to the file
      fs.writeFileSync(pageFile, updatedContent, 'utf-8');
      
      console.log(`✅ Successfully inserted: ${insertion.anchor} → ${insertion.targetUrl}`);
      console.log(`   Strategy: ${insertion.insertionStrategy}`);
      successCount++;
      
    } catch (error) {
      console.log(`❌ Error processing ${insertion.slug}: ${error}`);
      failureCount++;
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKLINK INSERTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful insertions: ${successCount}`);
  console.log(`❌ Failed insertions: ${failureCount}`);
  console.log(`📈 Success rate: ${Math.round((successCount / linkInsertions.length) * 100)}%`);
  
  if (successCount > 0) {
    console.log(`\n🎉 ${successCount} backlinks have been successfully restored!`);
    console.log('💡 Remember to review the changes and test the pages to ensure proper formatting.');
  }
  
  if (failureCount > 0) {
    console.log(`\n⚠️  ${failureCount} links require manual attention.`);
    console.log('📝 Check the console output above for specific issues and search text suggestions.');
  }
}

// Run the insertion process
insertBacklinks().catch(console.error);