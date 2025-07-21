# Relevance Scoring Algorithm for Bulk Site Qualification

## Overview
Scoring algorithm to determine how relevant a site is for guest posting based on their keyword rankings relative to the client's target pages and topics.

## Input Data Sources

### 1. From V1 (Ahrefs Manual Check)
```typescript
interface AhrefsManualResult {
  siteId: string;
  domain: string;
  status: 'qualified' | 'disqualified' | 'pending';
  notes?: string;
  checkedKeywords: string[];  // Which keywords were checked
  manualAssessment: {
    topicalRelevance: number;  // 1-10 manual assessment
    rankingStrength: number;   // 1-10 manual assessment
    contentQuality: number;    // 1-10 manual assessment
  };
}
```

### 2. From V2 (DataForSEO API)
```typescript
interface DataForSEORankingData {
  siteId: string;
  domain: string;
  rankings: Array<{
    keyword: string;
    position: number;
    searchVolume?: number;
    cpc?: number;
    url: string;
    topicMatch: string;  // Which topic term found this
  }>;
  totalKeywordsFound: number;
  relevantKeywordsCount: number;
}
```

## Scoring Framework

### Core Scoring Factors
```typescript
interface RelevanceScore {
  // Overall score (0-100)
  overallScore: number;
  qualificationTier: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Detailed breakdown
  scoreBreakdown: {
    topicalRelevance: number;    // 0-100: How well topics align
    rankingStrength: number;     // 0-100: How well they rank
    competitiveness: number;     // 0-100: Difficulty of their keywords
    coverage: number;            // 0-100: How many topics covered
  };
  
  // Supporting data
  confidence: number;            // 0-100: How confident we are
  dataSource: 'manual' | 'api' | 'hybrid';
  reasoningFactors: string[];   // Human-readable explanations
}
```

## V1 Algorithm (Ahrefs Manual)

### Simple Qualification Score
```typescript
class V1RelevanceScorer {
  static calculateManualScore(result: AhrefsManualResult, targetKeywords: string[]): RelevanceScore {
    const { manualAssessment, status } = result;
    
    // Base score from manual assessment (weighted average)
    const topicalWeight = 0.4;   // Most important
    const rankingWeight = 0.35;  // Second most important
    const qualityWeight = 0.25;  // Supporting factor
    
    const weightedScore = (
      (manualAssessment.topicalRelevance * topicalWeight) +
      (manualAssessment.rankingStrength * rankingWeight) +
      (manualAssessment.contentQuality * qualityWeight)
    ) * 10; // Convert to 0-100 scale
    
    // Status modifier
    let finalScore = weightedScore;
    if (status === 'disqualified') {
      finalScore = Math.min(finalScore, 40); // Cap at 40 for disqualified
    } else if (status === 'qualified') {
      finalScore = Math.max(finalScore, 60); // Floor at 60 for qualified
    }
    
    // Coverage estimation (based on keywords checked vs total)
    const coverageRatio = result.checkedKeywords.length / targetKeywords.length;
    const coverageScore = Math.min(coverageRatio * 100, 100);
    
    return {
      overallScore: Math.round(finalScore),
      qualificationTier: this.scoreToTier(finalScore),
      scoreBreakdown: {
        topicalRelevance: manualAssessment.topicalRelevance * 10,
        rankingStrength: manualAssessment.rankingStrength * 10,
        competitiveness: 75, // Default assumption for manual check
        coverage: Math.round(coverageScore)
      },
      confidence: status === 'pending' ? 50 : 85, // High confidence when manually assessed
      dataSource: 'manual',
      reasoningFactors: this.generateManualReasons(result, finalScore)
    };
  }
  
  private static scoreToTier(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
  
  private static generateManualReasons(result: AhrefsManualResult, score: number): string[] {
    const reasons = [];
    
    if (result.status === 'qualified') {
      reasons.push('Manually qualified by reviewer');
    } else if (result.status === 'disqualified') {
      reasons.push('Manually disqualified by reviewer');
    }
    
    if (result.manualAssessment.topicalRelevance >= 8) {
      reasons.push('High topical relevance to target keywords');
    } else if (result.manualAssessment.topicalRelevance <= 4) {
      reasons.push('Low topical relevance to target keywords');
    }
    
    if (result.manualAssessment.rankingStrength >= 8) {
      reasons.push('Strong rankings for relevant keywords');
    } else if (result.manualAssessment.rankingStrength <= 4) {
      reasons.push('Weak rankings for relevant keywords');
    }
    
    if (result.notes) {
      reasons.push(`Note: ${result.notes}`);
    }
    
    return reasons;
  }
}
```

## V2 Algorithm (DataForSEO API)

