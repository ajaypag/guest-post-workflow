import crypto from 'crypto';

/**
 * Creates an MD5 hash of a sorted array of strings.
 * Used for target page change detection in duplicate resolution.
 * 
 * @param arr Array of strings to hash (e.g., target page IDs)
 * @returns MD5 hash of sorted strings joined with '|', or empty string for empty/null arrays
 */
export function hashArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return '';
  return crypto.createHash('md5').update(arr.sort().join('|')).digest('hex');
}

/**
 * Determines if analysis data is stale and needs to be re-run.
 * Used to trigger re-analysis when target URLs change or data is old.
 * 
 * @param aiQualifiedAt Date when AI qualification was last completed
 * @returns true if analysis should be re-run (null date or older than 6 months)
 */
export function isAnalysisStale(aiQualifiedAt: Date | null): boolean {
  if (!aiQualifiedAt) return true;
  const STALE_THRESHOLD = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds
  return Date.now() - aiQualifiedAt.getTime() > STALE_THRESHOLD;
}

/**
 * Compares two target page ID arrays to detect if targets have changed.
 * Used to determine when duplicate resolution should trigger re-analysis.
 * 
 * @param existing Current target page IDs from database
 * @param incoming New target page IDs being added
 * @returns true if the target sets are different (triggers re-analysis)
 */
export function hasTargetUrlsChanged(existing: string[] | null, incoming: string[] | null): boolean {
  const existingHash = hashArray(existing || []);
  const incomingHash = hashArray(incoming || []);
  return existingHash !== incomingHash;
}

/**
 * Merges two arrays of target page IDs, removing duplicates.
 * Used in duplicate resolution when consolidating multiple target URLs per domain.
 * 
 * @param existing Current target page IDs 
 * @param incoming New target page IDs to merge
 * @returns Deduplicated array of all unique target page IDs
 */
export function mergeTargetPageIds(existing: string[] | null, incoming: string[] | null): string[] {
  const existingTargets = existing || [];
  const incomingTargets = incoming || [];
  return [...new Set([...existingTargets, ...incomingTargets])];
}

/**
 * Calculates the age of analysis data in days.
 * Used for displaying analysis staleness in duplicate resolution UI.
 * 
 * @param aiQualifiedAt Date when AI qualification was completed
 * @returns Number of days since analysis, or null if never analyzed
 */
export function getAnalysisAgeDays(aiQualifiedAt: Date | null): number | null {
  if (!aiQualifiedAt) return null;
  const diffMs = Date.now() - aiQualifiedAt.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}