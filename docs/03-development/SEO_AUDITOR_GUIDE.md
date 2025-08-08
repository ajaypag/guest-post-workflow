# SEO Website Auditor Agent Guide

> **Purpose**: Comprehensive AI-powered SEO auditing system for analyzing website performance and providing actionable optimization recommendations  
> **Use when**: Need thorough SEO analysis of any website with technical, on-page, off-page, and competitive insights  
> **Outcome**: Detailed SEO audit report with prioritized action plan and implementation timeline

## Overview

The SEO Website Auditor is a sophisticated AI agent that performs comprehensive SEO analysis using the latest OpenAI models and specialized tools. It analyzes websites across multiple dimensions and provides actionable recommendations for improving search engine rankings.

## Features

### 🔧 Technical SEO Analysis
- **Page Speed & Core Web Vitals**: LCP, FID, CLS metrics
- **Mobile Responsiveness**: Mobile-first indexing readiness
- **Crawlability**: Robots.txt, sitemaps, internal linking
- **Security**: SSL/HTTPS, security headers
- **Structured Data**: Schema markup validation

### 📄 On-Page SEO Analysis
- **Meta Elements**: Title tags, meta descriptions optimization
- **Content Structure**: Header hierarchy (H1, H2, H3)
- **Content Quality**: Word count, readability, keyword density
- **Image Optimization**: Alt tags, file sizes
- **Internal Linking**: Link structure and anchor text

### 🔗 Off-Page SEO Analysis
- **Backlink Profile**: Quality, quantity, referring domains
- **Domain Authority**: Trust metrics and spam scores
- **Social Signals**: Social media engagement
- **Local SEO**: Google My Business, citations (when applicable)

### 🎯 Competitive Analysis
- **Keyword Gaps**: Opportunities competitors are exploiting
- **Content Gaps**: Topics competitors cover better
- **Backlink Gaps**: Authority sites linking to competitors
- **Technical Advantages**: What competitors do better

## Architecture

### Core Components

1. **AgenticSEOAuditorService** (`lib/services/agenticSEOAuditorService.ts`)
   - Main orchestration service
   - Manages audit sessions and streaming
   - Coordinates with specialized tools

2. **Specialized Tools** (`lib/agents/seoAnalysisTools.ts`)
   - `fetchWebsiteContentTool`: Content and metadata analysis
   - `analyzePageSpeedTool`: Performance metrics
   - `checkBacklinksTool`: Backlink profile analysis
   - `generateSEORecommendationsTool`: Actionable recommendations
   - `checkCompetitorsTool`: Competitive analysis
   - `checkLocalSEOTool`: Local search optimization

3. **Database Schema** (`lib/db/schema.ts`)
   - `seoAuditSessions`: Audit session management
   - `seoAuditResults`: Structured storage of audit findings

## API Endpoints

### Start SEO Audit
```
POST /api/workflows/[id]/seo-audit
{
  "websiteUrl": "https://example.com",
  "competitors": ["competitor1.com", "competitor2.com"],
  "targetKeywords": ["keyword1", "keyword2"],
  "auditType": "comprehensive" | "technical" | "content" | "backlinks"
}
```

### Stream Audit Progress
```
GET /api/workflows/[id]/seo-audit/stream
```
Server-sent events stream for real-time progress updates.

## Usage Example

```typescript
// Initialize the SEO auditor service
const auditorService = new AgenticSEOAuditorService();

// Start a comprehensive audit
const session = await auditorService.initializeSession(workflowId, {
  websiteUrl: 'https://example.com',
  competitors: ['competitor1.com', 'competitor2.com'],
  targetKeywords: ['main keyword', 'secondary keyword'],
  auditType: 'comprehensive'
});

// Stream progress updates
const stream = auditorService.getProgressStream(session.id);
stream.on('data', (update) => {
  console.log('Audit progress:', update);
});

// Get final results
const results = await auditorService.getAuditResults(session.id);
```

## Output Format

