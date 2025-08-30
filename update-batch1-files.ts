// Script to update remaining Batch 1 files with website connection
import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'components/steps/TopicGenerationStep.tsx',
  'components/steps/KeywordResearchStep.tsx', 
  'components/steps/KeywordResearchStepClean.tsx',
  'components/steps/DeepResearchStep.tsx',
  'components/steps/DeepResearchStepClean.tsx'
];

const updatePattern = `
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || 'Guest post website from Step 1';
  let websiteMetadata = '';
  
  if (domainSelectionStep?.outputs?.websiteId && workflow.website) {
    guestPostSite = workflow.website.domain;
    // Build metadata string for AI context
    const metadata = [];
    if (workflow.website.domainRating) metadata.push(\`DA: \${workflow.website.domainRating}\`);
    if (workflow.website.totalTraffic) metadata.push(\`Traffic: \${workflow.website.totalTraffic.toLocaleString()}\`);
    if (workflow.website.overallQuality) metadata.push(\`Quality: \${workflow.website.overallQuality}\`);
    if (metadata.length > 0) {
      websiteMetadata = \` (\${metadata.join(', ')})\`;
    }
  }
`;

filesToUpdate.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has the pattern we need to update
  if (content.includes(`domainSelectionStep?.outputs?.domain`)) {
    // Check if already updated
    if (content.includes('Use website name if available')) {
      console.log(`✅ Already updated: ${file}`);
      return;
    }
    
    // Find and replace the pattern
    const oldPattern1 = /const guestPostSite = domainSelectionStep\?\.outputs\?\.domain \|\| ['"].*?['"]/g;
    const oldPattern2 = /const guestPostSite = domainSelectionStep\?\.outputs\?\.domain \|\| workflow\.targetDomain/g;
    
    if (content.match(oldPattern1) || content.match(oldPattern2)) {
      // Replace with new pattern
      content = content.replace(
        /const domainSelectionStep = workflow\.steps\.find\(s => s\.id === 'domain-selection'\);[\s\S]*?const guestPostSite = .*?;/,
        `const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
${updatePattern.trim()}`
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${file}`);
    } else {
      console.log(`⚠️ Pattern not found in expected format: ${file}`);
    }
  } else {
    console.log(`⏭️ No domain reference found: ${file}`);
  }
});

console.log('\nBatch 1 update complete!');