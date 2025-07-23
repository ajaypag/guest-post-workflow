/**
 * Utility functions for grouping keywords by topical relevance
 */

interface KeywordGroup {
  name: string;
  keywords: string[];
  relevance: 'core' | 'related' | 'wider';
  priority: number;
}

/**
 * Group keywords by topical relevance using various strategies
 */
export function groupKeywordsByTopic(keywords: string[]): KeywordGroup[] {
  if (!keywords || keywords.length === 0) return [];
  
  // Clean and normalize keywords
  const cleanKeywords = keywords.map(k => k.trim().toLowerCase());
  
  // Extract common terms and their frequencies
  const termFrequency = extractTermFrequency(cleanKeywords);
  
  // Identify core terms (appear in many keywords)
  const coreTerms = identifyCoreTerms(termFrequency, cleanKeywords.length);
  
  // Group keywords based on shared terms
  const groups: KeywordGroup[] = [];
  const ungroupedKeywords = new Set(cleanKeywords);
  
  // 1. Core keyword group - contains multiple core terms
  const coreKeywords = cleanKeywords.filter(keyword => {
    const terms = keyword.split(/\s+/);
    const coreTermCount = terms.filter(term => coreTerms.has(term)).length;
    return coreTermCount >= 2; // Has at least 2 core terms
  });
  
  if (coreKeywords.length > 0) {
    groups.push({
      name: 'Core Keywords',
      keywords: coreKeywords,
      relevance: 'core',
      priority: 1
    });
    coreKeywords.forEach(k => ungroupedKeywords.delete(k));
  }
  
  // 2. Related keyword groups - share one core term
  coreTerms.forEach(coreTerm => {
    const relatedKeywords = Array.from(ungroupedKeywords).filter(keyword => 
      keyword.includes(coreTerm)
    );
    
    if (relatedKeywords.length >= 3) { // Minimum group size
      groups.push({
        name: `${capitalizeFirst(coreTerm)} Keywords`,
        keywords: relatedKeywords,
        relevance: 'related',
        priority: 2
      });
      relatedKeywords.forEach(k => ungroupedKeywords.delete(k));
    }
  });
  
  // 3. Cluster remaining keywords by n-gram similarity
  const clusters = clusterBySimilarity(Array.from(ungroupedKeywords));
  clusters.forEach((cluster, index) => {
    if (cluster.length >= 3) {
      const commonTerms = findCommonTerms(cluster);
      const groupName = commonTerms.length > 0 
        ? `${capitalizeFirst(commonTerms[0])} Related`
        : `Topic Group ${index + 1}`;
        
      groups.push({
        name: groupName,
        keywords: cluster,
        relevance: 'wider',
        priority: 3
      });
      cluster.forEach(k => ungroupedKeywords.delete(k));
    }
  });
  
  // 4. Remaining keywords as "Other"
  if (ungroupedKeywords.size > 0) {
    groups.push({
      name: 'Other Keywords',
      keywords: Array.from(ungroupedKeywords),
      relevance: 'wider',
      priority: 4
    });
  }
  
  return groups.sort((a, b) => a.priority - b.priority);
}

/**
 * Extract term frequency from keywords
 */
function extractTermFrequency(keywords: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  
  keywords.forEach(keyword => {
    const terms = keyword.split(/\s+/)
      .filter(term => term.length > 2) // Skip short words
      .filter(term => !isStopWord(term));
      
    terms.forEach(term => {
      frequency.set(term, (frequency.get(term) || 0) + 1);
    });
  });
  
  return frequency;
}

/**
 * Identify core terms that appear frequently
 */
function identifyCoreTerms(frequency: Map<string, number>, totalKeywords: number): Set<string> {
  const coreTerms = new Set<string>();
  const threshold = Math.max(3, totalKeywords * 0.1); // At least 10% of keywords
  
  frequency.forEach((count, term) => {
    if (count >= threshold) {
      coreTerms.add(term);
    }
  });
  
  return coreTerms;
}

/**
 * Cluster keywords by similarity using n-grams
 */
function clusterBySimilarity(keywords: string[]): string[][] {
  const clusters: string[][] = [];
  const used = new Set<string>();
  
  keywords.forEach(keyword => {
    if (used.has(keyword)) return;
    
    const cluster = [keyword];
    used.add(keyword);
    
    // Find similar keywords
    keywords.forEach(otherKeyword => {
      if (!used.has(otherKeyword) && calculateSimilarity(keyword, otherKeyword) > 0.4) {
        cluster.push(otherKeyword);
        used.add(otherKeyword);
      }
    });
    
    clusters.push(cluster);
  });
  
  return clusters;
}

/**
 * Calculate similarity between two keywords
 */
function calculateSimilarity(keyword1: string, keyword2: string): number {
  const terms1 = new Set(keyword1.split(/\s+/));
  const terms2 = new Set(keyword2.split(/\s+/));
  
  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Find common terms in a cluster of keywords
 */
function findCommonTerms(keywords: string[]): string[] {
  if (keywords.length === 0) return [];
  
  const termCounts = new Map<string, number>();
  
  keywords.forEach(keyword => {
    keyword.split(/\s+/).forEach(term => {
      if (term.length > 2 && !isStopWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    });
  });
  
  return Array.from(termCounts.entries())
    .filter(([_, count]) => count >= keywords.length * 0.5) // Term appears in 50%+ of keywords
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
    'that', 'the', 'to', 'was', 'will', 'with', 'or', 'but'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate Ahrefs URLs for keyword groups
 */
export function generateGroupedAhrefsUrls(
  domain: string, 
  groups: KeywordGroup[],
  positionRange: string = '1-50'
): Array<{ name: string; url: string; relevance: string; keywordCount: number }> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const targetUrl = `https://${cleanDomain}/`;
  
  return groups.map(group => {
    const keywords = group.keywords.slice(0, 50); // Max 50 per URL
    const cleanKeywords = keywords.join(', ');
    const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
    const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
    
    const positionsParam = positionRange !== '1-100' ? `&positions=${positionRange}` : '';
    
    let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
    url += `&keywordRules=${keywordRulesEncoded}`;
    url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
    url += `&target=${encodeURIComponent(targetUrl)}`;
    url += `&urlRules=&volume_type=average`;
    
    return {
      name: group.name,
      url,
      relevance: group.relevance,
      keywordCount: group.keywords.length
    };
  });
}