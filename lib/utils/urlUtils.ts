/**
 * URL normalization utilities
 * Provides consistent URL handling across the application
 */

/**
 * Normalize a URL for duplicate checking and AI matching
 * Rules:
 * - Force HTTPS protocol
 * - Remove www prefix from hostname
 * - Normalize trailing slash (remove unless root path)
 * - Preserve query parameters and hash
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Force HTTPS
    urlObj.protocol = 'https:';
    
    // Remove www prefix
    urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
    
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
 * Extract normalized domain from URL
 * Used for domain-based grouping and matching
 */
export function extractNormalizedDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    // Try to extract domain from string if URL parsing fails
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    return match ? match[1].replace(/^www\./, '') : url;
  }
}

/**
 * Check if two URLs are equivalent after normalization
 */
export function urlsEqual(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Batch normalize URLs
 * Useful for processing multiple URLs at once
 */
export function normalizeUrls(urls: string[]): { url: string; normalized: string }[] {
  return urls.map(url => ({
    url,
    normalized: normalizeUrl(url)
  }));
}