### Advanced Algorithmic Scoring
```typescript
class V2RelevanceScorer {
  static calculateAPIScore(
    rankings: DataForSEORankingData,
    targetTopics: string[],
    targetKeywords: string[]
  ): RelevanceScore {
    const scores = {
      topicalRelevance: this.calculateTopicalRelevance(rankings, targetTopics),
      rankingStrength: this.calculateRankingStrength(rankings),
      competitiveness: this.calculateCompetitiveness(rankings),
      coverage: this.calculateCoverage(rankings, targetKeywords)
    };
    
    // Weighted overall score
    const weights = {
      topicalRelevance: 0.35,
      rankingStrength: 0.30,
      competitiveness: 0.20,
      coverage: 0.15
    };
    
    const overallScore = Object.entries(scores).reduce((total, [factor, score]) => {
      return total + (score * weights[factor as keyof typeof weights]);
    }, 0);
    
    return {
      overallScore: Math.round(overallScore),
      qualificationTier: this.scoreToTier(overallScore),
      scoreBreakdown: scores,
      confidence: this.calculateConfidence(rankings),
      dataSource: 'api',
      reasoningFactors: this.generateAPIReasons(rankings, scores, overallScore)
    };
  }
  
  // Factor 1: Topical Relevance (35% weight)
  private static calculateTopicalRelevance(
    rankings: DataForSEORankingData, 
    targetTopics: string[]
  ): number {
    if (rankings.rankings.length === 0) return 0;
    
    // Count keywords per topic
    const topicMatches = new Map<string, number>();
    targetTopics.forEach(topic => topicMatches.set(topic, 0));
    
    rankings.rankings.forEach(ranking => {
      const matchedTopic = targetTopics.find(topic => 
        ranking.keyword.toLowerCase().includes(topic.toLowerCase()) ||
        ranking.topicMatch === topic
      );
      if (matchedTopic) {
        topicMatches.set(matchedTopic, (topicMatches.get(matchedTopic) || 0) + 1);
      }
    });
    
    // Score based on topic coverage and depth
    const topicsWithMatches = Array.from(topicMatches.values()).filter(count => count > 0);
    const coverageRatio = topicsWithMatches.length / targetTopics.length;
    const avgDepth = topicsWithMatches.reduce((sum, count) => sum + count, 0) / Math.max(topicsWithMatches.length, 1);
    
    // Combine coverage and depth
    const coverageScore = coverageRatio * 50; // Max 50 points for coverage
    const depthScore = Math.min(avgDepth * 10, 50); // Max 50 points for depth
    
    return Math.min(coverageScore + depthScore, 100);
  }
  
  // Factor 2: Ranking Strength (30% weight)
  private static calculateRankingStrength(rankings: DataForSEORankingData): number {
    if (rankings.rankings.length === 0) return 0;
    
    // Position-based scoring (higher positions = better score)
    const positionScores = rankings.rankings.map(ranking => {
      if (ranking.position <= 3) return 100;      // Top 3
      if (ranking.position <= 10) return 80;     // Page 1
      if (ranking.position <= 20) return 60;     // Top 20
      if (ranking.position <= 50) return 40;     // Top 50
      return 20;                                  // Beyond 50
    });
    
    // Weighted by search volume if available
    const weightedScores = rankings.rankings.map((ranking, index) => {
      const positionScore = positionScores[index];
      const volumeWeight = ranking.searchVolume ? Math.log10(ranking.searchVolume + 1) : 1;
      return positionScore * volumeWeight;
    });
    
    const totalWeight = rankings.rankings.reduce((sum, ranking) => {
      return sum + (ranking.searchVolume ? Math.log10(ranking.searchVolume + 1) : 1);
    }, 0);
    
    const weightedAverage = weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight;
    
    return Math.min(weightedAverage, 100);
  }
  
  // Factor 3: Competitiveness (20% weight)
  private static calculateCompetitiveness(rankings: DataForSEORankingData): number {
    if (rankings.rankings.length === 0) return 0;
    
    // Higher CPC generally indicates more competitive/valuable keywords
    const cpcScores = rankings.rankings.map(ranking => {
      if (!ranking.cpc) return 50; // Default if no CPC data
      
      if (ranking.cpc >= 10) return 100;    // Very valuable
      if (ranking.cpc >= 5) return 80;      // High value
      if (ranking.cpc >= 2) return 60;      // Medium value
      if (ranking.cpc >= 0.5) return 40;    // Low-medium value
      return 20;                            // Low value
    });
    
    // Also factor in search volume (competitive keywords have volume)
    const volumeScores = rankings.rankings.map(ranking => {
      if (!ranking.searchVolume) return 50; // Default if no volume data
      
      if (ranking.searchVolume >= 10000) return 100;  // High volume
      if (ranking.searchVolume >= 5000) return 80;    // Medium-high volume
      if (ranking.searchVolume >= 1000) return 60;    // Medium volume
      if (ranking.searchVolume >= 100) return 40;     // Low-medium volume
      return 20;                                      // Low volume
    });
    
    // Average CPC and volume scores
    const avgCpcScore = cpcScores.reduce((sum, score) => sum + score, 0) / cpcScores.length;
    const avgVolumeScore = volumeScores.reduce((sum, score) => sum + score, 0) / volumeScores.length;
    
    return (avgCpcScore + avgVolumeScore) / 2;
  }
  
  // Factor 4: Coverage (15% weight)
  private static calculateCoverage(
    rankings: DataForSEORankingData,
    targetKeywords: string[]
  ): number {
    if (targetKeywords.length === 0) return 100; // If no targets, full coverage
    
    // Count how many target keywords have related rankings
    const matchedKeywords = new Set<string>();
    
    rankings.rankings.forEach(ranking => {
      targetKeywords.forEach(targetKeyword => {
        const target = targetKeyword.toLowerCase();
        const ranking_kw = ranking.keyword.toLowerCase();
        
        // Exact match or contains
        if (ranking_kw.includes(target) || target.includes(ranking_kw)) {
          matchedKeywords.add(targetKeyword);
        }
      });
    });
    
    const coverageRatio = matchedKeywords.size / targetKeywords.length;
    return coverageRatio * 100;
  }
  
  // Calculate confidence based on data quality
  private static calculateConfidence(rankings: DataForSEORankingData): number {
    let confidence = 70; // Base confidence for API data
    
    // More rankings = higher confidence
    if (rankings.rankings.length >= 50) confidence += 20;
    else if (rankings.rankings.length >= 20) confidence += 10;
    else if (rankings.rankings.length < 5) confidence -= 20;
    
    // Search volume data available = higher confidence
    const withVolumeData = rankings.rankings.filter(r => r.searchVolume).length;
    const volumeRatio = withVolumeData / Math.max(rankings.rankings.length, 1);
    confidence += volumeRatio * 10;
    
    return Math.min(Math.max(confidence, 10), 95); // Keep between 10-95%
  }
  
  private static generateAPIReasons(
    rankings: DataForSEORankingData,
    scores: any,
    overallScore: number
  ): string[] {
    const reasons = [];
    
    // Ranking strength insights
    const top10Count = rankings.rankings.filter(r => r.position <= 10).length;
    const top50Count = rankings.rankings.filter(r => r.position <= 50).length;
    
    if (top10Count >= 5) {
      reasons.push(`Strong performer: ${top10Count} keywords ranking in top 10`);
    } else if (top50Count >= 10) {
      reasons.push(`Good visibility: ${top50Count} keywords ranking in top 50`);
    } else if (rankings.rankings.length < 5) {
      reasons.push('Limited ranking data available');
    }
    
    // Topic coverage insights
    if (scores.topicalRelevance >= 80) {
      reasons.push('High topical alignment with target keywords');
    } else if (scores.topicalRelevance <= 40) {
      reasons.push('Limited topical overlap with target keywords');
    }
    
    // Competitiveness insights
    const highValueKW = rankings.rankings.filter(r => (r.cpc || 0) >= 5).length;
    if (highValueKW >= 3) {
      reasons.push(`Ranks for ${highValueKW} high-value keywords (CPC $5+)`);
    }
    
    // Coverage insights
    if (scores.coverage >= 80) {
      reasons.push('Excellent keyword coverage across target topics');
    } else if (scores.coverage <= 30) {
      reasons.push('Limited coverage of target keyword set');
    }
    
    return reasons;
  }
  
  private static scoreToTier(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}
```

