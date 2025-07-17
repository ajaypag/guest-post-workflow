'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Loader2, CheckCircle, AlertCircle, ExternalLink, Building, User, Clock } from 'lucide-react';

interface AnalyzedUrl {
  url: string;
  domain: string;
  status: 'existing' | 'new';
  existingData?: {
    id: string;
    clientId?: string;
    clientName?: string;
    keywords?: string;
    description?: string;
  };
  matchedClient?: {
    id: string;
    name: string;
    website: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

interface UrlGroup {
  domain: string;
  urls: AnalyzedUrl[];
  matchedClient?: {
    id: string;
    name: string;
    website: string;
    confidence: 'high' | 'medium' | 'low';
  };
  action?: 'ADD_TO_EXISTING' | 'CREATE_NEW_CLIENT' | 'TEMPORARY';
  newClientData?: {
    name: string;
    website: string;
    description: string;
  };
}

interface BulkUrlInterfaceProps {
  workflowId: string;
  onUrlsAdded: () => void;
  onTabSwitch: () => void;
}

export const BulkUrlInterface: React.FC<BulkUrlInterfaceProps> = ({
  workflowId,
  onUrlsAdded,
  onTabSwitch
}) => {
  const [pastedUrls, setPastedUrls] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [analyzedGroups, setAnalyzedGroups] = useState<UrlGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [groupActions, setGroupActions] = useState<Record<string, string>>({});
  const [newClientForms, setNewClientForms] = useState<Record<string, any>>({});

  // Count valid URLs
  const urlCount = useMemo(() => {
    return pastedUrls.split('\n').filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      try {
        new URL(trimmed);
        return true;
      } catch {
        return false;
      }
    }).length;
  }, [pastedUrls]);

