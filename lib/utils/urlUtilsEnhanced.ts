/**
 * Enhanced URL normalization utilities
 * Provides better handling of subdomains and edge cases
 */

// Common subdomains that should be removed for normalization
const REMOVABLE_SUBDOMAINS = new Set([
  'www',
  'www1',
  'www2',
  'www3',
  'www4',
  'ww1',
  'ww2',
  'ww3',
  'm',  // mobile
  'mobile',
  'amp',
]);

// Subdomains that indicate different content/services (should be preserved)
const MEANINGFUL_SUBDOMAINS = new Set([
  'blog',
  'shop',
  'store',
  'app',
  'api',
  'docs',
  'help',
  'support',
  'news',
  'forum',
  'community',
  'mail',
  'email',
  'cdn',
  'images',
  'static',
  'assets',
  'admin',
  'dashboard',
  'portal',
  'my',
  'account',
  'secure',
  'pay',
  'checkout',
]);

/**
 * Enhanced URL normalization with better subdomain handling
 */
export function normalizeUrlEnhanced(url: string, options?: {
  removeAllSubdomains?: boolean;
  preserveMeaningfulSubdomains?: boolean;
  customRemovableSubdomains?: string[];
}): string {
  try {
    const urlObj = new URL(url);
    
    // Force HTTPS
    urlObj.protocol = 'https:';
    
    // Handle subdomains based on options
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    if (parts.length > 2) {
      // Has subdomains
      const subdomain = parts[0].toLowerCase();
      
      if (options?.removeAllSubdomains) {
        // Remove all subdomains, keep only domain + TLD
        urlObj.hostname = parts.slice(-2).join('.');
      } else if (options?.preserveMeaningfulSubdomains === false || REMOVABLE_SUBDOMAINS.has(subdomain)) {
        // Remove common/meaningless subdomains
        urlObj.hostname = parts.slice(1).join('.');
      } else if (options?.customRemovableSubdomains?.includes(subdomain)) {
        // Remove custom specified subdomains
        urlObj.hostname = parts.slice(1).join('.');
      }
      // Otherwise, preserve the subdomain
    }
    
    // Normalize trailing slash
    if (urlObj.pathname !== '/') {
      urlObj.pathname = urlObj.pathname.replace(/\/$/, '');
    }
    
    return urlObj.toString();
  } catch {
    // Return original if invalid URL
    return url;
  }
}

/**
 * Get root domain (removes ALL subdomains)
 * Useful for grouping all subdomains under one parent
 * 
 * Examples:
 * - blog.example.com → example.com
 * - app.staging.example.co.uk → example.co.uk
 * - subdomain.example.com → example.com
 */
export function getRootDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    // Handle special TLDs (.co.uk, .com.au, etc.)
    // This is a simplified approach - for production, consider using a library like psl (Public Suffix List)
    const tldPatterns = [
      /\.co\.[a-z]{2}$/,    // .co.uk, .co.jp
      /\.com\.[a-z]{2}$/,   // .com.au, .com.br
      /\.org\.[a-z]{2}$/,   // .org.uk
      /\.net\.[a-z]{2}$/,   // .net.au
      /\.gov\.[a-z]{2}$/,   // .gov.uk
      /\.ac\.[a-z]{2}$/,    // .ac.uk (academic)
      /\.edu\.[a-z]{2}$/,   // .edu.au
    ];
    
    // Check if hostname matches any special TLD pattern
    const hasSpecialTLD = tldPatterns.some(pattern => pattern.test(hostname));
    
    if (hasSpecialTLD && parts.length > 3) {
      // Keep last 3 parts for special TLDs (domain.co.uk)
      return parts.slice(-3).join('.');
    } else if (parts.length > 2) {
      // Keep last 2 parts for regular TLDs (domain.com)
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  } catch {
    return url;
  }
}

/**
 * Compare URLs with different normalization strategies
 * Useful for finding duplicates with various subdomain configurations
 */
export function areUrlsRelated(url1: string, url2: string, strategy: 'exact' | 'ignore-subdomains' | 'root-domain' = 'exact'): boolean {
  switch (strategy) {
    case 'exact':
      // Current behavior - only removes www
      return normalizeUrlEnhanced(url1) === normalizeUrlEnhanced(url2);
    
    case 'ignore-subdomains':
      // Remove all subdomains for comparison
      return normalizeUrlEnhanced(url1, { removeAllSubdomains: true }) === 
             normalizeUrlEnhanced(url2, { removeAllSubdomains: true });
    
    case 'root-domain':
      // Compare only root domains
      return getRootDomain(url1) === getRootDomain(url2);
    
    default:
      return false;
  }
}

/**
 * Group URLs by their root domain
 * Useful for organizing URLs from the same organization
 */
export function groupUrlsByRootDomain(urls: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  
  for (const url of urls) {
    const rootDomain = getRootDomain(url);
    const existing = groups.get(rootDomain) || [];
    existing.push(url);
    groups.set(rootDomain, existing);
  }
  
  return groups;
}

// Export the standard normalization function for backward compatibility
export function normalizeUrl(url: string): string {
  return normalizeUrlEnhanced(url);
}