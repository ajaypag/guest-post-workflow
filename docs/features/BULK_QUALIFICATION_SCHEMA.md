# Bulk Site Qualification - Data Model & Schema Design

## Overview
This document defines the database schema and data models for the bulk site qualification feature, incorporating the refined keyword clustering approach where we extract topic words to cast a wide net for ranking data.

## Core Entities

### 1. Qualification Jobs
Represents a bulk qualification job for multiple sites against a client's target pages.

```typescript
// qualification_jobs table
interface QualificationJob {
  id: string;                    // UUID
  clientId: string;              // FK to clients
  name: string;                  // "Q1 2025 Tech Sites"
  description?: string;          // Optional job description
  status: 'pending' | 'extracting_topics' | 'checking_rankings' | 'analyzing' | 'completed' | 'failed';
  
  // Configuration
  checkDepth: 'minimal' | 'balanced' | 'thorough';  // How many topic terms to check
  minRelevanceThreshold: number; // 0-100 score threshold
  
  // Progress tracking
  totalSites: number;
  processedSites: number;
  totalApiCalls: number;         // Track API usage
  estimatedCost: number;         // Based on API pricing
  
  // Results summary
  qualifiedSitesCount?: number;
  averageRelevanceScore?: number;
  
  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Job Target Pages
Links qualification jobs to specific target pages being evaluated.

```typescript
// job_target_pages table
interface JobTargetPage {
  id: string;
  jobId: string;                 // FK to qualification_jobs
  targetPageId: string;          // FK to target_pages
  
  // Extracted topic terms for this target page
  topicTerms: string[];          // ["payment", "gateway", "fraud", "compliance"]
  originalKeywords: string[];    // Original keywords before extraction
  
  createdAt: Date;
}
```

### 3. Topic Terms
Central repository of extracted topic terms used for API filtering.

```typescript
// topic_terms table
interface TopicTerm {
  id: string;
  term: string;                  // "payment", "fraud", "compliance"
  termType: 'single' | 'compound'; // "payment" vs "payment gateway"
  
  // Usage tracking
  usageCount: number;            // How often used in queries
  lastUsedAt?: Date;
  
  // Performance metrics
  avgKeywordsReturned?: number;  // Avg keywords from API
  avgRelevanceScore?: number;    // How relevant are results
  
  createdAt: Date;
  updatedAt: Date;
}

// job_topic_terms junction table
interface JobTopicTerm {
  jobId: string;
  topicTermId: string;
  targetPageId: string;          // Which target page this term came from
  
  // Term-specific config for this job
  priority: number;              // 1-10, higher = more important
  includeInMinimal: boolean;     // Use in minimal depth check?
  
  createdAt: Date;
}
```

### 4. Bulk Sites
Sites to be qualified in bulk.

```typescript
// bulk_sites table  
interface BulkSite {
  id: string;
  jobId: string;                 // FK to qualification_jobs
  
  // Site identification
  domain: string;                // "example.com" (cleaned, no protocol)
  url: string;                   // Original URL provided
  sourceType: 'manual' | 'airtable' | 'csv' | 'api';
  sourceId?: string;             // Airtable record ID, etc.
  
  // Metadata
  siteName?: string;             // "TechCrunch"
  monthlyTraffic?: number;       // If available
  domainAuthority?: number;      // If available
  niche?: string;                // "Technology"
  
  // Processing status
  status: 'pending' | 'checking' | 'analyzed' | 'qualified' | 'disqualified' | 'error';
  errorMessage?: string;
  
  // Quick stats
  totalKeywordsFound?: number;   // Total keywords site ranks for
  relevantKeywordsFound?: number; // Keywords matching our topics
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Site Rankings
Actual ranking data from DataForSEO API.

```typescript
// site_rankings table
interface SiteRanking {
  id: string;
  siteId: string;                // FK to bulk_sites
  jobId: string;                 // FK to qualification_jobs
  topicTermId: string;           // FK to topic_terms that found this
  
  // Ranking data from API
  keyword: string;               // "payment gateway integration"
  position: number;              // 7
  url: string;                   // Exact ranking URL
  
  // Metrics from API
  searchVolume?: number;
  cpc?: number;
  competition?: number;
  
  // Relevance scoring
  relevanceScore?: number;       // 0-100 based on our algorithm
  relevanceFactors?: {           // Why this score?
    exactMatch: boolean;
    topicMatch: boolean;
    semanticSimilarity: number;
  };
  
  createdAt: Date;
}
```

### 6. Qualification Results
Final qualification results and site-to-target-page mapping.

```typescript
// qualification_results table
interface QualificationResult {
  id: string;
  jobId: string;                 // FK to qualification_jobs
  siteId: string;                // FK to bulk_sites
  
  // Overall qualification
  isQualified: boolean;
  overallScore: number;          // 0-100
  qualificationTier: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Detailed scoring
  scoreBreakdown: {
    topicalRelevance: number;    // How relevant to topics
    rankingStrength: number;     // How well they rank
    competitiveness: number;     // Difficulty of keywords
    coverage: number;            // How many topics covered
  };
  
  // Target page mapping
  targetPageScores: Array<{
    targetPageId: string;
    relevanceScore: number;      // 0-100
    matchedTopics: string[];     // Which topics matched
    recommendedPriority: number; // 1-10
  }>;
  
  // Recommendations
  primaryTargetPageId?: string;  // Best match
  alternativeTargetPageIds?: string[]; // Other good matches
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Key Design Decisions

### 1. Topic Term Extraction
- Extract single words ("payment") and compound terms ("payment gateway")
- Store centrally to track performance over time
- Allow manual override of which terms to use

### 2. API Efficiency  
- Use DataForSEO's filter: `["keyword", "like", "%payment%"]`
- One API call returns ALL keywords containing "payment"
- Drastically reduces API costs vs checking specific keywords

### 3. Flexible Scoring
- Configurable relevance thresholds per job
- Multiple scoring factors tracked
- Clear tier system (A-F) for quick decisions

### 4. Smart Mapping
- Don't just qualify sites - map them to best target pages
- Support multiple good matches per site
- Track which topics drove the match

## Example Data Flow

1. **Job Creation**
   - User selects target pages
   - System extracts topic terms from keywords
   - Creates job and bulk sites records

2. **Topic Extraction**
   ```
   Keywords: "payment gateway API", "online payment processing"
   → Topics: ["payment", "gateway", "api", "online", "processing"]
   → Selected: ["payment", "gateway"] (based on importance)
   ```

3. **API Calls**
   ```
   For site "techblog.com":
   - Call 1: filter ["keyword", "like", "%payment%"]
   - Call 2: filter ["keyword", "like", "%gateway%"]
   → Returns all keywords containing these terms
   ```

4. **Scoring**
   - Count relevant keywords found
   - Check ranking positions
   - Calculate topical coverage
   - Generate final score and tier

5. **Mapping**
   - Compare site's ranking topics to each target page
   - Recommend best matches
   - Store for easy filtering in UI