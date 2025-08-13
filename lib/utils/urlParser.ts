/**
 * URL parsing utilities for consistent domain extraction
 */

/**
 * Extracts the root domain from a URL, handling subdomains and www
 * @param urlString - The URL to parse (with or without protocol)
 * @returns Object with parsed URL components
 */
interface ParsedUrl {
  isValid: boolean;
  fullUrl?: string;
  protocol?: string;
  hostname?: string;
  hostnameWithoutWww?: string;
  rootDomain?: string;
  brandName?: string;
  pathname?: string;
  isSubdomain?: boolean;
  originalInput: string;
  error?: string;
}

export function parseUrl(urlString: string): ParsedUrl {
  try {
    // Ensure the URL has a protocol
    let normalizedUrl = urlString.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    const url = new URL(normalizedUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Remove www. prefix if present
    const hostnameWithoutWww = hostname.replace(/^www\./i, '');
    
    // Extract root domain (handles subdomains)
    // Split by dots and take last 2 parts for most domains
    // This is simplified - a full solution would use a public suffix list
    const parts = hostnameWithoutWww.split('.');
    let rootDomain = hostnameWithoutWww;
    
    if (parts.length > 2) {
      // Check for common two-part TLDs (.co.uk, .com.au, etc)
      const lastTwo = parts.slice(-2).join('.');
      const commonTwoPartTlds = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'co.jp', 'co.in'];
      
      if (commonTwoPartTlds.includes(lastTwo)) {
        // Take last 3 parts for two-part TLD
        rootDomain = parts.slice(-3).join('.');
      } else {
        // Take last 2 parts for regular TLD
        rootDomain = parts.slice(-2).join('.');
      }
    }
    
    // Generate brand name from domain
    const brandName = rootDomain
      .split('.')[0] // Get the main part before TLD
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return {
      isValid: true,
      fullUrl: url.href,
      protocol: url.protocol,
      hostname: hostname,
      hostnameWithoutWww: hostnameWithoutWww,
      rootDomain: rootDomain,
      brandName: brandName,
      pathname: url.pathname,
      isSubdomain: hostnameWithoutWww !== rootDomain,
      originalInput: urlString
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
      originalInput: urlString
    };
  }
}

/**
 * Validates if a URL is properly formatted and accessible
 * @param urlString - The URL to validate
 * @returns Validation result with details
 */
export function validateUrl(urlString: string): { isValid: boolean; error?: string } {
  if (!urlString || urlString.trim().length === 0) {
    return { isValid: false, error: 'URL is required' };
  }
  
  const parsed = parseUrl(urlString);
  
  if (!parsed.isValid) {
    return { isValid: false, error: parsed.error };
  }
  
  // Check for localhost or private IPs
  const hostname = parsed.hostnameWithoutWww || '';
  if (hostname === 'localhost' || hostname.match(/^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
    return { isValid: false, error: 'Please enter a public website URL' };
  }
  
  // Check for valid TLD
  if (!hostname.includes('.')) {
    return { isValid: false, error: 'Please enter a complete domain (e.g., example.com)' };
  }
  
  // Check minimum domain length
  const domainParts = hostname.split('.');
  if (domainParts[0].length < 2) {
    return { isValid: false, error: 'Domain name is too short' };
  }
  
  return { isValid: true };
}

/**
 * Formats a URL for display (removes protocol, www, trailing slash)
 * @param urlString - The URL to format
 * @returns Formatted URL string
 */
export function formatUrlForDisplay(urlString: string): string {
  const parsed = parseUrl(urlString);
  if (!parsed.isValid) return urlString;
  
  let display = parsed.hostnameWithoutWww || '';
  if (parsed.pathname && parsed.pathname !== '/') {
    display += parsed.pathname;
  }
  
  // Remove trailing slash
  return display.replace(/\/$/, '');
}