  // Analyze URLs
  const handleAnalyze = useCallback(async () => {
    setError(null);
    setIsAnalyzing(true);

    try {
      const urls = pastedUrls.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await fetch(`/api/workflows/${workflowId}/analyze-bulk-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, autoMatch: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze URLs');
      }

      const data = await response.json();
      
      // Convert grouped data to our format
      const groups: UrlGroup[] = Object.entries(data.groupedByDomain).map(([domain, urls]) => {
        const groupUrls = urls as AnalyzedUrl[];
        const firstUrlWithMatch = groupUrls.find(u => u.matchedClient);
        
        return {
          domain,
          urls: groupUrls,
          matchedClient: firstUrlWithMatch?.matchedClient,
          action: firstUrlWithMatch?.matchedClient ? 'ADD_TO_EXISTING' : undefined
        };
      });

      setAnalyzedGroups(groups);
      setShowResults(true);
      
      // Set default actions
      const defaultActions: Record<string, string> = {};
      groups.forEach(group => {
        defaultActions[group.domain] = group.matchedClient ? 'ADD_TO_EXISTING' : 'TEMPORARY';
      });
      setGroupActions(defaultActions);

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze URLs');
    } finally {
      setIsAnalyzing(false);
    }
  }, [pastedUrls, workflowId]);

  // Handle action change for a group
  const handleActionChange = useCallback((domain: string, action: string) => {
    setGroupActions(prev => ({ ...prev, [domain]: action }));
    
    // Initialize new client form if needed
    if (action === 'CREATE_NEW_CLIENT' && !newClientForms[domain]) {
      const group = analyzedGroups.find(g => g.domain === domain);
      if (group) {
        const suggestedName = domain
          .replace('www.', '')
          .split('.')[0]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        setNewClientForms(prev => ({
          ...prev,
          [domain]: {
            name: suggestedName,
            website: `https://${domain}`,
            description: ''
          }
        }));
      }
    }
  }, [analyzedGroups, newClientForms]);

  // Update new client form data
  const updateNewClientForm = useCallback((domain: string, field: string, value: string) => {
    setNewClientForms(prev => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        [field]: value
      }
    }));
  }, []);

  // Assign URLs based on user choices
  const handleAssignUrls = useCallback(async () => {
    setError(null);
    setIsAssigning(true);

    try {
      const assignments = analyzedGroups.map(group => {
        const action = groupActions[group.domain];
        
        if (action === 'CREATE_NEW_CLIENT') {
          return {
            urls: group.urls.map(u => u.url),
            action,
            newClientData: newClientForms[group.domain]
          };
        } else if (action === 'ADD_TO_EXISTING' && group.matchedClient) {
          return {
            urls: group.urls.map(u => u.url),
            action,
            clientId: group.matchedClient.id
          };
        } else {
          return {
            urls: group.urls.map(u => u.url),
            action: 'TEMPORARY'
          };
        }
      });

      const response = await fetch(`/api/workflows/${workflowId}/assign-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign URLs');
      }

      const result = await response.json();
      
      // Success! Switch back to existing URLs tab
      onUrlsAdded();
      onTabSwitch();
      
    } catch (error) {
      console.error('Assignment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign URLs');
    } finally {
      setIsAssigning(false);
    }
  }, [analyzedGroups, groupActions, newClientForms, workflowId, onUrlsAdded, onTabSwitch]);

  // Reset form
  const handleReset = useCallback(() => {
    setPastedUrls('');
    setAnalyzedGroups([]);
    setShowResults(false);
    setError(null);
    setGroupActions({});
    setNewClientForms({});
  }, []);

  // Calculate summary stats
  const summary = useMemo(() => {
    const allUrls = analyzedGroups.flatMap(g => g.urls);
    return {
      total: allUrls.length,
      existing: allUrls.filter(u => u.status === 'existing').length,
      new: allUrls.filter(u => u.status === 'new').length,
      toAdd: allUrls.filter(u => u.status === 'new').length
    };
  }, [analyzedGroups]);

  return (
    <div className="space-y-4">
      {/* Step 1: Paste URLs */}
      {!showResults && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Add Target URLs</h4>
          <p className="text-sm text-gray-600 mb-3">
            Paste URLs below (one per line). We'll analyze them and help you organize them properly.
          </p>
          
          <textarea
            value={pastedUrls}
            onChange={(e) => setPastedUrls(e.target.value)}
            placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://another-site.com/article"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={isAnalyzing}
          />
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {urlCount} valid URL{urlCount !== 1 ? 's' : ''} detected
            </span>
            <button
              onClick={handleAnalyze}
              disabled={urlCount === 0 || isAnalyzing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                urlCount > 0 && !isAnalyzing
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze URLs'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Analysis Results */}
      {showResults && analyzedGroups.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Analysis Complete</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Total URLs:</span>
                <span className="ml-2 font-medium text-blue-900">{summary.total}</span>
              </div>
              <div>
                <span className="text-blue-700">Already Exist:</span>
                <span className="ml-2 font-medium text-blue-900">{summary.existing}</span>
              </div>
              <div>
                <span className="text-blue-700">New to Add:</span>
                <span className="ml-2 font-medium text-green-700">{summary.new}</span>
              </div>
            </div>
          </div>

          {/* Groups */}
          {analyzedGroups.map((group) => (
            <div key={group.domain} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Group Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="font-medium text-gray-900">{group.domain}</h5>
                  <p className="text-sm text-gray-600">
                    {group.urls.length} URL{group.urls.length !== 1 ? 's' : ''}
                    {group.matchedClient && (
                      <span className="ml-2 text-green-600">
                        ✓ Matches: {group.matchedClient.name}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* URL List */}
              <div className="space-y-2 mb-3">
                {group.urls.map((url) => (
                  <div key={url.url} className="flex items-center text-sm">
                    {url.status === 'existing' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 text-blue-500 mr-2" />
                    )}
                    <span className={url.status === 'existing' ? 'text-gray-500' : 'text-gray-700'}>
                      {url.url}
                    </span>
                    {url.status === 'existing' && url.existingData?.clientName && (
                      <span className="ml-2 text-xs text-gray-500">
                        (in {url.existingData.clientName})
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Selection */}
              {group.urls.some(u => u.status === 'new') && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    What would you like to do with the new URLs?
                  </p>
                  
                  <div className="space-y-2">
                    {group.matchedClient && (
                      <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name={`action-${group.domain}`}
                          value="ADD_TO_EXISTING"
                          checked={groupActions[group.domain] === 'ADD_TO_EXISTING'}
                          onChange={(e) => handleActionChange(group.domain, e.target.value)}
                          className="mr-3"
                        />
                        <Building className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm">Add to {group.matchedClient.name}</span>
                      </label>
                    )}
                    
                    <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`action-${group.domain}`}
                        value="CREATE_NEW_CLIENT"
                        checked={groupActions[group.domain] === 'CREATE_NEW_CLIENT'}
                        onChange={(e) => handleActionChange(group.domain, e.target.value)}
                        className="mr-3"
                      />
                      <Plus className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm">Create new client</span>
                    </label>
                    
                    <label className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`action-${group.domain}`}
                        value="TEMPORARY"
                        checked={groupActions[group.domain] === 'TEMPORARY'}
                        onChange={(e) => handleActionChange(group.domain, e.target.value)}
                        className="mr-3"
                      />
                      <Clock className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm">Use temporarily (this workflow only)</span>
                    </label>
                  </div>

                  {/* New Client Form */}
                  {groupActions[group.domain] === 'CREATE_NEW_CLIENT' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-2">
                      <input
                        type="text"
                        placeholder="Client Name"
                        value={newClientForms[group.domain]?.name || ''}
                        onChange={(e) => updateNewClientForm(group.domain, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Website"
                        value={newClientForms[group.domain]?.website || ''}
                        onChange={(e) => updateNewClientForm(group.domain, 'website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newClientForms[group.domain]?.description || ''}
                        onChange={(e) => updateNewClientForm(group.domain, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Start Over
            </button>
            
            <button
              onClick={handleAssignUrls}
              disabled={isAssigning}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Continue with ${summary.toAdd} New URL${summary.toAdd !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};