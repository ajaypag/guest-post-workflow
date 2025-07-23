/**
 * Utility functions for grouping keywords by topical relevance
 * Optimized for practical Ahrefs button usage (max 80 keywords per group)
 */

interface KeywordGroup {
  name: string;
  keywords: string[];
  relevance: 'core' | 'related' | 'wider';
  priority: number;
}

const MAX_KEYWORDS_PER_GROUP = 80;
const MIN_KEYWORDS_PER_GROUP = 30; // Avoid tiny groups that waste clicks

/**
 * Group keywords by topical relevance optimized for Ahrefs buttons
 */
export function groupKeywordsByTopic(keywords: string[]): KeywordGroup[] {
  if (!keywords || keywords.length === 0) return [];
  
  // Clean and normalize keywords
  const cleanKeywords = keywords.map(k => k.trim().toLowerCase());
  const totalKeywords = cleanKeywords.length;
  
  // Calculate optimal number of groups
  const optimalGroupCount = Math.ceil(totalKeywords / MAX_KEYWORDS_PER_GROUP);
  const targetGroupSize = Math.ceil(totalKeywords / optimalGroupCount);
  
  // Extract common terms and their frequencies
  const termFrequency = extractTermFrequency(cleanKeywords);
  
  // Identify core terms (appear in many keywords)
  const coreTerms = identifyCoreTerms(termFrequency, cleanKeywords.length);
  
  // Initial grouping by themes
  const thematicGroups = createThematicGroups(cleanKeywords, coreTerms, termFrequency);
  
  // Optimize groups for button usage
  const optimizedGroups = optimizeGroupSizes(thematicGroups, targetGroupSize);
  
  return optimizedGroups;
}

/**
 * Create initial thematic groups based on shared terms
 */
function createThematicGroups(
  keywords: string[], 
  coreTerms: Set<string>,
  termFrequency: Map<string, number>
): Map<string, { keywords: string[], theme: string, priority: number }> {
  const groups = new Map<string, { keywords: string[], theme: string, priority: number }>();
  const ungrouped = new Set(keywords);
  
  // First pass: Group by core terms
  coreTerms.forEach(coreTerm => {
    const termKeywords = keywords.filter(k => k.includes(coreTerm));
    if (termKeywords.length > 0) {
      groups.set(coreTerm, {
        keywords: termKeywords,
        theme: capitalizeFirst(coreTerm),
        priority: 1
      });
      termKeywords.forEach(k => ungrouped.delete(k));
    }
  });
  
  // Second pass: Find secondary themes from remaining keywords
  const secondaryTerms = extractSecondaryThemes(Array.from(ungrouped), termFrequency);
  
  secondaryTerms.forEach(term => {
    const termKeywords = Array.from(ungrouped).filter(k => k.includes(term));
    if (termKeywords.length >= 5) { // Only create groups with meaningful size
      groups.set(term, {
        keywords: termKeywords,
        theme: capitalizeFirst(term),
        priority: 2
      });
      termKeywords.forEach(k => ungrouped.delete(k));
    }
  });
  
  // Add remaining keywords to a misc group
  if (ungrouped.size > 0) {
    groups.set('other', {
      keywords: Array.from(ungrouped),
      theme: 'Other',
      priority: 3
    });
  }
  
  return groups;
}

/**
 * Extract secondary theme terms (not core but still meaningful)
 */
function extractSecondaryThemes(keywords: string[], termFrequency: Map<string, number>): string[] {
  // Get terms that appear in at least 5% of remaining keywords
  const threshold = Math.max(2, keywords.length * 0.05);
  
  return Array.from(termFrequency.entries())
    .filter(([term, count]) => count >= threshold && term.length > 3)
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, 10); // Limit to top 10 secondary themes
}

/**
 * Optimize group sizes for practical button usage
 */
