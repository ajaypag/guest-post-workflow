'use client';

import { useState, useEffect, useCallback } from 'react';

// Type for selected domain data
export interface SelectedDomain {
  id: string;
  domain: string;
  clientId: string;
  clientName: string | null;
  price: number; // In dollars (calculated from guestPostCost)
  targetPageIds?: string[]; // From targetPages array
  targetPages?: Array<{
    id: string;
    url: string;
    keywords: string | null;
  }>;
  qualificationStatus: string;
  suggestedTargetUrl?: string | null;
}

// Selection state type
export interface SelectionState {
  domains: Map<string, SelectedDomain>;
  totalPrice: number;
  count: number;
}

const STORAGE_KEY = 'vetted-sites-selection';

export function useSelection(userType: 'internal' | 'account' | 'publisher' = 'internal') {
  // Initialize state from sessionStorage
  const [selection, setSelection] = useState<SelectionState>(() => {
    if (typeof window === 'undefined') {
      return { domains: new Map(), totalPrice: 0, count: 0 };
    }
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reconstruct Map from array
        const domains = new Map<string, SelectedDomain>(parsed.domains);
        return {
          domains,
          totalPrice: parsed.totalPrice || 0,
          count: domains.size
        };
      }
    } catch (error) {
      console.error('Failed to load selection from sessionStorage:', error);
    }
    
    return { domains: new Map(), totalPrice: 0, count: 0 };
  });

  // Persist to sessionStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const toStore = {
        domains: Array.from(selection.domains.entries()),
        totalPrice: selection.totalPrice,
        count: selection.count
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save selection to sessionStorage:', error);
    }
  }, [selection]);

  // Calculate price for a domain - unified pricing for all users
  const calculatePrice = useCallback((guestPostCost: string | null): number => {
    if (!guestPostCost) return 0;
    const wholesalePriceCents = parseFloat(guestPostCost);
    // Convert cents to dollars and add $79 service fee
    const wholesalePriceDollars = wholesalePriceCents / 100;
    return wholesalePriceDollars + 79;
  }, []);

  // Add domain to selection
  const addDomain = useCallback((domain: {
    id: string;
    domain: string;
    clientId: string;
    clientName: string | null;
    guestPostCost: string | null;
    targetPages?: Array<{ id: string; url: string; keywords: string | null; }>;
    qualificationStatus: string;
    suggestedTargetUrl?: string | null;
  }): { success: boolean; error?: string } => {
    let result = { success: false, error: undefined as string | undefined };
    
    setSelection(prev => {
      const newDomains = new Map(prev.domains);
      
      if (!newDomains.has(domain.id)) {
        // Check if we already have domains from a different client
        const existingClientIds = Array.from(prev.domains.values()).map(d => d.clientId);
        const uniqueClients = new Set(existingClientIds);
        
        if (uniqueClients.size > 0 && !uniqueClients.has(domain.clientId)) {
          result = { 
            success: false, 
            error: `Cannot mix domains from different clients. You have selected domains from ${Array.from(uniqueClients).map(id => {
              const existing = Array.from(prev.domains.values()).find(d => d.clientId === id);
              return existing?.clientName || 'Unknown Client';
            }).join(', ')}. Please clear selection or only select domains from ${domain.clientName}.`
          };
          return prev; // Don't add the domain
        }
        
        const price = calculatePrice(domain.guestPostCost);
        const selectedDomain: SelectedDomain = {
          id: domain.id,
          domain: domain.domain,
          clientId: domain.clientId,
          clientName: domain.clientName,
          price,
          targetPageIds: domain.targetPages?.map(tp => tp.id),
          targetPages: domain.targetPages?.map(tp => ({
            id: tp.id,
            url: tp.url,
            keywords: tp.keywords
          })),
          qualificationStatus: domain.qualificationStatus,
          suggestedTargetUrl: domain.suggestedTargetUrl
        };
        
        newDomains.set(domain.id, selectedDomain);
        
        // Recalculate total price
        let totalPrice = 0;
        newDomains.forEach(d => {
          totalPrice += d.price;
        });
        
        result = { success: true, error: undefined };
        
        return {
          domains: newDomains,
          totalPrice,
          count: newDomains.size
        };
      }
      
      result = { success: true, error: undefined }; // Domain already selected
      return prev;
    });
    
    return result;
  }, [calculatePrice]);

  // Remove domain from selection
  const removeDomain = useCallback((domainId: string) => {
    setSelection(prev => {
      const newDomains = new Map(prev.domains);
      newDomains.delete(domainId);
      
      // Recalculate total price
      let totalPrice = 0;
      newDomains.forEach(d => {
        totalPrice += d.price;
      });
      
      return {
        domains: newDomains,
        totalPrice,
        count: newDomains.size
      };
    });
  }, []);

  // Toggle domain selection
  const toggleDomain = useCallback((domain: {
    id: string;
    domain: string;
    clientId: string;
    clientName: string | null;
    guestPostCost: string | null;
    targetPages?: Array<{ id: string; url: string; keywords: string | null; }>;
    qualificationStatus: string;
    suggestedTargetUrl?: string | null;
  }, onError?: (error: string) => void): { success: boolean; error?: string } => {
    if (selection.domains.has(domain.id)) {
      removeDomain(domain.id);
      return { success: true };
    } else {
      const result = addDomain(domain);
      if (!result.success && result.error && onError) {
        onError(result.error);
      }
      return result;
    }
  }, [selection.domains, addDomain, removeDomain]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelection({
      domains: new Map(),
      totalPrice: 0,
      count: 0
    });
  }, []);

  // Select all from a list
  const selectAll = useCallback((domains: Array<{
    id: string;
    domain: string;
    clientId: string;
    clientName: string | null;
    guestPostCost: string | null;
    targetPages?: Array<{ id: string; url: string; keywords: string | null; }>;
    qualificationStatus: string;
    suggestedTargetUrl?: string | null;
  }>) => {
    setSelection(() => {
      const newDomains = new Map<string, SelectedDomain>();
      let totalPrice = 0;
      
      domains.forEach(domain => {
        const price = calculatePrice(domain.guestPostCost);
        const selectedDomain: SelectedDomain = {
          id: domain.id,
          domain: domain.domain,
          clientId: domain.clientId,
          clientName: domain.clientName,
          price,
          targetPageIds: domain.targetPages?.map(tp => tp.id),
          targetPages: domain.targetPages?.map(tp => ({
            id: tp.id,
            url: tp.url,
            keywords: tp.keywords
          })),
          qualificationStatus: domain.qualificationStatus,
          suggestedTargetUrl: domain.suggestedTargetUrl
        };
        
        newDomains.set(domain.id, selectedDomain);
        totalPrice += price;
      });
      
      return {
        domains: newDomains,
        totalPrice,
        count: newDomains.size
      };
    });
  }, [calculatePrice]);

  // Check if domain is selected
  const isSelected = useCallback((domainId: string): boolean => {
    return selection.domains.has(domainId);
  }, [selection.domains]);

  // Get selected domains as array
  const getSelectedDomains = useCallback((): SelectedDomain[] => {
    return Array.from(selection.domains.values());
  }, [selection.domains]);

  return {
    selection,
    addDomain,
    removeDomain,
    toggleDomain,
    clearSelection,
    selectAll,
    isSelected,
    getSelectedDomains,
    // Expose counts and totals directly
    selectedCount: selection.count,
    totalPrice: selection.totalPrice,
  };
}