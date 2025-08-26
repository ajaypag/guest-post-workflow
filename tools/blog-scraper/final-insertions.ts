import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkInsertion {
  slug: string;
  anchor: string;
  targetUrl: string;
  insertionMethod: 'append' | 'replace' | 'prepend';
  targetLocation: string;
  content: string;
  originalStatus: string;
}

// Final 6 insertions with more flexible approach
const finalInsertions: LinkInsertion[] = [
  {
    slug: "best-link-building-services",
    anchor: "Jeenam",
    targetUrl: "https://jeenaminfotech.com/",
    insertionMethod: 'append',
    targetLocation: 'end of service list',
    content: `
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            <a href="https://jeenaminfotech.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              Jeenam
            </a>
          </h3>
          <p className="text-gray-700 mb-4">
            Jeenam is a link-building agency that has been around since 2020 and provides long-term solutions to 50+ different companies and organizations throughout the world. With 20 link building experts, each with 5+ years of experience in Digital Marketing, website building, and marketing, they specialize in driving online business growth through effective link-building strategies.
          </p>
          <p className="text-gray-700">
            They offer a broad spectrum of expertise, from digital marketing to website development, established as a reliable partner in the digital world with a history of successful outcomes.
          </p>
        </div>`,
    originalStatus: "Requested"
  },
  {
    slug: "how-to-create-a-content-marketing-strategy-for-ecommerce",
    anchor: "Delta 10 Gummies",
    targetUrl: "https://deltaremedys.com/collections/delta-10-products/delta-10-gummies",
    insertionMethod: 'replace',
    targetLocation: 'product examples',
    content: 'merino wool beanie, Delta 10 Gummies, digital gadgets',
    originalStatus: "Requested"
  },
  {
    slug: "how-to-create-a-content-marketing-strategy-for-ecommerce",
    anchor: "UGC creators",
    targetUrl: "https://influee.co/",
    insertionMethod: 'append',
    targetLocation: 'after partnership section',
    content: ` Additionally, partnering with <a href="https://influee.co/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">UGC creators</a> can help brands build trust and extend their message through authentic, relatable content.`,
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "client portal",
    targetUrl: "https://www.osuria.com/blog/what-is-web-portal-types-and-examples/",
    insertionMethod: 'append',
    targetLocation: 'website functionality section',
    content: ` Modern websites can also include advanced <a href="https://www.osuria.com/blog/what-is-web-portal-types-and-examples/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">client portal</a> functionality to provide secure, personalized access to account information and services.`,
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "optimize cloud costs",
    targetUrl: "https://cloudchipr.com/blog/cloud-cost-optimization",
    insertionMethod: 'append',
    targetLocation: 'infrastructure section',
    content: ` As your website infrastructure scales, it's important to <a href="https://cloudchipr.com/blog/cloud-cost-optimization" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">optimize cloud costs</a> to maintain performance without overspending on unnecessary resources.`,
    originalStatus: "Removed"
  },
  {
    slug: "why-every-business-needs-a-website",
    anchor: "budgeting software for business",
    targetUrl: "https://www.drivetrain.ai/solutions/business-budgeting-planning-software",
    insertionMethod: 'append',
    targetLocation: 'ROI section',
    content: ` Using <a href="https://www.drivetrain.ai/solutions/business-budgeting-planning-software" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">budgeting software for business</a> can help track website development costs and ensure efficient resource allocation.`,
    originalStatus: "Removed"
  }
];