function optimizeGroupSizes(
  thematicGroups: Map<string, { keywords: string[], theme: string, priority: number }>,
  targetSize: number
): KeywordGroup[] {
  const groups = Array.from(thematicGroups.values()).sort((a, b) => {
    // Sort by priority first, then by size
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.keywords.length - a.keywords.length;
  });
  
  const finalGroups: KeywordGroup[] = [];
  let pendingGroup: { name: string; keywords: string[]; themes: string[] } | null = null;
  
  for (const group of groups) {
    // If this group is already close to optimal size, keep it as is
    if (group.keywords.length >= MIN_KEYWORDS_PER_GROUP && group.keywords.length <= MAX_KEYWORDS_PER_GROUP) {
      finalGroups.push({
        name: `${group.theme} Keywords`,
        keywords: group.keywords,
        relevance: group.priority === 1 ? 'core' : group.priority === 2 ? 'related' : 'wider',
        priority: group.priority
      });
      continue;
    }
    
    // If group is too large, split it
    if (group.keywords.length > MAX_KEYWORDS_PER_GROUP) {
      const chunks = Math.ceil(group.keywords.length / MAX_KEYWORDS_PER_GROUP);
      const chunkSize = Math.ceil(group.keywords.length / chunks);
      
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunkKeywords = group.keywords.slice(start, end);
        
        finalGroups.push({
          name: chunks > 1 ? `${group.theme} Keywords ${i + 1}` : `${group.theme} Keywords`,
          keywords: chunkKeywords,
          relevance: group.priority === 1 ? 'core' : group.priority === 2 ? 'related' : 'wider',
          priority: group.priority
        });
      }
      continue;
    }
    
    // Group is too small - try to merge with pending group or save for later
    if (!pendingGroup) {
      pendingGroup = {
        name: group.theme,
        keywords: [...group.keywords],
        themes: [group.theme]
      };
    } else {
      // Merge with pending group
      pendingGroup.keywords.push(...group.keywords);
      pendingGroup.themes.push(group.theme);
      
      // Check if merged group is now big enough
      if (pendingGroup.keywords.length >= MIN_KEYWORDS_PER_GROUP) {
        const mergedName = pendingGroup.themes.length > 2 
          ? `Mixed Keywords (${pendingGroup.themes.slice(0, 2).join(', ')}, etc.)`
          : pendingGroup.themes.join(' & ') + ' Keywords';
          
        finalGroups.push({
          name: mergedName,
          keywords: pendingGroup.keywords.slice(0, MAX_KEYWORDS_PER_GROUP),
          relevance: 'related',
          priority: 2
        });
        
        // Handle overflow if any
        if (pendingGroup.keywords.length > MAX_KEYWORDS_PER_GROUP) {
          pendingGroup = {
            name: 'Mixed',
            keywords: pendingGroup.keywords.slice(MAX_KEYWORDS_PER_GROUP),
            themes: ['Various']
          };
        } else {
          pendingGroup = null;
        }
      }
    }
  }
  
  // Handle any remaining pending group
  if (pendingGroup && pendingGroup.keywords.length > 0) {
    const groupName = pendingGroup.themes.length > 1 
      ? `Other Keywords (${pendingGroup.themes.join(', ')})`
      : `${pendingGroup.name} Keywords`;
      
    finalGroups.push({
      name: groupName,
      keywords: pendingGroup.keywords,
      relevance: 'wider',
      priority: 3
    });
  }
  
  // Final pass: If we still have many small groups, consolidate further
  const smallGroups = finalGroups.filter(g => g.keywords.length < MIN_KEYWORDS_PER_GROUP);
  if (smallGroups.length > 2) {
    // Remove small groups from final list
    const consolidatedKeywords: string[] = [];
    smallGroups.forEach(g => {
      consolidatedKeywords.push(...g.keywords);
      const index = finalGroups.indexOf(g);
      if (index > -1) finalGroups.splice(index, 1);
    });
    
    // Add consolidated group
    if (consolidatedKeywords.length > 0) {
      const chunks = Math.ceil(consolidatedKeywords.length / MAX_KEYWORDS_PER_GROUP);
      for (let i = 0; i < chunks; i++) {
        const start = i * MAX_KEYWORDS_PER_GROUP;
        const end = start + MAX_KEYWORDS_PER_GROUP;
        finalGroups.push({
          name: chunks > 1 ? `Additional Keywords ${i + 1}` : 'Additional Keywords',
          keywords: consolidatedKeywords.slice(start, end),
          relevance: 'wider',
          priority: 4
        });
      }
    }
  }
  
  return finalGroups.sort((a, b) => a.priority - b.priority);
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
 * Note: Ahrefs has a URL length limit, so we limit to 50 keywords per URL
 */
export function generateGroupedAhrefsUrls(
  domain: string, 
  groups: KeywordGroup[],
  positionRange: string = '1-50'
): Array<{ name: string; url: string; relevance: string; keywordCount: number }> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const targetUrl = `https://${cleanDomain}/`;
  
  const results: Array<{ name: string; url: string; relevance: string; keywordCount: number }> = [];
  
  groups.forEach(group => {
    // If group has more than 50 keywords, we need to split it for Ahrefs URL limits
    const maxKeywordsPerUrl = 50;
    const chunks = Math.ceil(group.keywords.length / maxKeywordsPerUrl);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * maxKeywordsPerUrl;
      const keywords = group.keywords.slice(start, start + maxKeywordsPerUrl);
      const cleanKeywords = keywords.join(', ');
      const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
      const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
      
      const positionsParam = positionRange !== '1-100' ? `&positions=${positionRange}` : '';
      
      let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
      url += `&keywordRules=${keywordRulesEncoded}`;
      url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
      url += `&target=${encodeURIComponent(targetUrl)}`;
      url += `&urlRules=&volume_type=average`;
      
      const buttonName = chunks > 1 
        ? `${group.name} (${i + 1}/${chunks})` 
        : group.name;
      
      results.push({
        name: buttonName,
        url,
        relevance: group.relevance,
        keywordCount: keywords.length
      });
    }
  });
  
  return results;
}