The audit generates a comprehensive report including:

```json
{
  "summary": {
    "overallScore": 78,
    "grade": "B",
    "criticalIssues": 3,
    "warnings": 12,
    "passedChecks": 45
  },
  "technical": {
    "pageSpeed": {...},
    "mobile": {...},
    "crawlability": {...},
    "security": {...}
  },
  "onPage": {
    "metadata": {...},
    "content": {...},
    "images": {...},
    "internalLinks": {...}
  },
  "offPage": {
    "backlinks": {...},
    "authority": {...},
    "social": {...}
  },
  "competitive": {
    "keywordGaps": [...],
    "contentGaps": [...],
    "backlinkGaps": [...]
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "technical",
      "issue": "Missing SSL certificate",
      "action": "Install SSL certificate",
      "impact": "Critical for rankings and trust",
      "effort": "1 hour",
      "estimatedImpact": "+15% organic traffic"
    }
  ]
}
```

## Best Practices

### When to Use
- **Initial Website Launch**: Baseline SEO assessment
- **Monthly Audits**: Track progress and catch issues
- **Competitive Analysis**: Understand market positioning
- **Pre-Campaign**: Before major SEO initiatives
- **Post-Migration**: After site redesigns or migrations

### Configuration Tips
1. **Competitors**: Include 3-5 direct competitors for best insights
2. **Keywords**: Focus on 10-20 primary keywords
3. **Audit Type**: Start with comprehensive, then focus on weak areas
4. **Frequency**: Monthly for active sites, quarterly for stable sites

### Performance Considerations
- Audits typically take 2-5 minutes for comprehensive analysis
- Uses streaming for real-time progress updates
- Results are cached for 24 hours to reduce API costs
- Implements rate limiting to prevent abuse

## Integration with Workflow

The SEO Auditor integrates seamlessly with the guest post workflow:

1. **Pre-Campaign Analysis**: Identify content gaps before creating posts
2. **Link Target Selection**: Choose pages needing authority boost
3. **Anchor Text Optimization**: Based on current keyword rankings
4. **Progress Tracking**: Monitor SEO improvements from link building

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Large sites may exceed timeout limits
   - Solution: Use focused audit types instead of comprehensive

2. **Invalid URL**
   - Ensure URL includes protocol (https://)
   - Check for typos and accessibility

3. **Missing Competitors**
   - Competitors are optional but recommended
   - Provides better context for recommendations

4. **Rate Limiting**
   - Maximum 10 audits per hour per workflow
   - Implement caching for frequent checks

## Advanced Features

### Custom Scoring Weights
Adjust importance of different SEO factors:

```typescript
const customWeights = {
  technical: 0.3,
  onPage: 0.4,
  offPage: 0.2,
  competitive: 0.1
};
```

### White-Label Reports
Generate branded PDF reports:

```typescript
const report = await auditorService.generatePDFReport(sessionId, {
  logo: 'company-logo.png',
  colors: { primary: '#0066cc', secondary: '#333333' },
  includeCompetitors: false
});
```

### API Integration
Integrate with external SEO tools:

```typescript
const enrichedData = await auditorService.enrichWithExternalData(sessionId, {
  ahrefs: { apiKey: 'xxx' },
  semrush: { apiKey: 'yyy' },
  moz: { apiKey: 'zzz' }
});
```

## Future Enhancements

- [ ] Historical tracking and trend analysis
- [ ] Automated fix implementation for common issues
- [ ] Integration with Google Search Console
- [ ] Multi-language SEO support
- [ ] Video and image SEO analysis
- [ ] Voice search optimization analysis
- [ ] AI content quality scoring
- [ ] Link opportunity discovery

## Related Documentation

- [Building AI Agents Guide](./BUILDING_BLOCKS.md)
- [Auto-Save Pattern](./AUTO_SAVE_PATTERN.md)
- [Database Schema](../architecture/DATABASE.md)
- [Workflow System](../architecture/WORKFLOW_SYSTEM.md)