# Keyword Clustering Design for Bulk Site Qualification

## Overview
When a user selects multiple target pages for bulk qualification, we need to intelligently cluster their keywords to reduce API costs while maintaining accuracy in site relevance scoring.

## Example Scenario
Client: FinTech SaaS Company
- Target Page 1: `/payment-processing` - Keywords: "payment gateway API, online payment processing, payment integration"
- Target Page 2: `/fraud-detection` - Keywords: "fraud detection software, payment fraud prevention, ML fraud detection"
- Target Page 3: `/compliance-tools` - Keywords: "PCI compliance software, payment compliance, regulatory compliance fintech"

Total: 9 keywords × checking 100 sites = 900 API calls (expensive!)

## Clustering Approach: Hybrid Semantic + Business Logic

### 1. Semantic Clustering with OpenAI Embeddings
```typescript
interface KeywordCluster {
  id: string;
  name: string; // Auto-generated cluster name
  targetPageIds: string[]; // Which pages contributed keywords
  keywords: string[]; // All keywords in cluster
  embedding?: number[]; // Cluster centroid embedding
  representativeKeywords: string[]; // Top 3-5 for API checks
}
```

### 2. Clustering Process

#### Step 1: Extract All Keywords
```typescript
// From selected target pages
const allKeywords = [
  { keyword: "payment gateway API", targetPageId: "page-1" },
  { keyword: "online payment processing", targetPageId: "page-1" },
  { keyword: "fraud detection software", targetPageId: "page-2" },
  // ... etc
];
```

#### Step 2: Generate Embeddings
```typescript
async function generateKeywordEmbeddings(keywords: string[]) {
  const openai = new OpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: keywords,
  });
  return response.data;
}
```

#### Step 3: Cluster Similar Keywords
Using cosine similarity with dynamic threshold:
```typescript
function clusterKeywords(embeddings: EmbeddingData[], threshold = 0.85) {
  const clusters: KeywordCluster[] = [];
  
  // DBSCAN-style clustering
  embeddings.forEach((item, idx) => {
    let assigned = false;
    
    for (const cluster of clusters) {
      const similarity = cosineSimilarity(item.embedding, cluster.embedding);
      if (similarity > threshold) {
        cluster.keywords.push(item.keyword);
        cluster.targetPageIds.push(item.targetPageId);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      // Create new cluster
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        name: '', // Will be generated
        keywords: [item.keyword],
        targetPageIds: [item.targetPageId],
        embedding: item.embedding,
        representativeKeywords: []
      });
    }
  });
  
  return clusters;
}
```

#### Step 4: Select Representative Keywords
For each cluster, pick keywords that best represent the group:
```typescript
async function selectRepresentativeKeywords(cluster: KeywordCluster) {
  // Strategy 1: Highest search volume (if available)
  // Strategy 2: Closest to cluster centroid
  // Strategy 3: Mix of head terms and long-tail
  
  const representatives = [];
  
  // 1. Pick the shortest keyword (likely head term)
  const headTerm = cluster.keywords
    .sort((a, b) => a.length - b.length)[0];
  representatives.push(headTerm);
  
  // 2. Pick the longest keyword (specific long-tail)
  const longTail = cluster.keywords
    .sort((a, b) => b.length - a.length)[0];
  if (longTail !== headTerm) representatives.push(longTail);
  
  // 3. Pick keyword closest to centroid
  const centroidKeyword = await findClosestToCentroid(cluster);
  if (!representatives.includes(centroidKeyword)) {
    representatives.push(centroidKeyword);
  }
  
  return representatives.slice(0, 3); // Max 3 per cluster
}
```

#### Step 5: Name Clusters with GPT
```typescript
async function generateClusterNames(clusters: KeywordCluster[]) {
  const prompt = `Given these keyword groups, provide a concise 2-3 word name for each cluster:
  
  ${clusters.map((c, idx) => 
    `Cluster ${idx + 1}: ${c.keywords.slice(0, 5).join(', ')}`
  ).join('\n')}
  
  Return as JSON: [{"cluster": 1, "name": "Payment Processing"}, ...]`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Cost Optimization Strategies

#### A. Tiered Checking
```typescript
interface QualificationSettings {
  checkDepth: 'minimal' | 'balanced' | 'thorough';
}

// Minimal: 1 keyword per cluster (fastest, cheapest)
// Balanced: 2-3 keywords per cluster (recommended)
// Thorough: All keywords (most accurate, expensive)
```

#### B. Smart Caching
```typescript
interface KeywordRankingCache {
  keyword: string;
  domain: string;
  position: number;
  checkedAt: Date;
  expiresAt: Date; // 30 days
}
```

#### C. Progressive Qualification
Instead of checking all sites at once:
1. Quick check with 1 representative keyword per cluster
2. If site shows promise (ranks in top 50), check more keywords
3. Only do deep analysis on high-potential sites

### 4. Example Output

For our FinTech example:
```json
{
  "clusters": [
    {
      "id": "cluster-1",
      "name": "Payment Processing",
      "keywords": [
        "payment gateway API",
        "online payment processing",
        "payment integration"
      ],
      "representativeKeywords": [
        "payment gateway API",
        "online payment processing"
      ],
      "targetPageIds": ["page-1"]
    },
    {
      "id": "cluster-2",
      "name": "Fraud Detection",
      "keywords": [
        "fraud detection software",
        "payment fraud prevention",
        "ML fraud detection"
      ],
      "representativeKeywords": [
        "fraud detection software",
        "payment fraud prevention"
      ],
      "targetPageIds": ["page-2"]
    },
    {
      "id": "cluster-3",
      "name": "Compliance Tools",
      "keywords": [
        "PCI compliance software",
        "payment compliance",
        "regulatory compliance fintech"
      ],
      "representativeKeywords": [
        "PCI compliance software",
        "compliance fintech"
      ],
      "targetPageIds": ["page-3"]
    }
  ],
  "stats": {
    "totalKeywords": 9,
    "totalClusters": 3,
    "apiCallsNeeded": {
      "minimal": 3,   // 1 per cluster
      "balanced": 7,  // 2-3 per cluster
      "thorough": 9   // all keywords
    },
    "costSavings": "67% reduction with balanced mode"
  }
}
```

### 5. Implementation Steps

1. **Create clustering service**
   ```typescript
   class KeywordClusteringService {
     async clusterTargetPageKeywords(
       targetPages: TargetPage[],
       settings: ClusteringSettings
     ): Promise<KeywordCluster[]>
   }
   ```

2. **Add UI for cluster review**
   - Show clusters before running qualification
   - Allow manual adjustment
   - Let users select check depth

3. **Integrate with qualification job**
   - Store clusters with job
   - Use representatives for API calls
   - Map results back to all keywords

### 6. Advanced Features (Future)

1. **Learning from history**
   - Track which keywords actually drive relevance
   - Adjust clustering based on outcomes

2. **Industry-specific clustering**
   - FinTech clusters differently than eCommerce
   - Pre-built cluster templates

3. **Multi-language support**
   - Cluster by language first
   - Then by semantic meaning

## Benefits

1. **Cost Reduction**: 67-80% fewer API calls
2. **Better Insights**: See keyword themes, not just individual terms
3. **Smarter Matching**: Match sites to keyword themes, not just exact terms
4. **Scalability**: Handle clients with 1000+ keywords efficiently