## Hybrid Scoring (V1 + V2)

### Combining Manual + API Data
```typescript
class HybridRelevanceScorer {
  static combineScores(
    manualResult: AhrefsManualResult,
    apiResult: DataForSEORankingData,
    targetTopics: string[],
    targetKeywords: string[]
  ): RelevanceScore {
    const manualScore = V1RelevanceScorer.calculateManualScore(manualResult, targetKeywords);
    const apiScore = V2RelevanceScorer.calculateAPIScore(apiResult, targetTopics, targetKeywords);
    
    // Weight based on confidence and data completeness
    const manualWeight = manualScore.confidence / 100;
    const apiWeight = apiScore.confidence / 100;
    const totalWeight = manualWeight + apiWeight;
    
    // Weighted average of scores
    const combinedScore = (
      (manualScore.overallScore * manualWeight) +
      (apiScore.overallScore * apiWeight)
    ) / totalWeight;
    
    // Combine breakdown scores
    const combinedBreakdown = {
      topicalRelevance: this.weightedAverage(
        manualScore.scoreBreakdown.topicalRelevance, manualWeight,
        apiScore.scoreBreakdown.topicalRelevance, apiWeight
      ),
      rankingStrength: this.weightedAverage(
        manualScore.scoreBreakdown.rankingStrength, manualWeight,
        apiScore.scoreBreakdown.rankingStrength, apiWeight
      ),
      competitiveness: this.weightedAverage(
        manualScore.scoreBreakdown.competitiveness, manualWeight,
        apiScore.scoreBreakdown.competitiveness, apiWeight
      ),
      coverage: Math.max( // Take the better coverage score
        manualScore.scoreBreakdown.coverage,
        apiScore.scoreBreakdown.coverage
      )
    };
    
    // Combined confidence (higher when both sources agree)
    const scoreDifference = Math.abs(manualScore.overallScore - apiScore.overallScore);
    const agreementBonus = Math.max(0, (20 - scoreDifference) / 20 * 10); // Up to 10 point bonus
    const combinedConfidence = Math.min(
      ((manualScore.confidence + apiScore.confidence) / 2) + agreementBonus,
      95
    );
    
    return {
      overallScore: Math.round(combinedScore),
      qualificationTier: this.scoreToTier(combinedScore),
      scoreBreakdown: {
        topicalRelevance: Math.round(combinedBreakdown.topicalRelevance),
        rankingStrength: Math.round(combinedBreakdown.rankingStrength),
        competitiveness: Math.round(combinedBreakdown.competitiveness),
        coverage: Math.round(combinedBreakdown.coverage)
      },
      confidence: Math.round(combinedConfidence),
      dataSource: 'hybrid',
      reasoningFactors: [
        ...manualScore.reasoningFactors.map(r => `Manual: ${r}`),
        ...apiScore.reasoningFactors.map(r => `API: ${r}`),
        `Combined data sources for higher confidence (${Math.round(combinedConfidence)}%)`
      ]
    };
  }
  
  private static weightedAverage(
    score1: number, weight1: number,
    score2: number, weight2: number
  ): number {
    return (score1 * weight1 + score2 * weight2) / (weight1 + weight2);
  }
  
  private static scoreToTier(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 65) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}
```

