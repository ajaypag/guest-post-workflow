// Script to update Batch 3 - Link & SEO Steps with website connection
import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'components/steps/InternalLinksStep.tsx',
  'components/steps/ExternalLinksStep.tsx',
  'components/steps/ClientMentionStep.tsx',
  'components/steps/ClientLinkStep.tsx',
  'components/steps/LinkRequestsStep.tsx',
  'components/steps/UrlSuggestionStep.tsx',
  'components/steps/ImagesStep.tsx',
  'components/LinkOrchestrationStep.tsx'
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

console.log('🔍 Checking Batch 3 - Link & SEO Steps...\n');

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
  
  // Look for various patterns that might indicate domain usage
  const patterns = [
    'domain-selection',
    'domainSelectionStep',
    'guestPostSite',
    'targetDomain',
    'workflow.targetDomain'
  ];
  
  let hasReference = false;
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      hasReference = true;
      break;
    }
  }
  
  if (hasReference) {
    // Try to find and update the pattern
    const domainStepRegex = /const domainSelectionStep = workflow\.steps\.find\(.*?\);/;
    const domainStepMatch = content.match(domainStepRegex);
    
    if (domainStepMatch) {
      const guestPostRegex = /const guestPostSite = .*?;/;
      const guestPostMatch = content.match(guestPostRegex);
      
      if (guestPostMatch) {
        const afterDomainStep = domainStepMatch.index + domainStepMatch[0].length;
        const beforeGuestPost = content.substring(0, afterDomainStep);
        const afterGuestPost = content.substring(content.indexOf(guestPostMatch[0]) + guestPostMatch[0].length);
        
        content = beforeGuestPost + updatePattern + afterGuestPost;
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated: ${file}`);
        updatedCount++;
      } else {
        console.log(`⚠️ Has domain reference but guestPostSite pattern not found: ${file}`);
      }
    } else {
      // Check for targetDomain usage
      if (content.includes('workflow.targetDomain')) {
        console.log(`⚠️ Uses workflow.targetDomain directly: ${file}`);
        // These might need manual update
      } else {
        console.log(`⚠️ Has reference but pattern not standard: ${file}`);
      }
    }
  } else {
    console.log(`⏭️ No domain reference found: ${file}`);
    noReferenceCount++;
  }
});

console.log('\n📊 Batch 3 Summary:');
console.log(`✅ Updated: ${updatedCount} files`);
console.log(`✓ Already updated: ${alreadyUpdatedCount} files`);
console.log(`⏭️ No domain reference: ${noReferenceCount} files`);
console.log(`Total processed: ${filesToUpdate.length} files`);
console.log('\nBatch 3 update complete!');