/**
 * Improved keyword grouping utility for better button naming and ordering
 * Optimized for practical Ahrefs button usage with clearer naming
 */

interface KeywordGroup {
  name: string;
  keywords: string[];
  relevance: 'core' | 'related' | 'wider';
  priority: number;
}

const MAX_KEYWORDS_PER_GROUP = 50; // Ahrefs URL limit
const MIN_KEYWORDS_FOR_STANDALONE_GROUP = 15; // Minimum to justify its own button
const IDEAL_GROUP_SIZE = 40; // Target size for balanced groups

/**
 * Group keywords by topical relevance with improved naming and ordering
 */
export function groupKeywordsByTopic(keywords: string[]): KeywordGroup[] {
  if (!keywords || keywords.length === 0) return [];
  
  // Clean and normalize keywords
  const cleanKeywords = keywords.map(k => k.trim().toLowerCase());
  
  // Extract term frequencies
  const termFrequency = extractTermFrequency(cleanKeywords);
  
  // Identify theme terms (not just high frequency, but meaningful terms)
  const themeTerms = identifyThemeTerms(termFrequency, cleanKeywords);
  
  // Create initial thematic groups
  const thematicGroups = createThematicGroups(cleanKeywords, themeTerms);
  
  // Optimize and finalize groups
  const finalGroups = optimizeAndNameGroups(thematicGroups);
  
  return finalGroups;
}

/**
 * Extract meaningful theme terms from keywords
 */
function identifyThemeTerms(
  frequency: Map<string, number>, 
  keywords: string[]
): Map<string, { count: number; isCore: boolean }> {
  const themes = new Map<string, { count: number; isCore: boolean }>();
  
  // Calculate thresholds
  const coreThreshold = Math.max(5, keywords.length * 0.15); // 15% for core terms
  const relatedThreshold = Math.max(3, keywords.length * 0.05); // 5% for related terms
  
  frequency.forEach((count, term) => {
    // Skip very common words and single letters
    if (term.length <= 2 || isStopWord(term)) return;
    
    if (count >= coreThreshold) {
      themes.set(term, { count, isCore: true });
    } else if (count >= relatedThreshold) {
      themes.set(term, { count, isCore: false });
    }
  });
  
  // Also identify compound themes (e.g., "credit card")
  const compoundThemes = identifyCompoundThemes(keywords, relatedThreshold);
  compoundThemes.forEach((count, theme) => {
    themes.set(theme, { count, isCore: count >= coreThreshold });
  });
  
  return themes;
}

/**
 * Identify compound themes like "credit card" or "business loan"
 */
function identifyCompoundThemes(keywords: string[], threshold: number): Map<string, number> {
  const compounds = new Map<string, number>();
  
  keywords.forEach(keyword => {
    const words = keyword.split(/\s+/);
    
    // Look for 2-word combinations
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length > 2 && words[i + 1].length > 2) {
        const compound = `${words[i]} ${words[i + 1]}`;
        compounds.set(compound, (compounds.get(compound) || 0) + 1);
      }
    }
  });
  
  // Filter by threshold
  const meaningful = new Map<string, number>();
  compounds.forEach((count, compound) => {
    if (count >= threshold && !compound.split(' ').some(isStopWord)) {
      meaningful.set(compound, count);
    }
  });
  
  return meaningful;
}

/**
 * Create initial thematic groups
 */
function createThematicGroups(
  keywords: string[],
  themes: Map<string, { count: number; isCore: boolean }>
): Map<string, { keywords: string[]; isCore: boolean; themeCount: number }> {
  const groups = new Map<string, { keywords: string[]; isCore: boolean; themeCount: number }>();
  const ungroupedKeywords = new Set(keywords);
  
  // Sort themes by importance (core first, then by count)
  const sortedThemes = Array.from(themes.entries()).sort((a, b) => {
    if (a[1].isCore !== b[1].isCore) return b[1].isCore ? 1 : -1;
    return b[1].count - a[1].count;
  });
  
  // Create groups for each theme
  sortedThemes.forEach(([theme, { count, isCore }]) => {
    const matchingKeywords = keywords.filter(k => {
      // Match whole words to avoid partial matches
      const regex = new RegExp(`\\b${theme}\\b`, 'i');
      return regex.test(k);
    });
    
    if (matchingKeywords.length >= 3) { // Need at least 3 keywords to form a group
      groups.set(theme, {
        keywords: matchingKeywords,
        isCore,
        themeCount: count
      });
      
      // Remove from ungrouped
      matchingKeywords.forEach(k => ungroupedKeywords.delete(k));
    }
  });
  
  // Add ungrouped keywords
  if (ungroupedKeywords.size > 0) {
    groups.set('_ungrouped', {
      keywords: Array.from(ungroupedKeywords),
      isCore: false,
      themeCount: 0
    });
  }
  
  return groups;
}

/**
 * Optimize groups and create final naming
 */