async function manualInsertions() {
  console.log('🛠️  MANUAL INSERTION OF FINAL 6 BACKLINKS\n');
  
  const appDir = path.join(__dirname, '../../app');
  let successCount = 0;
  let attemptedCount = 0;
  
  // Strategy: Find common patterns and manually insert links
  for (const insertion of finalInsertions) {
    attemptedCount++;
    const pageDir = path.join(appDir, insertion.slug);
    const pageFile = path.join(pageDir, 'page.tsx');
    
    console.log(`\n📄 Processing ${attemptedCount}/6: ${insertion.anchor}`);
    console.log(`   File: /${insertion.slug}/`);
    
    if (!fs.existsSync(pageFile)) {
      console.log(`❌ File not found`);
      continue;
    }
    
    try {
      let content = fs.readFileSync(pageFile, 'utf-8');
      let updated = false;
      
      // Check if already exists
      if (content.includes(insertion.targetUrl)) {
        console.log(`⚠️  Link already exists`);
        continue;
      }
      
      // Special handling for each case
      switch (insertion.slug) {
        case "best-link-building-services":
          // Add Jeenam at the end before closing BlogPostTemplate
          const endMarker = '</BlogPostTemplate>';
          if (content.includes(endMarker)) {
            content = content.replace(endMarker, insertion.content + '\n      ' + endMarker);
            updated = true;
          }
          break;
          
        case "how-to-create-a-content-marketing-strategy-for-ecommerce":
          if (insertion.anchor === "Delta 10 Gummies") {
            // Replace in product examples
            const originalText = 'merino wool beanie, digital gadgets, or a stylish dog collar';
            const replacement = 'merino wool beanie, <a href="' + insertion.targetUrl + '" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Delta 10 Gummies</a>, digital gadgets, or a stylish dog collar';
            if (content.includes(originalText)) {
              content = content.replace(originalText, replacement);
              updated = true;
            }
          } else if (insertion.anchor === "UGC creators") {
            // Add after existing UGC/partnership content
            const searchText = 'Partnering with UGC creators can help brands build trust and extend their message through authentic, relatable content.';
            const replacement = 'Partnering with <a href="' + insertion.targetUrl + '" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">UGC creators</a> can help brands build trust and extend their message through authentic, relatable content.';
            if (content.includes(searchText)) {
              content = content.replace(searchText, replacement);
              updated = true;
            }
          }
          break;
          
        case "why-every-business-needs-a-website":
          // Find any suitable paragraph to append to
          const patterns = [
            'A website provides credibility and professional appearance.',
            'Having a website is essential for modern business success.',
            'Websites serve as your digital storefront.',
            'Your website represents your business 24/7.'
          ];
          
          for (const pattern of patterns) {
            if (content.includes(pattern) && !updated) {
              content = content.replace(pattern, pattern + insertion.content);
              updated = true;
              break;
            }
          }
          
          // If no specific pattern found, add to a general business benefits section
          if (!updated) {
            const businessBenefits = 'professional online presence';
            if (content.includes(businessBenefits)) {
              const sentences = content.split('.');
              for (let i = 0; i < sentences.length; i++) {
                if (sentences[i].includes(businessBenefits) && !updated) {
                  sentences[i] = sentences[i] + insertion.content;
                  content = sentences.join('.');
                  updated = true;
                  break;
                }
              }
            }
          }
          break;
      }
      
      if (updated) {
        fs.writeFileSync(pageFile, content, 'utf-8');
        console.log(`✅ Successfully inserted: ${insertion.anchor}`);
        console.log(`   Strategy: ${insertion.insertionMethod} at ${insertion.targetLocation}`);
        successCount++;
      } else {
        console.log(`❌ Could not find suitable insertion point`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL MANUAL INSERTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Manual insertions completed: ${successCount}/6`);
  console.log(`📋 Total attempted: ${attemptedCount}`);
  
  const grandTotal = 10 + successCount; // Previous 10 + new successes
  console.log(`\n🏆 COMPLETE PROJECT SUMMARY:`);
  console.log(`   Total CSV rows: 17`);
  console.log(`   ✅ Successfully restored: ${grandTotal}`);
  console.log(`   ❌ Remaining: ${17 - grandTotal}`);
  console.log(`   📈 Final success rate: ${Math.round((grandTotal / 17) * 100)}%`);
  
  if (grandTotal >= 15) {
    console.log(`\n🎉 EXCELLENT! You've restored ${grandTotal}/17 backlinks!`);
  } else if (grandTotal >= 12) {
    console.log(`\n👍 GREAT PROGRESS! ${grandTotal}/17 backlinks restored.`);
  }
  
  console.log(`\n💡 All restorable backlinks from your WordPress migration have been processed.`);
}

// Run manual insertions
manualInsertions().catch(console.error);