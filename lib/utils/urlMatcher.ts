/**
 * URL Matcher Utility
 * Handles URL normalization and matching for bulk operations
 */

export interface UrlMatchResult {
  inputUrl: string;
  normalizedUrl: string;
  matchedPageId: string | null;
  matchedPageUrl: string | null;
  status: 'exact' | 'normalized' | 'not_found';
}

export interface TargetPage {
  id: string;
  url: string;
  domain: string;
  status: string;
}

/**
 * Normalize a URL for comparison
 * - Remove protocol (http/https)
 * - Remove www.
 * - Remove trailing slash
 * - Convert to lowercase
 * - Remove common query parameters
 */
export function normalizeUrl(url: string): string {
  try {
    let normalized = url.trim().toLowerCase();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    const urlObj = new URL(normalized);
    
    // Remove www.
    let hostname = urlObj.hostname.replace(/^www\./, '');
    
    // Remove common tracking parameters
    const commonParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'];
    commonParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Rebuild normalized URL
    let result = hostname + urlObj.pathname;
    
    // Remove trailing slash
    result = result.replace(/\/$/, '');
    
    // Add search params if any remain
    if (urlObj.searchParams.toString()) {
      result += '?' + urlObj.searchParams.toString();
    }
    
    return result;
  } catch (error) {
    // If URL parsing fails, just clean up basic issues
    return url.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }
}

/**
 * Match input URLs against existing target pages
 */
export function matchUrlsToPages(
  inputUrls: string[],
  targetPages: TargetPage[]
): UrlMatchResult[] {
  // Create lookup maps for efficient matching
  const exactMap = new Map<string, TargetPage>();
  const normalizedMap = new Map<string, TargetPage>();
  
  // Build lookup maps
  targetPages.forEach(page => {
    exactMap.set(page.url.toLowerCase(), page);
    normalizedMap.set(normalizeUrl(page.url), page);
  });
  
  // Match each input URL
  return inputUrls.map(inputUrl => {
    const trimmedInput = inputUrl.trim();
    if (!trimmedInput) {
      return {
        inputUrl,
        normalizedUrl: '',
        matchedPageId: null,
        matchedPageUrl: null,
        status: 'not_found' as const
      };
    }
    
    const normalizedInput = normalizeUrl(trimmedInput);
    
    // Try exact match first
    const exactMatch = exactMap.get(trimmedInput.toLowerCase());
    if (exactMatch) {
      return {
        inputUrl,
        normalizedUrl: normalizedInput,
        matchedPageId: exactMatch.id,
        matchedPageUrl: exactMatch.url,
        status: 'exact' as const
      };
    }
    
    // Try normalized match
    const normalizedMatch = normalizedMap.get(normalizedInput);
    if (normalizedMatch) {
      return {
        inputUrl,
        normalizedUrl: normalizedInput,
        matchedPageId: normalizedMatch.id,
        matchedPageUrl: normalizedMatch.url,
        status: 'normalized' as const
      };
    }
    
    // No match found
    return {
      inputUrl,
      normalizedUrl: normalizedInput,
      matchedPageId: null,
      matchedPageUrl: null,
      status: 'not_found' as const
    };
  });
}

/**
 * Parse URLs from text input (one per line)
 */
export function parseUrlsFromText(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#')) // Allow comments
    .slice(0, 1000); // Safety limit
}

/**
 * Get statistics for URL matching results
 */
export function getMatchingStats(results: UrlMatchResult[]) {
  const stats = {
    total: results.length,
    exact: results.filter(r => r.status === 'exact').length,
    normalized: results.filter(r => r.status === 'normalized').length,
    notFound: results.filter(r => r.status === 'not_found').length,
    matched: 0
  };
  
  stats.matched = stats.exact + stats.normalized;
  
  return stats;
}