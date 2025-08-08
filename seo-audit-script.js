/**
 * SEO Audit Script for Marketing Website
 * 
 * This script uses the built-in AgenticSEOAuditorService to perform
 * a comprehensive SEO audit of the marketing website.
 */

const { agenticSEOAuditorService } = require('./lib/services/agenticSEOAuditorService');

async function runSEOAudit() {
  const websiteUrl = 'http://localhost:3000';
  
  // Configure audit parameters
  const auditInputs = {
    websiteUrl: websiteUrl,
    focusKeywords: [
      'guest posting',
      'link building', 
      'AI citations',
      'content marketing',
      'SEO services',
      'topical authority'
    ],
    includeCompetitorAnalysis: true,
    industryContext: 'Digital Marketing / SEO / Link Building Services',
    auditDepth: 'comprehensive'
  };
  
  console.log('🚀 Starting comprehensive SEO audit for:', websiteUrl);
  console.log('📊 Audit Configuration:', auditInputs);
  console.log('─'.repeat(80));
  
  try {
    // Create a mock workflow ID for the audit
    const mockWorkflowId = 'marketing-website-audit';
    
    // Start the audit session
    const sessionId = await agenticSEOAuditorService.startAuditSession(mockWorkflowId, auditInputs);
    console.log('✅ Audit session started:', sessionId);
    
    // Perform the audit
    await agenticSEOAuditorService.performSEOAudit(sessionId);
    
    console.log('🎉 SEO audit completed successfully!');
    console.log('📋 Check the database for detailed audit results or implement SSE streaming for real-time updates');
    
  } catch (error) {
    console.error('❌ SEO audit failed:', error);
    process.exit(1);
  }
}

// Run the audit
runSEOAudit();