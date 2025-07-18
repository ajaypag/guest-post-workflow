'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink, Plus } from 'lucide-react';
import { clientStorage } from '@/lib/userStorage';

interface AddTargetUrlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  onUrlsAdded: (urls: string[], addedToClient: boolean) => void;
  onEnrichmentComplete?: () => void;
}

interface UrlAnalysis {
  new: string[];
  duplicates: string[];
  invalid: string[];
}

interface EnrichmentStatus {
  [url: string]: 'pending' | 'processing' | 'complete' | 'error';
}

export function AddTargetUrlsModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onUrlsAdded,
  onEnrichmentComplete
}: AddTargetUrlsModalProps) {
  const [step, setStep] = useState<'input' | 'analysis' | 'enrichment' | 'progress'>('input');
  const [urlInput, setUrlInput] = useState('');
  const [urlAnalysis, setUrlAnalysis] = useState<UrlAnalysis | null>(null);
  const [showEnrichmentConfirm, setShowEnrichmentConfirm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<EnrichmentStatus>({});
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [newTargetPageIds, setNewTargetPageIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const resetModal = () => {
    setStep('input');
    setUrlInput('');
    setUrlAnalysis(null);
    setShowEnrichmentConfirm(false);
    setEnrichmentStatus({});
    setEnrichmentProgress({ current: 0, total: 0 });
    setNewTargetPageIds([]);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const analyzeUrls = async () => {
    const urls = urlInput
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      return;
    }

    setIsAnalyzing(true);

    try {
      // For now, do basic validation
      const validUrlPattern = /^https?:\/\/.+\..+/i;
      const analysis: UrlAnalysis = {
        new: [],
        duplicates: [],
        invalid: []
      };

      // If we have a client, check for duplicates
      if (clientId) {
        const client = await clientStorage.getClient(clientId);
        const existingUrls = new Set(
          client?.targetPages?.map((page: any) => page.url.toLowerCase()) || []
        );

        urls.forEach(url => {
          if (!validUrlPattern.test(url)) {
            analysis.invalid.push(url);
          } else if (existingUrls.has(url.toLowerCase())) {
            analysis.duplicates.push(url);
          } else {
            analysis.new.push(url);
          }
        });
      } else {
        // No client, all valid URLs are new
        urls.forEach(url => {
          if (!validUrlPattern.test(url)) {
            analysis.invalid.push(url);
          } else {
            analysis.new.push(url);
          }
        });
      }

      setUrlAnalysis(analysis);
      setStep('analysis');
    } catch (error) {
      console.error('Error analyzing URLs:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddUrls = async (skipEnrichment: boolean = false) => {
    if (!urlAnalysis || urlAnalysis.new.length === 0) return;

    if (clientId) {
      // Add to client
      setStep('progress');
      
      try {
        // Add URLs to client
        const response = await fetch(`/api/clients/${clientId}/target-pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: urlAnalysis.new })
        });

        if (!response.ok) {
          throw new Error('Failed to add URLs');
        }

        const result = await response.json();
        
        // Get the newly added page IDs from the response
        const newPageIds = result.targetPages
          .filter((page: any) => urlAnalysis.new.includes(page.url))
          .map((page: any) => page.id);
        
        setNewTargetPageIds(newPageIds);

        if (skipEnrichment) {
          onUrlsAdded(urlAnalysis.new, true);
          handleClose();
        } else {
          setShowEnrichmentConfirm(true);
          setStep('enrichment');
        }
      } catch (error) {
        console.error('Error adding URLs:', error);
        alert('Failed to add URLs. Please try again.');
        setStep('analysis');
      }
    } else {
      // No client - use as orphan URLs
      onUrlsAdded(urlAnalysis.new, false);
      handleClose();
    }
  };

  const startEnrichment = async () => {
    if (!clientId || newTargetPageIds.length === 0) return;

    setStep('progress');
    setEnrichmentProgress({ current: 0, total: newTargetPageIds.length });

    // Initialize status
    const initialStatus: EnrichmentStatus = {};
    urlAnalysis?.new.forEach(url => {
      initialStatus[url] = 'pending';
    });
    setEnrichmentStatus(initialStatus);

    // Get client data to map URLs to page IDs
    const client = await clientStorage.getClient(clientId);
    const urlToPageId = new Map<string, string>();
    
    client?.targetPages?.forEach((page: any) => {
      if (urlAnalysis?.new.includes(page.url)) {
        urlToPageId.set(page.url, page.id);
      }
    });

    // Process each URL
    const urlsToProcess = urlAnalysis?.new || [];
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      const pageId = urlToPageId.get(url);
      
      if (!pageId || !url) continue;

      setEnrichmentStatus(prev => ({ ...prev, [url]: 'processing' }));
      setEnrichmentProgress({ current: i + 1, total: urlsToProcess.length });

      try {
        // Generate keywords and description in parallel
        const [keywordResponse, descriptionResponse] = await Promise.all([
          fetch(`/api/target-pages/${pageId}/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: url })
          }),
          fetch(`/api/target-pages/${pageId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: url })
          })
        ]);

        if (!keywordResponse.ok || !descriptionResponse.ok) {
          throw new Error('Failed to generate keywords or description');
        }

        setEnrichmentStatus(prev => ({ ...prev, [url]: 'complete' }));
      } catch (error) {
        console.error(`Error enriching ${url}:`, error);
        setEnrichmentStatus(prev => ({ ...prev, [url]: 'error' }));
      }
    }

    // Wait a moment before closing
    setTimeout(() => {
      if (onEnrichmentComplete) {
        onEnrichmentComplete();
      }
      onUrlsAdded(urlAnalysis?.new || [], true);
      handleClose();
    }, 1000);
  };

  const skipEnrichment = () => {
    onUrlsAdded(urlAnalysis?.new || [], true);
    handleClose();
  };

  const getCompletedCount = () => {
    return Object.values(enrichmentStatus).filter(status => status === 'complete').length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Target URLs
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step 1: URL Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              {clientId 
                ? `Paste the target URLs you want to add to ${clientName}. These are the pages you want to link to from your guest post.`
                : 'Paste the target URLs you want to use for this workflow. Since no client is selected, these will only be used for this session.'}
            </p>

            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              autoFocus
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={analyzeUrls}
                disabled={!urlInput.trim() || isAnalyzing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        {step === 'analysis' && urlAnalysis && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-gray-900 mb-2">Analysis Results:</h3>
              
              {urlAnalysis.new.length > 0 && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>{urlAnalysis.new.length} new URL{urlAnalysis.new.length > 1 ? 's' : ''} to add</span>
                </div>
              )}
              
              {urlAnalysis.duplicates.length > 0 && (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>{urlAnalysis.duplicates.length} duplicate{urlAnalysis.duplicates.length > 1 ? 's' : ''} (already in database)</span>
                </div>
              )}
              
              {urlAnalysis.invalid.length > 0 && (
                <div className="flex items-center text-red-600">
                  <X className="w-5 h-5 mr-2" />
                  <span>{urlAnalysis.invalid.length} invalid URL{urlAnalysis.invalid.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Show the URLs */}
              {urlAnalysis.new.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">URLs to add:</p>
                  <div className="bg-white border border-gray-200 rounded p-2 max-h-32 overflow-y-auto">
                    {urlAnalysis.new.map((url, idx) => (
                      <div key={idx} className="text-sm text-gray-600 truncate">
                        {url}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {urlAnalysis.new.length > 0 && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                {clientId ? (
                  <button
                    onClick={() => handleAddUrls(false)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {urlAnalysis.new.length} URL{urlAnalysis.new.length > 1 ? 's' : ''} to {clientName}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => alert('Create client feature not yet implemented')}
                      className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50"
                    >
                      Create New Client & Add URLs
                    </button>
                    <button
                      onClick={() => handleAddUrls(true)}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Use URLs for This Workflow Only
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Enrichment Confirmation */}
        {step === 'enrichment' && urlAnalysis && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                Enhance URLs with AI?
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                AI can automatically find relevant keywords and create descriptions for each URL. 
                This helps with better matching and SEO analysis.
              </p>
              
              <div className="bg-white rounded p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>URLs to process:</span>
                  <span className="font-medium">{urlAnalysis.new.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated time:</span>
                  <span className="font-medium">~{urlAnalysis.new.length * 20} seconds</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated cost:</span>
                  <span className="font-medium">~${(urlAnalysis.new.length * 0.15).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={skipEnrichment}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Skip for Now
              </button>
              <button
                onClick={startEnrichment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Yes, Enhance with AI
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Enrichment Progress */}
        {step === 'progress' && urlAnalysis && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Enhancing URLs with AI
            </h3>
            
            <div className="space-y-3">
              {urlAnalysis.new.map((url, index) => (
                <div key={url} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm truncate flex-1 mr-3">{url}</span>
                  {enrichmentStatus[url] === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : enrichmentStatus[url] === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  ) : enrichmentStatus[url] === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Processing {enrichmentProgress.current} of {enrichmentProgress.total}...
              </p>
            </div>

            {getCompletedCount() === urlAnalysis.new.length && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">All URLs enhanced successfully!</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}