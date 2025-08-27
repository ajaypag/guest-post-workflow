'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Link2, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';

interface TargetPage {
  id?: string;
  url: string;
  anchorText?: string;
  pageId?: string;
}

interface TargetMatchData {
  target_analysis?: Array<{
    target_url: string;
    match_quality: 'excellent' | 'good' | 'fair' | 'poor';
    evidence?: {
      direct_count: number;
      related_count: number;
      direct_keywords?: string[];
      related_keywords?: string[];
    };
    reasoning?: string;
  }>;
}

interface TableTargetDropdownProps {
  currentTarget?: string;
  clientId: string;
  onSelect: (targetUrl: string) => Promise<void>;
  matchData?: TargetMatchData; // Rich target analysis from domain
  disabled?: boolean;
  className?: string;
  // External dropdown state management (optional)
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export default function TableTargetDropdown({
  currentTarget = '',
  clientId,
  onSelect,
  matchData,
  disabled = false,
  className = '',
  isOpen: externalIsOpen,
  onToggle,
  onClose
}: TableTargetDropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalIsOpen !== undefined 
    ? (open: boolean) => {
        if (open && onToggle) onToggle();
        else if (!open && onClose) onClose();
      }
    : setInternalIsOpen;
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Load target pages when dropdown opens
  useEffect(() => {
    if (isOpen && clientId && targetPages.length === 0) {
      loadTargetPages();
    }
  }, [isOpen, clientId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddNew(false);
        setError(null);
        setDropdownPosition(null); // Reset position when closing
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update dropdown position on scroll to keep it aligned with button
  useEffect(() => {
    if (!isOpen || !buttonRef.current || !portalRef.current) return;

    function updatePosition() {
      if (buttonRef.current && portalRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Directly update the DOM element position without triggering React re-render
        portalRef.current.style.top = `${rect.bottom + 4}px`;
        portalRef.current.style.left = `${rect.left}px`;
      }
    }

    // Listen for any scroll event (including scrollable containers)
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const loadTargetPages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/target-pages`);
      if (!response.ok) {
        throw new Error('Failed to load target pages');
      }
      const data = await response.json();
      setTargetPages(data.targetPages || []);
    } catch (err) {
      setError('Failed to load target pages');
      console.error('Error loading target pages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTarget = async (targetUrl: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await onSelect(targetUrl);
      setIsOpen(false);
      setDropdownPosition(null); // Reset position when closing
    } catch (err) {
      setError('Failed to update target page');
      console.error('Error selecting target:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewTarget = async () => {
    if (!newUrl.trim()) return;

    const trimmedUrl = newUrl.trim();
    
    // Basic URL validation
    try {
      const url = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      // Add to database
      const response = await fetch(`/api/clients/${clientId}/target-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [trimmedUrl] })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add target page');
      }

      const data = await response.json();
      setTargetPages(data.targetPages || []);
      
      // Select the new target
      await handleSelectTarget(trimmedUrl);
      
      // Reset form
      setNewUrl('');
      setShowAddNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add target page');
    } finally {
      setIsSaving(false);
    }
  };

  // Get AI recommendations from match data
  const aiRecommendations = matchData?.target_analysis?.filter(analysis => 
    analysis.match_quality === 'excellent' || analysis.match_quality === 'good'
  ).slice(0, 2) || [];

  // Get quality color for display
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600'; 
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  // Display current target or placeholder
  const currentDisplay = currentTarget ? (
    <div className="flex items-start gap-1">
      <Link2 className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-gray-900 line-clamp-2 text-left break-words" title={currentTarget}>
        {(() => {
          try {
            const url = new URL(currentTarget);
            return url.pathname === '/' ? url.hostname : url.pathname;
          } catch {
            return currentTarget;
          }
        })()}
      </span>
    </div>
  ) : (
    <span className="text-sm text-gray-400 italic">No target page</span>
  );

  if (disabled) {
    return (
      <div className={`px-2 py-1 ${className}`}>
        {currentDisplay}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          // Calculate position immediately when clicked
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // For fixed positioning, use viewport coordinates directly (no scroll offset needed)
            setDropdownPosition({
              top: rect.bottom + 4,
              left: rect.left
            });
          }
          setIsOpen(!isOpen);
        }}
        disabled={isSaving}
        className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded transition-colors flex items-center justify-between group"
      >
        <div className="flex-1 min-w-0">
          {currentDisplay}
        </div>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu - Rendered as Portal */}
      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div 
             ref={portalRef}
             className="fixed z-[9999] w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto" 
             style={{
               top: dropdownPosition.top,
               left: dropdownPosition.left
             }}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
            <h3 className="text-sm font-medium text-gray-900">Target Pages</h3>
            {isLoading && (
              <div className="flex items-center gap-2 mt-1">
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {aiRecommendations.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-3 py-2 bg-green-50">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">
                  AI Recommended
                </p>
              </div>
              {aiRecommendations.map((analysis, index) => (
                <button
                  key={`ai-${index}`}
                  onClick={() => handleSelectTarget(analysis.target_url)}
                  disabled={isSaving}
                  className="w-full px-3 py-3 hover:bg-blue-50 text-left disabled:opacity-50"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {(() => {
                            try {
                              const url = new URL(analysis.target_url);
                              return url.pathname === '/' ? 'Homepage' : url.pathname;
                            } catch {
                              return analysis.target_url;
                            }
                          })()}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{analysis.target_url}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <span className={`text-xs font-medium ${getQualityColor(analysis.match_quality)}`}>
                          ● {analysis.match_quality}
                        </span>
                        {analysis.evidence && (
                          <span className="text-xs text-gray-500">
                            {(analysis.evidence.direct_count || 0) + (analysis.evidence.related_count || 0)} matches
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Existing Target Pages */}
          {targetPages.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-3 py-2 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  All Client Targets
                </p>
              </div>
              {targetPages.map((target) => (
                <button
                  key={target.id || target.url}
                  onClick={() => handleSelectTarget(target.url)}
                  disabled={isSaving}
                  className="w-full px-3 py-3 hover:bg-gray-50 text-left disabled:opacity-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        {(() => {
                          try {
                            const url = new URL(target.url);
                            return url.pathname === '/' ? 'Homepage' : url.pathname;
                          } catch {
                            return target.url;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{target.url}</div>
                    </div>
                    {currentTarget === target.url && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add New Target */}
          <div>
            {!showAddNew ? (
              <button
                onClick={() => setShowAddNew(true)}
                disabled={isSaving}
                className="w-full px-3 py-3 hover:bg-gray-50 text-left flex items-center gap-2 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Add new target page</span>
              </button>
            ) : (
              <div className="p-3 space-y-3 bg-blue-50">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Page URL *
                  </label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSaving}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewTarget();
                      } else if (e.key === 'Escape') {
                        setShowAddNew(false);
                        setNewUrl('');
                        setError(null);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNewTarget}
                    disabled={!newUrl || isSaving}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add & Select'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNew(false);
                      setNewUrl('');
                      setError(null);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {!isLoading && targetPages.length === 0 && aiRecommendations.length === 0 && !showAddNew && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm mb-2">No target pages defined yet</p>
              <button
                onClick={() => setShowAddNew(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add the first target page
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}