'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Link2, Type, Plus, X, Building2, Loader2, Check, AlertCircle } from 'lucide-react';

interface TargetPage {
  id?: string;
  url: string;
  anchorText?: string;
  pageId?: string;
  requestedLinks?: number;
  clientId?: string;
}

interface Client {
  id: string;
  name: string;
  website?: string;
}

interface EnhancedTargetPageSelectorProps {
  value?: {
    targetPageUrl?: string;
    anchorText?: string;
    targetPageId?: string;
  };
  onChange: (value: { 
    targetPageUrl: string; 
    anchorText: string;
    targetPageId?: string;
  }) => void;
  currentClientId: string;
  availableClients?: Client[];
  allowClientSwitch?: boolean;
  disabled?: boolean;
  className?: string;
  orderId?: string;
}

export default function EnhancedTargetPageSelector({
  value,
  onChange,
  currentClientId,
  availableClients = [],
  allowClientSwitch = false,
  disabled = false,
  className = '',
  orderId
}: EnhancedTargetPageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<TargetPage | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(currentClientId);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load target pages for selected client
  useEffect(() => {
    if (selectedClientId) {
      loadTargetPages(selectedClientId);
    }
  }, [selectedClientId]);

  // Initialize selected target from value
  useEffect(() => {
    if (value?.targetPageUrl) {
      const found = targetPages.find(tp => tp.url === value.targetPageUrl);
      if (found) {
        setSelectedTarget(found);
      }
    }
  }, [value, targetPages]);

  const loadTargetPages = async (clientId: string) => {
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

  const handleSelectTarget = (target: TargetPage) => {
    setSelectedTarget(target);
    onChange({
      targetPageUrl: target.url,
      anchorText: target.anchorText || '',
      targetPageId: target.id
    });
    setIsOpen(false);
    setShowAddNew(false);
  };

  const handleAddNewTarget = async () => {
    if (!newUrl) return;

    // Clear previous errors
    setError(null);

    // Trim whitespace
    const trimmedUrl = newUrl.trim();

    // Basic validation
    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(trimmedUrl);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com/page)');
      return;
    }

    // Check protocol
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      setError('URL must start with http:// or https://');
      return;
    }

    // Check if URL already exists locally (quick check before API call)
    const normalizedNewUrl = trimmedUrl.toLowerCase().replace(/\/$/, '');
    const exists = targetPages.some(tp => {
      const normalizedExisting = tp.url.toLowerCase().replace(/\/$/, '');
      return normalizedExisting === normalizedNewUrl;
    });

    if (exists) {
      setError('This target page already exists for this client');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      // Save to database
      const response = await fetch(`/api/clients/${selectedClientId}/target-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [trimmedUrl] })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add target page');
      }

      const data = await response.json();
      
      // Update local target pages list
      setTargetPages(data.targetPages || []);
      
      // Find the newly added page
      const newTarget = data.targetPages.find((tp: TargetPage) => tp.url === trimmedUrl);
      if (newTarget) {
        // Select the new target
        handleSelectTarget(newTarget);
      }

      // Show success message
      setSuccessMessage('Target page added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset form
      setNewUrl('');
      setShowAddNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add target page');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setSelectedTarget(null);
    onChange({
      targetPageUrl: '',
      anchorText: '',
      targetPageId: undefined
    });
  };

  const handleClientSwitch = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedTarget(null);
    onChange({
      targetPageUrl: '',
      anchorText: '',
      targetPageId: undefined
    });
  };

  // Group target pages by domain for better organization
  const groupedTargets = targetPages.reduce((acc, target) => {
    try {
      const url = new URL(target.url);
      const baseUrl = url.hostname;
      if (!acc[baseUrl]) {
        acc[baseUrl] = [];
      }
      acc[baseUrl].push(target);
    } catch {
      if (!acc['other']) {
        acc['other'] = [];
      }
      acc['other'].push(target);
    }
    return acc;
  }, {} as Record<string, TargetPage[]>);

  const selectedClient = availableClients.find(c => c.id === selectedClientId);

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">{successMessage}</span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Client Selector (if multiple clients available) */}
        {allowClientSwitch && availableClients.length > 1 && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Building2 className="h-4 w-4 text-gray-600" />
            <select
              value={selectedClientId}
              onChange={(e) => handleClientSwitch(e.target.value)}
              disabled={disabled}
              className="flex-1 text-sm bg-transparent border-0 focus:ring-0"
            >
              {availableClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Target Display */}
        {selectedTarget ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Target Page</p>
                    <p className="text-sm text-blue-700 break-all">{selectedTarget.url}</p>
                  </div>
                </div>
                {selectedTarget.anchorText && (
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Anchor Text</p>
                      <p className="text-sm text-blue-700">"{selectedTarget.anchorText}"</p>
                    </div>
                  </div>
                )}
              </div>
              {!disabled && (
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-blue-100 rounded text-blue-600"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">No target page selected</div>
        )}

        {/* Selector Button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
          >
            <span className="text-sm text-gray-700">
              {selectedTarget ? 'Change target page' : 'Select target page'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
              <h3 className="text-sm font-medium text-gray-900">
                Target Pages for {selectedClient?.name || 'Client'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${targetPages.length} target page${targetPages.length !== 1 ? 's' : ''} available`
                )}
              </p>
            </div>

            {!isLoading && targetPages.length === 0 && !showAddNew && (
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

            {/* Existing Target Pages */}
            {!isLoading && Object.entries(groupedTargets).map(([domain, targets]) => (
              <div key={domain} className="border-b border-gray-100">
                <div className="px-3 py-2 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {domain === 'other' ? 'Other Pages' : domain}
                  </p>
                </div>
                {targets.map((target) => (
                  <button
                    key={target.id || target.url}
                    onClick={() => handleSelectTarget(target)}
                    className="w-full px-3 py-3 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Link2 className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-900">
                              {(() => {
                                try {
                                  const url = new URL(target.url);
                                  return url.pathname === '/' ? 'Homepage' : url.pathname;
                                } catch {
                                  return target.url;
                                }
                              })()}
                            </span>
                            {target.anchorText && (
                              <span className="text-sm font-medium text-blue-600">
                                "{target.anchorText}"
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 break-all">
                            {target.url}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {/* Add New Target Page */}
            <div className="border-t border-gray-200">
              {!showAddNew ? (
                <button
                  onClick={() => setShowAddNew(true)}
                  className="w-full px-3 py-3 hover:bg-gray-50 text-left flex items-center gap-2"
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
                          Saving...
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
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}