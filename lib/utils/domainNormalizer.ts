/**
 * Centralized domain normalization utility
 * Ensures consistent domain handling across the entire application
 */

export interface NormalizedDomain {
  domain: string;           // The normalized domain (e.g., "example.com")
  subdomain: string | null; // Extracted subdomain if meaningful (e.g., "blog")
  isWww: boolean;          // Whether it was www subdomain
  protocol: string | null;  // Original protocol if provided
  path: string | null;      // Path if provided (for future use)
  original: string;         // Original input for reference
}

/**
 * List of subdomains that should be removed during normalization
 * These are considered non-meaningful for domain identity
 */
const REMOVABLE_SUBDOMAINS = ['www', 'www1', 'www2', 'www3', 'www4'];

/**
 * List of subdomains that indicate a distinct service/property
 * These should be preserved as they represent different websites
 */
const MEANINGFUL_SUBDOMAINS = [
  'blog', 'shop', 'store', 'app', 'api', 'admin', 'portal',
  'help', 'support', 'docs', 'documentation', 'forum', 'community',
  'news', 'events', 'careers', 'jobs', 'investor', 'ir',
  // Country/language specific
  'uk', 'us', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'cn',
  // Environment specific (should probably be filtered in production)
  'staging', 'stage', 'dev', 'development', 'test', 'demo'
];

/**
 * Normalize a domain for consistent storage and comparison
 * 
 * @param input - The domain/URL to normalize
 * @returns NormalizedDomain object with parsed components
 * 
 * @example
 * normalizeDomain('https://www.example.com') 
 * // { domain: 'example.com', subdomain: null, isWww: true, ... }
 * 
 * normalizeDomain('blog.example.com')
 * // { domain: 'blog.example.com', subdomain: 'blog', isWww: false, ... }
 */
export function normalizeDomain(input: string): NormalizedDomain {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid domain input');
  }

  const original = input.trim();
  
  // Remove protocol if present
  let protocol: string | null = null;
  let workingUrl = original;
  
  const protocolMatch = workingUrl.match(/^(https?:\/\/)/i);
  if (protocolMatch) {
    protocol = protocolMatch[1].toLowerCase();
    workingUrl = workingUrl.substring(protocol.length);
  }
  
  // Remove trailing slashes and paths (store path for future use)
  let path: string | null = null;
  const pathIndex = workingUrl.indexOf('/');
  if (pathIndex !== -1) {
    path = workingUrl.substring(pathIndex);
    workingUrl = workingUrl.substring(0, pathIndex);
  }
  
  // Remove port if present
  const portIndex = workingUrl.lastIndexOf(':');
  if (portIndex !== -1) {
    // Check if it's actually a port (comes after the last dot)
    const lastDotIndex = workingUrl.lastIndexOf('.');
    if (portIndex > lastDotIndex) {
      workingUrl = workingUrl.substring(0, portIndex);
    }
  }
  
  // Convert to lowercase for consistency
  workingUrl = workingUrl.toLowerCase();
  
  // Validate basic domain structure
  if (!workingUrl.includes('.')) {
    throw new Error(`Invalid domain format: ${original}`);
  }
  
  // Split into parts
  const parts = workingUrl.split('.');
  
  // Check for subdomain
  let subdomain: string | null = null;
  let isWww = false;
  let domain = workingUrl;
  
  // If we have more than 2 parts, we might have a subdomain
  if (parts.length > 2) {
    const possibleSubdomain = parts[0];
    
    if (REMOVABLE_SUBDOMAINS.includes(possibleSubdomain)) {
      // Remove www and similar subdomains
      isWww = possibleSubdomain === 'www';
      domain = parts.slice(1).join('.');
    } else if (MEANINGFUL_SUBDOMAINS.includes(possibleSubdomain)) {
      // Keep meaningful subdomains
      subdomain = possibleSubdomain;
      domain = workingUrl; // Keep the full domain with subdomain
    } else {
      // For unknown subdomains, keep them (safer default)
      subdomain = possibleSubdomain;
      domain = workingUrl;
    }
  }
  
  // Final validation
  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain after normalization: ${domain}`);
  }
  
  return {
    domain,
    subdomain,
    isWww,
    protocol,
    path,
    original
  };
}

/**
 * Validate if a string is a valid domain
 */
function isValidDomain(domain: string): boolean {
  // Basic validation - can be expanded
  const domainRegex = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain);
}

/**
 * Check if two domains are equivalent after normalization
 */
export function areDomainsEquivalent(domain1: string, domain2: string): boolean {
  try {
    const normalized1 = normalizeDomain(domain1);
    const normalized2 = normalizeDomain(domain2);
    
    // For now, just compare normalized domains
    // Could be expanded to handle subdomain logic differently
    return normalized1.domain === normalized2.domain;
  } catch {
    return false;
  }
}

/**
 * Extract root domain (without any subdomains)
 * Useful for grouping related properties
 */
export function getRootDomain(input: string): string {
  const normalized = normalizeDomain(input);
  const parts = normalized.domain.split('.');
  
  // Handle special cases like co.uk, com.au, etc.
  const twoPartTlds = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br'];
  const lastTwoParts = parts.slice(-2).join('.');
  
  if (twoPartTlds.includes(lastTwoParts) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  
  // Standard TLDs
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  
  return normalized.domain;
}

/**
 * Format domain for display (preserves meaningful subdomains)
 */
export function formatDomainForDisplay(input: string): string {
  try {
    const normalized = normalizeDomain(input);
    return normalized.domain;
  } catch {
    // If normalization fails, return cleaned input
    return input.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  }
}

/**
 * Batch normalize domains with error handling
 */
export function batchNormalizeDomains(inputs: string[]): Array<{
  input: string;
  normalized: NormalizedDomain | null;
  error: string | null;
}> {
  return inputs.map(input => {
    try {
      return {
        input,
        normalized: normalizeDomain(input),
        error: null
      };
    } catch (error) {
      return {
        input,
        normalized: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

/**
 * Find duplicate domains in a list (after normalization)
 */
export function findDuplicateDomains(inputs: string[]): Map<string, string[]> {
  const domainMap = new Map<string, string[]>();
  
  for (const input of inputs) {
    try {
      const normalized = normalizeDomain(input);
      const existing = domainMap.get(normalized.domain) || [];
      existing.push(input);
      domainMap.set(normalized.domain, existing);
    } catch {
      // Skip invalid domains
    }
  }
  
  // Filter to only keep duplicates
  const duplicates = new Map<string, string[]>();
  for (const [domain, originals] of domainMap.entries()) {
    if (originals.length > 1) {
      duplicates.set(domain, originals);
    }
  }
  
  return duplicates;
}