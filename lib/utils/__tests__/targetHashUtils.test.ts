import { 
  hashArray, 
  isAnalysisStale, 
  hasTargetUrlsChanged, 
  mergeTargetPageIds, 
  getAnalysisAgeDays 
} from '../targetHashUtils';

describe('targetHashUtils', () => {
  describe('hashArray', () => {
    it('should return empty string for null/undefined arrays', () => {
      expect(hashArray(null)).toBe('');
      expect(hashArray(undefined)).toBe('');
      expect(hashArray([])).toBe('');
    });

    it('should return consistent hash for same arrays', () => {
      const arr1 = ['abc', 'def', 'ghi'];
      const arr2 = ['abc', 'def', 'ghi'];
      expect(hashArray(arr1)).toBe(hashArray(arr2));
    });

    it('should return same hash regardless of input order', () => {
      const arr1 = ['abc', 'def', 'ghi'];
      const arr2 = ['ghi', 'abc', 'def'];
      expect(hashArray(arr1)).toBe(hashArray(arr2));
    });

    it('should return different hashes for different arrays', () => {
      const arr1 = ['abc', 'def'];
      const arr2 = ['abc', 'xyz'];
      expect(hashArray(arr1)).not.toBe(hashArray(arr2));
    });

    it('should handle duplicate values in array', () => {
      const arr1 = ['abc', 'def', 'abc'];
      const arr2 = ['abc', 'def'];
      // Should be different because duplicates are preserved
      expect(hashArray(arr1)).not.toBe(hashArray(arr2));
    });
  });

  describe('isAnalysisStale', () => {
    it('should return true for null dates', () => {
      expect(isAnalysisStale(null)).toBe(true);
    });

    it('should return false for recent dates', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      expect(isAnalysisStale(recentDate)).toBe(false);
    });

    it('should return true for stale dates (older than 6 months)', () => {
      const staleDate = new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000); // 7 months ago
      expect(isAnalysisStale(staleDate)).toBe(true);
    });

    it('should return false for dates exactly at 6 month boundary', () => {
      const boundaryDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000); // exactly 6 months
      expect(isAnalysisStale(boundaryDate)).toBe(false);
    });
  });

  describe('hasTargetUrlsChanged', () => {
    it('should return false when both arrays are null/empty', () => {
      expect(hasTargetUrlsChanged(null, null)).toBe(false);
      expect(hasTargetUrlsChanged([], [])).toBe(false);
      expect(hasTargetUrlsChanged(null, [])).toBe(false);
    });

    it('should return true when one array is empty and other is not', () => {
      expect(hasTargetUrlsChanged(null, ['abc'])).toBe(true);
      expect(hasTargetUrlsChanged(['abc'], null)).toBe(true);
      expect(hasTargetUrlsChanged([], ['abc'])).toBe(true);
    });

    it('should return false for identical arrays', () => {
      const arr1 = ['abc', 'def'];
      const arr2 = ['def', 'abc']; // Different order but same content
      expect(hasTargetUrlsChanged(arr1, arr2)).toBe(false);
    });

    it('should return true for different arrays', () => {
      const arr1 = ['abc', 'def'];
      const arr2 = ['abc', 'xyz'];
      expect(hasTargetUrlsChanged(arr1, arr2)).toBe(true);
    });
  });

  describe('mergeTargetPageIds', () => {
    it('should handle null/empty arrays', () => {
      expect(mergeTargetPageIds(null, null)).toEqual([]);
      expect(mergeTargetPageIds([], [])).toEqual([]);
      expect(mergeTargetPageIds(null, ['abc'])).toEqual(['abc']);
      expect(mergeTargetPageIds(['abc'], null)).toEqual(['abc']);
    });

    it('should merge arrays and remove duplicates', () => {
      const existing = ['abc', 'def'];
      const incoming = ['def', 'ghi'];
      const result = mergeTargetPageIds(existing, incoming);
      expect(result.sort()).toEqual(['abc', 'def', 'ghi']);
    });

    it('should preserve order of first occurrence', () => {
      const existing = ['abc', 'def'];
      const incoming = ['ghi', 'abc'];
      const result = mergeTargetPageIds(existing, incoming);
      expect(result).toEqual(['abc', 'def', 'ghi']);
    });
  });

  describe('getAnalysisAgeDays', () => {
    it('should return null for null dates', () => {
      expect(getAnalysisAgeDays(null)).toBe(null);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      expect(getAnalysisAgeDays(today)).toBe(0);
    });

    it('should return correct number of days for past dates', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(getAnalysisAgeDays(threeDaysAgo)).toBe(3);
    });

    it('should return correct number for large day differences', () => {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      expect(getAnalysisAgeDays(sixMonthsAgo)).toBe(180);
    });
  });
});