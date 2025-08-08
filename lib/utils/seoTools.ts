/**
 * SEO Analysis Tools and Utilities
 * 
 * This module provides specialized tools for analyzing various aspects of website SEO.
 * These tools work with the agenticSEOAuditorService to provide comprehensive SEO auditing.
 */

export interface TechnicalSEOAnalysis {
  pageSpeed: {
    desktopScore: number;
    mobileScore: number;
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
    };
    issues: string[];
  };
  mobileFriendly: {
    isMobileFriendly: boolean;
    score: number;
    issues: string[];
  };
  crawlability: {
    robotsTxtStatus: string;
    sitemapStatus: string;
    internalLinksCount: number;
    brokenLinksCount: number;
    issues: string[];
  };
  security: {
    hasSSL: boolean;
    sslScore: number;
    securityHeaders: string[];
    issues: string[];
  };
  structuredData: {
    hasSchema: boolean;
    schemaTypes: string[];
    validationErrors: number;
    issues: string[];
  };
}

export interface OnPageSEOAnalysis {
  titleTag: {
    content: string;
    length: number;
    score: number;
    issues: string[];
  };
  metaDescription: {
    content: string;
    length: number;
    score: number;
    issues: string[];
  };
  headers: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    structureScore: number;
    issues: string[];
  };
  contentAnalysis: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: Record<string, number>;
    issues: string[];
  };
  images: {
    totalImages: number;
    imagesWithAlt: number;
    altTextScore: number;
    imageOptimizationIssues: string[];
  };
  internalLinking: {
    internalLinksCount: number;
    anchorTextVariation: number;
    linkingIssues: string[];
  };
}

export interface OffPageSEOAnalysis {
  backlinkProfile: {
    totalBacklinks: number;
    referringDomains: number;
    domainAuthority: number;
    spamScore: number;
    topAnchorTexts: string[];
    issues: string[];
  };
  socialSignals: {
    facebookShares: number;
    twitterMentions: number;
    linkedinShares: number;
    socialScore: number;
    issues: string[];
  };
  localSEO?: {
    googleMyBusiness: boolean;
    localCitations: number;
    reviewCount: number;
    averageRating: number;
    localScore: number;
    issues: string[];
  };
}

export interface SEORecommendation {
  category: 'technical' | 'onpage' | 'offpage' | 'content' | 'mobile' | 'local';
  priority: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  timeline: string;
  resourcesNeeded: string[];
}

export interface SEOActionItem {
  id: string;
  priority: number; // 1-10
  category: string;
  task: string;
  description: string;
  timeline: string;
  effort: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  resourcesNeeded: string[];
  dependencies: string[];
}

export interface ComprehensiveSEOReport {
  websiteUrl: string;
  auditDate: string;
  overallScore: number; // 0-100
  categoryScores: {
    technicalSEO: number;
    onPageSEO: number;
    offPageSEO: number;
    contentQuality: number;
    mobileOptimization: number;
    localSEO?: number;
  };
  criticalIssues: SEORecommendation[];
  quickWins: SEORecommendation[];
  longTermStrategy: string[];
  competitorInsights: string[];
  actionPlan: SEOActionItem[];
  technicalAnalysis: TechnicalSEOAnalysis;
  onPageAnalysis: OnPageSEOAnalysis;
  offPageAnalysis: OffPageSEOAnalysis;
}

/**
 * SEO Analysis Utilities
 */
export class SEOAnalyzer {
  
  /**
   * Analyze title tag optimization
   */
  static analyzeTitleTag(title: string, targetKeywords: string[] = []): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Length analysis
    if (title.length === 0) {
      issues.push('Missing title tag');
      score -= 50;
    } else if (title.length < 30) {
      issues.push('Title tag is too short (under 30 characters)');
      score -= 20;
    } else if (title.length > 60) {
      issues.push('Title tag is too long (over 60 characters)');
      score -= 15;
    }

    // Keyword analysis
    if (targetKeywords.length > 0) {
      const titleLower = title.toLowerCase();
      const hasTargetKeyword = targetKeywords.some(keyword => 
        titleLower.includes(keyword.toLowerCase())
      );
      
      if (!hasTargetKeyword) {
        issues.push('Title tag does not contain target keywords');
        score -= 25;
      }
    }

    // Best practices
    if (title.includes(' | ') || title.includes(' - ')) {
      // Good separator usage
    } else {
      recommendations.push('Consider using separators (| or -) to structure the title');
    }

    if (score < 0) score = 0;