## Usage Examples

### Example 1: V1 Manual Scoring
```typescript
const manualResult: AhrefsManualResult = {
  siteId: 'site-1',
  domain: 'techcrunch.com',
  status: 'qualified',
  notes: 'Great tech coverage, high authority',
  checkedKeywords: ['payment', 'fintech', 'startup'],
  manualAssessment: {
    topicalRelevance: 8,  // Very relevant to fintech
    rankingStrength: 9,   // Ranks very well
    contentQuality: 8     // High quality content
  }
};

const targetKeywords = ['payment gateway', 'fintech software', 'startup funding'];
const score = V1RelevanceScorer.calculateManualScore(manualResult, targetKeywords);

// Result: 
// {
//   overallScore: 83,
//   qualificationTier: 'B',
//   confidence: 85,
//   reasoningFactors: ['Manually qualified by reviewer', 'High topical relevance', ...]
// }
```

### Example 2: V2 API Scoring
```typescript
const apiData: DataForSEORankingData = {
  siteId: 'site-1',
  domain: 'techcrunch.com',
  totalKeywordsFound: 1250,
  relevantKeywordsCount: 89,
  rankings: [
    { keyword: 'payment processing startup', position: 3, searchVolume: 2400, cpc: 8.50, url: '/...', topicMatch: 'payment' },
    { keyword: 'fintech funding round', position: 7, searchVolume: 1800, cpc: 12.00, url: '/...', topicMatch: 'fintech' },
    // ... more rankings
  ]
};

const targetTopics = ['payment', 'fintech', 'startup'];
const targetKeywords = ['payment gateway', 'fintech software', 'startup funding'];
const score = V2RelevanceScorer.calculateAPIScore(apiData, targetTopics, targetKeywords);

// Result:
// {
//   overallScore: 78,
//   qualificationTier: 'B', 
//   confidence: 88,
//   reasoningFactors: ['Strong performer: 15 keywords in top 10', 'High topical alignment', ...]
// }
```

## Tier Qualification Guidelines

- **A-Tier (85-100)**: Premium sites, highest priority
- **B-Tier (75-84)**: Strong sites, good targets  
- **C-Tier (65-74)**: Decent sites, consider if needed
- **D-Tier (50-64)**: Marginal sites, low priority
- **F-Tier (0-49)**: Not qualified, avoid

## Implementation Notes

1. **Start with V1** for immediate functionality
2. **Add V2** when DataForSEO integration is ready
3. **Hybrid approach** combines best of both worlds
4. **Configurable weights** allow tuning per client
5. **Human oversight** always available to override scores