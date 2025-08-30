// Script to update Batch 2 - Content Generation files with website connection
import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'components/steps/ArticleDraftStep.tsx',
  'components/steps/ArticleDraftStepClean.tsx',
  'components/steps/ContentAuditStep.tsx',
  'components/steps/ContentAuditStepClean.tsx',
  'components/steps/FinalPolishStep.tsx',
  'components/steps/FinalPolishStepClean.tsx',
  'components/steps/FormattingQAStep.tsx',
  'components/steps/FormattingQAStepClean.tsx'
];

const updatePattern = `
  // Use website name if available, domain as fallback
  let guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';
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

let updatedCount = 0;
let alreadyUpdatedCount = 0;
let noReferenceCount = 0;

filesToUpdate.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already updated
  if (content.includes('Use website name if available')) {
    console.log(`✅ Already updated: ${file}`);
    alreadyUpdatedCount++;
    return;
  }
  
  // Look for domain selection step reference
  const hasDomainSelection = content.includes('domain-selection');
  const hasDomainOutput = content.includes('domainSelectionStep?.outputs?.domain') || 
                          content.includes('domainSelection?.outputs?.domain');
  
  if (hasDomainSelection || hasDomainOutput) {
    // Find the const domainSelectionStep line
    const domainStepRegex = /const domainSelectionStep = workflow\.steps\.find\(.*?\);/;
    const domainStepMatch = content.match(domainStepRegex);
    
    if (domainStepMatch) {
      // Find the guestPostSite declaration
      const guestPostRegex = /const guestPostSite = .*?;/;
      const guestPostMatch = content.match(guestPostRegex);
      
      if (guestPostMatch) {
        // Replace the guestPostSite declaration with our enhanced version
        const afterDomainStep = domainStepMatch.index + domainStepMatch[0].length;
        const beforeGuestPost = content.substring(0, afterDomainStep);
        const afterGuestPost = content.substring(content.indexOf(guestPostMatch[0]) + guestPostMatch[0].length);
        
        content = beforeGuestPost + updatePattern + afterGuestPost;
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated: ${file}`);
        updatedCount++;
      } else {
        // Try alternative pattern - some files might just reference the domain
        const simplePattern = /const .*? = domainSelectionStep\?\.outputs\?\.domain.*?;/;
        const simpleMatch = content.match(simplePattern);
        
        if (simpleMatch) {
          content = content.replace(simpleMatch[0], simpleMatch[0] + updatePattern);
          fs.writeFileSync(filePath, content);
          console.log(`✅ Updated (alternative pattern): ${file}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Has domain reference but pattern not found: ${file}`);
        }
      }
    } else {
      console.log(`⚠️ Domain selection step not found in expected format: ${file}`);
    }
  } else {
    console.log(`⏭️ No domain reference found: ${file}`);
    noReferenceCount++;
  }
});

console.log('\n📊 Batch 2 Summary:');
console.log(`✅ Updated: ${updatedCount} files`);
console.log(`✓ Already updated: ${alreadyUpdatedCount} files`);
console.log(`⏭️ No domain reference: ${noReferenceCount} files`);
console.log(`Total processed: ${filesToUpdate.length} files`);
console.log('\nBatch 2 update complete!');