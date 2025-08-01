'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, AlertCircle, CheckCircle, Loader2, ExternalLink, Plus, Target
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  website: string;
  description?: string;
}

interface CreateTargetPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTargetPagesCreated: (targetPages: any[]) => void;
  preSelectedClientId?: string; // If called from a specific client context
}

interface UrlAnalysis {
  new: string[];
  invalid: string[];
  duplicatesInBatch: string[]; // Duplicates within the current batch
  duplicatesExisting: string[]; // Duplicates with existing target pages
}

export default function CreateTargetPageModal({ 
  isOpen, 
  onClose, 
  onTargetPagesCreated,
  preSelectedClientId 
}: CreateTargetPageModalProps) {
  const [step, setStep] = useState<'clientSelection' | 'urlInput' | 'analysis' | 'creating'>('clientSelection');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClientId || '');
  const [urlInput, setUrlInput] = useState('');
  const [urlAnalysis, setUrlAnalysis] = useState<UrlAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Check user type and load clients
  useEffect(() => {
    if (isOpen) {
      checkUserTypeAndLoadClients();
    }
  }, [isOpen]);

  // Skip client selection if preSelectedClientId is provided
  useEffect(() => {
    if (isOpen && preSelectedClientId) {
      setSelectedClientId(preSelectedClientId);
      setStep('urlInput');
    }
  }, [isOpen, preSelectedClientId]);

  const checkUserTypeAndLoadClients = async () => {
    try {
      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        const isAccountUser = session.userType === 'account';
        
        // Load clients
        const url = isAccountUser ? '/api/account/clients' : '/api/clients';
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const clientList = data.clients || data;
          setClients(clientList);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    }
  };

  const resetModal = () => {
    setStep(preSelectedClientId ? 'urlInput' : 'clientSelection');
    setSelectedClientId(preSelectedClientId || '');
    setUrlInput('');
    setUrlAnalysis(null);
    setError('');
    setSearchQuery('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Helper to normalize URLs for comparison
  const normalizeUrlForComparison = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Remove protocol (http/https), www, and trailing slashes
      let normalized = urlObj.hostname + urlObj.pathname;
      normalized = normalized.replace(/^www\./, '');
      normalized = normalized.replace(/\/$/, '');
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  };

  const analyzeUrls = async () => {
    const urls = urlInput
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const validUrlPattern = /^https?:\/\/.+\..+/i;
      const analysis: UrlAnalysis = {
        new: [],
        invalid: [],
        duplicatesInBatch: [],
        duplicatesExisting: []
      };

      // Track normalized URLs to detect duplicates within batch
      const batchUrls = new Map<string, string>(); // normalized -> original
      
      // Get existing target pages for the selected client
      let existingUrls: string[] = [];
      if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client && client.targetPages) {
          existingUrls = client.targetPages
            .filter(tp => tp.status === 'active')
            .map(tp => tp.url);
        }
      }

      // Normalize existing URLs for comparison
      const existingNormalized = new Set(
        existingUrls.map(url => normalizeUrlForComparison(url))
      );

      urls.forEach(url => {
        if (!validUrlPattern.test(url)) {
          analysis.invalid.push(url);
        } else {
          const normalized = normalizeUrlForComparison(url);
          
          // Check if duplicate within current batch
          if (batchUrls.has(normalized)) {
            analysis.duplicatesInBatch.push(url);
          } 
          // Check if duplicate with existing URLs
          else if (existingNormalized.has(normalized)) {
            analysis.duplicatesExisting.push(url);
          } 
          // It's a new URL
          else {
            analysis.new.push(url);
            batchUrls.set(normalized, url);
          }
        }
      });

      setUrlAnalysis(analysis);
      setStep('analysis');
    } catch (error) {
      console.error('Error analyzing URLs:', error);
      setError('Error analyzing URLs');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTargetPages = async () => {
    if (!selectedClientId || !urlAnalysis || urlAnalysis.new.length === 0) {
      return;
    }

    setIsCreating(true);
    setError('');
    setStep('creating');

    try {
      const response = await fetch(`/api/clients/${selectedClientId}/target-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlAnalysis.new })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create target pages');
      }

      const result = await response.json();
      
      // Show success message with details about duplicates if any
      let successMessage = `Successfully added ${result.added || urlAnalysis.new.length} target page${result.added !== 1 ? 's' : ''}`;
      
      if (result.duplicatesSkipped && result.duplicatesSkipped > 0) {
        successMessage += ` (${result.duplicatesSkipped} duplicate${result.duplicatesSkipped > 1 ? 's' : ''} skipped by server)`;
      }
      
      // Create a temporary toast/notification (you could use a toast library here)
      console.log(successMessage);
      
      onTargetPagesCreated(result.targetPages || []);
      handleClose();
    } catch (error) {
      console.error('Error creating target pages:', error);
      setStep('analysis'); // Go back to analysis step on error
      setError(error instanceof Error ? error.message : 'Failed to create target pages. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getFilteredClients = () => {
    if (!searchQuery) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.website.toLowerCase().includes(query) ||
      client.description?.toLowerCase().includes(query)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Target Pages
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Step 1: Client Selection - Only show if no preSelectedClientId */}
          {step === 'clientSelection' && !preSelectedClientId && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Client</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose which client these target pages belong to.
                </p>
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Client List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getFilteredClients().map(client => (
                  <label
                    key={client.id}
                    className={`block p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedClientId === client.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="client"
                      value={client.id}
                      checked={selectedClientId === client.id}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-600">{client.website}</div>
                      {client.description && (
                        <div className="text-xs text-gray-500 mt-1">{client.description}</div>
                      )}
                    </div>
                  </label>
                ))}
                {getFilteredClients().length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">No clients found</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('urlInput')}
                  disabled={!selectedClientId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: URL Input */}
          {step === 'urlInput' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Target URLs</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the URLs you want to create target pages for. These are the pages you want to link to from guest posts.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target URLs *
                </label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter URLs, one per line&#10;https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                  className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter one URL per line. Each URL must include http:// or https://
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={preSelectedClientId ? handleClose : () => setStep('clientSelection')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {preSelectedClientId ? 'Cancel' : 'Back'}
                </button>
                <button
                  onClick={analyzeUrls}
                  disabled={!urlInput.trim() || isAnalyzing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze URLs
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Analysis Results */}
          {step === 'analysis' && urlAnalysis && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {urlAnalysis.new.length > 0 && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>{urlAnalysis.new.length} new URL{urlAnalysis.new.length > 1 ? 's' : ''} to add</span>
                  </div>
                )}
                
                {urlAnalysis.duplicatesInBatch.length > 0 && (
                  <div className="flex items-center text-yellow-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{urlAnalysis.duplicatesInBatch.length} duplicate{urlAnalysis.duplicatesInBatch.length > 1 ? 's' : ''} in your list (will be skipped)</span>
                  </div>
                )}
                
                {urlAnalysis.duplicatesExisting.length > 0 && (
                  <div className="flex items-center text-yellow-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{urlAnalysis.duplicatesExisting.length} URL{urlAnalysis.duplicatesExisting.length > 1 ? 's' : ''} already exist (will be skipped)</span>
                  </div>
                )}
                
                {urlAnalysis.invalid.length > 0 && (
                  <div className="flex items-center text-red-600">
                    <X className="h-5 w-5 mr-2" />
                    <span>{urlAnalysis.invalid.length} invalid URL{urlAnalysis.invalid.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Show URLs to be added */}
                {urlAnalysis.new.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">URLs to add:</p>
                    <div className="bg-white border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
                      {urlAnalysis.new.map((url, idx) => (
                        <div key={idx} className="text-sm text-gray-600 truncate py-0.5">
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show duplicates within batch */}
                {urlAnalysis.duplicatesInBatch.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-yellow-700 mb-2">Duplicates in your list:</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 max-h-32 overflow-y-auto">
                      {urlAnalysis.duplicatesInBatch.map((url, idx) => (
                        <div key={idx} className="text-sm text-yellow-700 truncate py-0.5">
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show existing duplicates */}
                {urlAnalysis.duplicatesExisting.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-yellow-700 mb-2">Already exist for this client:</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 max-h-32 overflow-y-auto">
                      {urlAnalysis.duplicatesExisting.map((url, idx) => (
                        <div key={idx} className="text-sm text-yellow-700 truncate py-0.5">
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show invalid URLs */}
                {urlAnalysis.invalid.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-700 mb-2">Invalid URLs:</p>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                      {urlAnalysis.invalid.map((url, idx) => (
                        <div key={idx} className="text-sm text-red-600 truncate py-0.5">
                          {url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setStep('urlInput')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Back
                </button>
                {urlAnalysis.new.length > 0 ? (
                  <button
                    onClick={handleCreateTargetPages}
                    disabled={isCreating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add {urlAnalysis.new.length} Target Page{urlAnalysis.new.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Creating Progress */}
          {step === 'creating' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Target Pages</h3>
                <p className="text-gray-600">Please wait while we create your target pages...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}