    return { score, issues, recommendations };
  }

  /**
   * Analyze meta description optimization
   */
  static analyzeMetaDescription(description: string, targetKeywords: string[] = []): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Length analysis
    if (description.length === 0) {
      issues.push('Missing meta description');
      score -= 40;
    } else if (description.length < 120) {
      issues.push('Meta description is too short (under 120 characters)');
      score -= 15;
    } else if (description.length > 160) {
      issues.push('Meta description is too long (over 160 characters)');
      score -= 20;
    }

    // Keyword analysis
    if (targetKeywords.length > 0 && description.length > 0) {
      const descriptionLower = description.toLowerCase();
      const hasTargetKeyword = targetKeywords.some(keyword => 
        descriptionLower.includes(keyword.toLowerCase())
      );
      
      if (!hasTargetKeyword) {
        issues.push('Meta description does not contain target keywords');
        score -= 20;
      }
    }

    // Call-to-action analysis
    const ctas = ['learn more', 'discover', 'find out', 'get started', 'read more', 'explore'];
    const hasCTA = ctas.some(cta => description.toLowerCase().includes(cta));
    
    if (!hasCTA && description.length > 0) {
      recommendations.push('Consider adding a call-to-action to improve click-through rates');
    }

    if (score < 0) score = 0;

    return { score, issues, recommendations };
  }

  /**
   * Analyze header structure
   */
  static analyzeHeaders(content: string): {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Count headers
    const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;

    // H1 analysis
    if (h1Count === 0) {
      issues.push('Missing H1 tag');
      score -= 30;
    } else if (h1Count > 1) {
      issues.push('Multiple H1 tags found - should have only one per page');
      score -= 20;
    }

    // H2 analysis
    if (h2Count === 0 && content.length > 1000) {
      issues.push('No H2 tags found - consider adding section headings for better structure');
      score -= 15;
    }

    // Header hierarchy
    if (h3Count > 0 && h2Count === 0) {
      issues.push('H3 tags found without H2 tags - improper heading hierarchy');
      score -= 10;
    }

    if (score < 0) score = 0;

    return { 
      h1Count, 
      h2Count, 
      h3Count, 
      score, 
      issues, 
      recommendations 
    };
  }

  /**
   * Calculate keyword density
   */
  static calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const density: Record<string, number> = {};
    const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const occurrences = content.toLowerCase().split(keywordLower).length - 1;
      density[keyword] = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;
    });

    return density;
  }

  /**
   * Generate prioritized recommendations
   */
  static prioritizeRecommendations(recommendations: SEORecommendation[]): SEORecommendation[] {
    // Priority scoring: high impact + low effort = higher priority
    const scoreRecommendation = (rec: SEORecommendation): number => {
      const impactScore = rec.impact === 'high' ? 3 : rec.impact === 'medium' ? 2 : 1;
      const effortScore = rec.effort === 'low' ? 3 : rec.effort === 'medium' ? 2 : 1;
      const priorityScore = rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1;
      
      return impactScore + effortScore + priorityScore;
    };

    return recommendations.sort((a, b) => scoreRecommendation(b) - scoreRecommendation(a));
  }

  /**
   * Create action plan from recommendations
   */
  static createActionPlan(recommendations: SEORecommendation[]): SEOActionItem[] {
    const prioritized = this.prioritizeRecommendations(recommendations);
    
    return prioritized.map((rec, index) => ({
      id: `action-${index + 1}`,
      priority: index + 1,
      category: rec.category,
      task: rec.title,
      description: rec.description,
      timeline: rec.timeline,
      effort: rec.effort,
      impact: rec.impact,
      resourcesNeeded: rec.resourcesNeeded,
      dependencies: []
    }));
  }

  /**
   * Calculate overall SEO score from category scores
   */
  static calculateOverallScore(categoryScores: {
    technicalSEO: number;
    onPageSEO: number;
    offPageSEO: number;
    contentQuality: number;
    mobileOptimization: number;
    localSEO?: number;
  }): number {
    const weights = {
      technicalSEO: 0.25,
      onPageSEO: 0.25,
      offPageSEO: 0.20,
      contentQuality: 0.15,
      mobileOptimization: 0.15,
      localSEO: 0.00 // Will be adjusted if local SEO is included
    };

    let totalWeight = 0;
    let weightedScore = 0;

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score !== undefined && category in weights) {
        const weight = weights[category as keyof typeof weights];
        weightedScore += score * weight;
        totalWeight += weight;
      }
    });

    // If local SEO is included, adjust weights
    if (categoryScores.localSEO !== undefined) {
      weights.localSEO = 0.10;
      weights.technicalSEO = 0.20;
      weights.onPageSEO = 0.20;
      weights.offPageSEO = 0.20;
      weights.contentQuality = 0.15;
      weights.mobileOptimization = 0.15;

      // Recalculate with local SEO
      weightedScore = 0;
      totalWeight = 0;
      Object.entries(categoryScores).forEach(([category, score]) => {
        if (score !== undefined && category in weights) {
          const weight = weights[category as keyof typeof weights];
          weightedScore += score * weight;
          totalWeight += weight;
        }
      });
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }
}

/**
 * SEO Best Practices and Guidelines
 */
export const SEO_BEST_PRACTICES = {
  titleTag: {
    minLength: 30,
    maxLength: 60,
    optimalLength: 55
  },
  metaDescription: {
    minLength: 120,
    maxLength: 160,
    optimalLength: 155
  },
  headers: {
    maxH1Count: 1,
    recommendH2ForLongContent: 1000, // words
  },
  content: {
    minWordCount: 300,
    optimalWordCount: 1000,
    maxKeywordDensity: 3 // percentage
  },
  images: {
    altTextRequired: true,
    maxFileSize: 100, // KB for web optimization
  },
  technical: {
    pageSpeedMinScore: 70,
    mobileSpeedMinScore: 60,
    sslRequired: true
  }
};

export default SEOAnalyzer;