function optimizeAndNameGroups(
  thematicGroups: Map<string, { keywords: string[]; isCore: boolean; themeCount: number }>
): KeywordGroup[] {
  const finalGroups: KeywordGroup[] = [];
  const smallGroups: { theme: string; keywords: string[]; isCore: boolean }[] = [];
  
  // Process each thematic group
  Array.from(thematicGroups.entries()).forEach(([theme, data]) => {
    if (theme === '_ungrouped') return; // Handle separately at the end
    
    const { keywords, isCore } = data;
    
    // Large groups need to be split
    if (keywords.length > MAX_KEYWORDS_PER_GROUP) {
      const chunks = Math.ceil(keywords.length / IDEAL_GROUP_SIZE);
      const chunkSize = Math.ceil(keywords.length / chunks);
      
      for (let i = 0; i < chunks; i++) {
        const chunkKeywords = keywords.slice(i * chunkSize, (i + 1) * chunkSize);
        const themeName = formatThemeName(theme);
        
        finalGroups.push({
          name: chunks > 1 ? `${themeName} Keywords (Part ${i + 1})` : `${themeName} Keywords`,
          keywords: chunkKeywords,
          relevance: isCore ? 'core' : 'related',
          priority: isCore ? 1 : 2
        });
      }
    } 
    // Groups that are large enough to stand alone
    else if (keywords.length >= MIN_KEYWORDS_FOR_STANDALONE_GROUP) {
      finalGroups.push({
        name: `${formatThemeName(theme)} Keywords`,
        keywords,
        relevance: isCore ? 'core' : 'related',
        priority: isCore ? 1 : 2
      });
    } 
    // Small groups to be combined later
    else {
      smallGroups.push({ theme, keywords, isCore });
    }
  });
  
  // Handle ungrouped keywords
  const ungrouped = thematicGroups.get('_ungrouped');
  if (ungrouped) {
    smallGroups.push({ 
      theme: '_ungrouped', 
      keywords: ungrouped.keywords, 
      isCore: false 
    });
  }
  
  // Combine small groups intelligently
  if (smallGroups.length > 0) {
    const combinedGroups = combineSmallGroups(smallGroups);
    finalGroups.push(...combinedGroups);
  }
  
  // Sort by priority and name
  return finalGroups.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Combine small groups into larger, well-named groups
 */
function combineSmallGroups(
  smallGroups: { theme: string; keywords: string[]; isCore: boolean }[]
): KeywordGroup[] {
  const result: KeywordGroup[] = [];
  
  // Sort by theme quality (named themes before ungrouped)
  smallGroups.sort((a, b) => {
    if (a.theme === '_ungrouped') return 1;
    if (b.theme === '_ungrouped') return -1;
    return b.keywords.length - a.keywords.length;
  });
  
  let currentGroup: { themes: string[]; keywords: string[]; isCore: boolean } | null = null;
  
  for (const group of smallGroups) {
    if (!currentGroup) {
      currentGroup = {
        themes: group.theme === '_ungrouped' ? [] : [group.theme],
        keywords: [...group.keywords],
        isCore: group.isCore
      };
      continue;
    }
    
    // Check if adding this group would exceed the limit
    if (currentGroup.keywords.length + group.keywords.length <= MAX_KEYWORDS_PER_GROUP) {
      // Add to current group
      if (group.theme !== '_ungrouped') {
        currentGroup.themes.push(group.theme);
      }
      currentGroup.keywords.push(...group.keywords);
      currentGroup.isCore = currentGroup.isCore || group.isCore;
    } else {
      // Finalize current group and start a new one
      result.push(createGroupFromCombined(currentGroup));
      
      currentGroup = {
        themes: group.theme === '_ungrouped' ? [] : [group.theme],
        keywords: [...group.keywords],
        isCore: group.isCore
      };
    }
  }
  
  // Don't forget the last group
  if (currentGroup && currentGroup.keywords.length > 0) {
    result.push(createGroupFromCombined(currentGroup));
  }
  
  return result;
}

/**
 * Create a well-named group from combined themes
 */
function createGroupFromCombined(
  combined: { themes: string[]; keywords: string[]; isCore: boolean }
): KeywordGroup {
  let name: string;
  
  if (combined.themes.length === 0) {
    name = 'Other Keywords';
  } else if (combined.themes.length === 1) {
    name = `${formatThemeName(combined.themes[0])} Keywords`;
  } else if (combined.themes.length === 2) {
    name = `${formatThemeName(combined.themes[0])} & ${formatThemeName(combined.themes[1])} Keywords`;
  } else {
    // For many themes, list the most important ones
    const mainThemes = combined.themes.slice(0, 2).map(formatThemeName);
    name = `Mixed Keywords (${mainThemes.join(', ')})`;
  }
  
  return {
    name,
    keywords: combined.keywords,
    relevance: combined.isCore ? 'related' : 'wider',
    priority: combined.isCore ? 2 : 3
  };
}

/**
 * Format theme name for display
 */
function formatThemeName(theme: string): string {
  return theme
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract term frequency from keywords
 */
function extractTermFrequency(keywords: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  
  keywords.forEach(keyword => {
    const terms = keyword.split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !isStopWord(term));
      
    terms.forEach(term => {
      frequency.set(term, (frequency.get(term) || 0) + 1);
    });
  });
  
  return frequency;
}

/**
 * Check if a word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
    'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
    'that', 'the', 'to', 'was', 'will', 'with', 'or', 'but',
    'your', 'you', 'our', 'we', 'their', 'they', 'this', 'these',
    'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * Generate Ahrefs URLs for keyword groups
 * Uses 50 keyword limit per URL for Ahrefs
 */
export function generateGroupedAhrefsUrls(
  domain: string, 
  groups: KeywordGroup[],
  positionRange: string = '1-50'
): Array<{ name: string; url: string; relevance: string; keywordCount: number }> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const targetUrl = `https://${cleanDomain}/`;
  
  return groups.map(group => {
    // Ensure we don't exceed Ahrefs limit
    const keywords = group.keywords.slice(0, MAX_KEYWORDS_PER_GROUP);
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
      name: `${group.name}\n${keywords.length} keywords`,
      url,
      relevance: group.relevance,
      keywordCount: keywords.length
    };
  });
}