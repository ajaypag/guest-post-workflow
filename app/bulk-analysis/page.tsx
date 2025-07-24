'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client, TargetPage } from '@/types/user';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Plus,
  Search,
  RotateCcw,
  Trash2
} from 'lucide-react';
import DataForSeoResultsModal from '@/components/DataForSeoResultsModal';
import { groupKeywordsByTopic, generateGroupedAhrefsUrls } from '@/lib/utils/keywordGroupingV2';

interface BulkAnalysisDomain {
  id: string;
  domain: string;
  qualificationStatus: 'pending' | 'high_quality' | 'average_quality' | 'disqualified';
  keywordCount: number;
  targetPageIds: string[];
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  hasWorkflow?: boolean;
  workflowId?: string;
  workflowCreatedAt?: string;
}

function BulkAnalysisPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const [client, setClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [domainText, setDomainText] = useState('');
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');
  
  // Manual keyword input mode - default to manual if no client
  const [keywordInputMode, setKeywordInputMode] = useState<'target-pages' | 'manual'>(clientId ? 'target-pages' : 'manual');
  const [manualKeywords, setManualKeywords] = useState('');
  
  // DataForSEO modal state
  const [dataForSeoModal, setDataForSeoModal] = useState<{
    isOpen: boolean;
    domainId: string;
    domain: string;
    clientId: string;
    initialResults?: any[];
    totalFound: number;
  }>({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 });
  
  // Experimental features toggle - hidden by default
  const [hideExperimentalFeatures, setHideExperimentalFeatures] = useState(true);
  
  // Store pending changes for target pages
  const [pendingTargetPages, setPendingTargetPages] = useState<string[]>([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  
  // Store notes for domains
  const [domainNotes, setDomainNotes] = useState<{ [domainId: string]: string }>({});
  
  // Filtering options
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'high_quality' | 'average_quality' | 'disqualified'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'has_workflow' | 'no_workflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(50);
  const ITEMS_PER_PAGE = 50;
  
  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [statusFilter, workflowFilter, searchQuery]);

  // Load experimental features preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hideExperimentalFeatures');
    if (stored !== null) {
      setHideExperimentalFeatures(stored === 'true');
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClient(selectedClientId);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (client) {
      loadDomains();
    }
  }, [client]);
  
  // Initialize pending target pages when component mounts or selection changes
  useEffect(() => {
    setPendingTargetPages(selectedTargetPages);
    setHasUnappliedChanges(false);
  }, [keywordInputMode]); // Reset when switching modes

  const loadClients = async () => {
    try {
      const allClients = await clientStorage.getAllClients();
      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClient = async (clientId: string) => {
    try {
      const clientData = await clientStorage.getClient(clientId);
      if (clientData) {
        setClient(clientData);
        // Get target pages
        const pages = (clientData as any)?.targetPages || [];
        setTargetPages(pages.filter((p: any) => p.status === 'active' && p.keywords));
      }
    } catch (error) {
      console.error('Error loading client:', error);
    }
  };

  const loadDomains = async () => {
    if (!client) return;
    try {
      const response = await fetch(`/api/clients/${client.id}/bulk-analysis`);
      if (response.ok) {
        const data = await response.json();
        const loadedDomains = data.domains || [];
        setDomains(loadedDomains);
        
        // Initialize notes from loaded domains
        const notesMap: { [domainId: string]: string } = {};
        loadedDomains.forEach((domain: BulkAnalysisDomain) => {
          if (domain.notes) {
            notesMap[domain.id] = domain.notes;
          }
        });
        setDomainNotes(notesMap);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };
  
  const applyTargetPageChanges = () => {
    setSelectedTargetPages(pendingTargetPages);
    setHasUnappliedChanges(false);
    setMessage('✅ Target page selection applied');
  };
  
  const handleTargetPageToggle = (pageId: string, checked: boolean) => {
    if (checked) {
      setPendingTargetPages([...pendingTargetPages, pageId]);
    } else {
      setPendingTargetPages(pendingTargetPages.filter(id => id !== pageId));
    }
    setHasUnappliedChanges(true);
  };

  const handleAnalyze = async () => {
    if (keywordInputMode === 'target-pages') {
      if (!client || selectedTargetPages.length === 0 || !domainText.trim()) {
        setMessage('Please select target pages and enter domains to analyze');
        return;
      }
    } else {
      if (!manualKeywords.trim() || !domainText.trim()) {
        setMessage('Please enter keywords and domains to analyze');
        return;
      }
    }

    setLoading(true);
    setMessage('');

    try {
      // Parse domains
      const domainList = domainText
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);

      // Check for existing domains (only if client selected)
      if (client) {
        const checkResponse = await fetch(`/api/clients/${client.id}/bulk-analysis/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: domainList })
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          setExistingDomains(checkData.existing || []);
        }
      }

      // Create or update domains (only if using target pages mode and client selected)
      if (keywordInputMode === 'target-pages' && client) {
        const response = await fetch(`/api/clients/${client.id}/bulk-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains: domainList,
            targetPageIds: selectedTargetPages
          })
        });

        if (response.ok) {
          const data = await response.json();
          setDomains(data.domains);
          setDomainText('');
          setMessage(`✅ Added ${data.domains.length} domains for analysis`);
        } else {
          throw new Error('Failed to create domains');
        }
      } else {
        // Manual mode - create temporary domain objects for display
        const tempDomains = domainList.map((domain, index) => ({
          id: `temp-${index}`,
          domain,
          qualificationStatus: 'pending' as const,
          keywordCount: manualKeywords.split(',').length,
          targetPageIds: [],
          checkedBy: undefined,
          checkedAt: undefined,
          notes: undefined
        }));
        
        setDomains(tempDomains);
        setDomainText('');
        setMessage(`✅ Ready to analyze ${tempDomains.length} domains with manual keywords`);
      }
    } catch (error) {
      console.error('Error analyzing domains:', error);
      setMessage('❌ Error analyzing domains');
    } finally {
      setLoading(false);
    }
  };

  const updateQualificationStatus = async (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified') => {
    if (!client) return; // Can't save without client
    
    try {
      const session = AuthService.getSession();
      if (!session) {
        console.error('No user session found');
        setMessage('❌ Please log in to update domain status');
        return;
      }

      const notes = domainNotes[domainId] || '';
      const response = await fetch(`/api/clients/${client.id}/bulk-analysis/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          notes,
          userId: session.userId
        })
      });

      if (response.ok) {
        // Update local state instead of reloading to prevent jumping
        setDomains(prevDomains => 
          prevDomains.map(domain => 
            domain.id === domainId 
              ? { ...domain, qualificationStatus: status, checkedBy: session.userId, checkedAt: new Date().toISOString(), notes }
              : domain
          )
        );
        // Update notes state to reflect saved value
        setDomainNotes(prev => ({ ...prev, [domainId]: notes }));
      } else {
        const errorData = await response.json();
        console.error('Error updating qualification status:', errorData);
        setMessage(`❌ Error updating status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage('❌ Failed to update domain status');
    }
  };
  
  const saveNotes = async (domainId: string) => {
    if (!client) return; // Can't save without client
    
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    
    try {
      const session = AuthService.getSession();
      if (!session) {
        console.error('No user session found');
        setMessage('❌ Please log in to save notes');
        return;
      }

      const notes = domainNotes[domainId] || '';
      const response = await fetch(`/api/clients/${client.id}/bulk-analysis/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: domain.qualificationStatus,
          notes,
          userId: session.userId
        })
      });

      if (response.ok) {
        // Update local state
        setDomains(prevDomains => 
          prevDomains.map(d => 
            d.id === domainId 
              ? { ...d, notes }
              : d
          )
        );
        setMessage('✅ Notes saved');
      } else {
        const errorData = await response.json();
        console.error('Error saving notes:', errorData);
        setMessage(`❌ Error saving notes: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      setMessage('❌ Failed to save notes');
    }
  };

  const createWorkflow = async (domain: BulkAnalysisDomain) => {
    // Navigate to workflow creation with pre-filled domain and notes
    const notes = domain.notes || domainNotes[domain.id] || '';
    const notesParam = notes ? `&notes=${encodeURIComponent(notes)}` : '';
    
    if (client) {
      router.push(`/workflow/new?clientId=${client.id}&guestPostSite=${encodeURIComponent(domain.domain)}${notesParam}`);
    } else {
      router.push(`/workflow/new?guestPostSite=${encodeURIComponent(domain.domain)}${notesParam}`);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }
    
    try {
      const clientIdToUse = client?.id || 'standalone';
      const response = await fetch(`/api/clients/${clientIdToUse}/bulk-analysis/${domainId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }
      
      // Remove from local state
      setDomains(prev => prev.filter(d => d.id !== domainId));
      setMessage('✅ Domain deleted successfully');
    } catch (error) {
      console.error('Error deleting domain:', error);
      setMessage('❌ Failed to delete domain');
    }
  };

  const refreshPendingDomains = async () => {
    if (keywordInputMode !== 'target-pages') {
      setMessage('❌ Refresh only works with target pages mode');
      return;
    }

    if (selectedTargetPages.length === 0) {
      setMessage('❌ Please select target pages to refresh with');
      return;
    }

    if (!client) {
      setMessage('❌ Please select a client first');
      return;
    }

    const pendingCount = domains.filter(d => d.qualificationStatus === 'pending').length;
    if (pendingCount === 0) {
      setMessage('❌ No pending domains to refresh');
      return;
    }

    if (!confirm(`Refresh ${pendingCount} pending domains with the selected target pages and their keywords?`)) {
      return;
    }

    setLoading(true);
    setMessage('🔄 Refreshing pending domains...');

    try {
      const response = await fetch(`/api/clients/${client.id}/bulk-analysis/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPageIds: selectedTargetPages
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reload domains to get updated data
        await loadDomains();
        
        setMessage(`✅ Refreshed ${data.refreshedCount} pending domains with updated keywords`);
      } else {
        throw new Error('Failed to refresh domains');
      }
    } catch (error) {
      console.error('Error refreshing domains:', error);
      setMessage('❌ Error refreshing domains');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithDataForSeo = async (domain: BulkAnalysisDomain) => {
    console.log('DataForSEO button clicked for domain:', domain);
    
    setLoading(true);
    setMessage('🔄 Analyzing with DataForSEO...');
    
    try {
      let url: string;
      let payload: any;
      
      if (client) {
        // Use client-specific endpoint
        url = `/api/clients/${client.id}/bulk-analysis/analyze-dataforseo`;
        
        // Include manual keywords if in manual mode
        const manualKeywordArray = keywordInputMode === 'manual' 
          ? manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
          : undefined;
        
        payload = {
          domainId: domain.id,
          locationCode: 2840, // USA
          languageCode: 'en',
          ...(manualKeywordArray && { manualKeywords: manualKeywordArray })
        };
      } else {
        // Use standalone endpoint for no client selected
        url = `/api/bulk-analysis/analyze-dataforseo`;
        
        // Get keywords based on mode
        let keywords: string[] = [];
        if (keywordInputMode === 'manual') {
          keywords = manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        } else {
          // Can't use target pages without a client
          setMessage('❌ Target pages mode requires a client to be selected');
          setLoading(false);
          return;
        }
        
        payload = {
          domain: domain.domain,
          domainId: domain.id,
          keywords: keywords,
          locationCode: 2840, // USA
          languageCode: 'en'
        };
      }
      
      console.log('Sending request to:', url);
      console.log('Request payload:', payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      if (response.ok) {
        console.log('DataForSEO analysis successful:', data);
        
        if (!data.result) {
          console.error('No result in response:', data);
          setMessage('❌ No results returned from DataForSEO');
          return;
        }
        
        setDataForSeoModal({
          isOpen: true,
          domainId: domain.id,
          domain: domain.domain,
          clientId: client?.id || '',
          initialResults: data.result.keywords || [],
          totalFound: data.result.totalFound || 0
        });
        setMessage('');
      } else {
        console.error('DataForSEO API error:', data);
        setMessage(`❌ DataForSEO error: ${data.details || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('DataForSEO analysis error:', error);
      setMessage(`❌ Failed to analyze with DataForSEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const buildAhrefsUrl = (domain: string, keywords: string[]) => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    if (keywords.length === 0) {
      const positionsParam = selectedPositionRange !== '1-100' ? `&positions=${selectedPositionRange}` : '';
      return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=&keywordRules=&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc&target=${encodeURIComponent(targetUrl)}&urlRules=&volume_type=average`;
    }
    
    // Batch keywords (50 max per URL)
    const keywordBatch = keywords.slice(0, 50);
    const cleanKeywords = keywordBatch.join(', ');
    const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
    const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
    
    const positionsParam = selectedPositionRange !== '1-100' ? `&positions=${selectedPositionRange}` : '';
    let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
    url += `&keywordRules=${keywordRulesEncoded}`;
    url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
    url += `&target=${encodeURIComponent(targetUrl)}`;
    url += `&urlRules=&volume_type=average`;
    
    return url;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {client && (
            <div className="flex items-center mb-4">
              <Link
                href={`/clients/${client.id}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {client.name}
              </Link>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Domain Analysis</h1>
              <p className="text-gray-600 mt-1">Pre-qualify guest post opportunities in bulk</p>
            </div>
          </div>
        </div>

        {/* Client Selector for standalone mode */}
        {!clientId && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Select Client (Optional)</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can optionally select a client to use their target pages' keywords, or just enter keywords manually.
            </p>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No client - Manual keywords only</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {(c as any).targetPages?.length || 0} target pages
                </option>
              ))}
            </select>
          </div>
        )}

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Keyword Source Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">1. Choose Keyword Source</h2>
            
            {/* Mode Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setKeywordInputMode('target-pages')}
                disabled={!client}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  keywordInputMode === 'target-pages'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${!client ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Target Pages {!client && '(Select client)'}
              </button>
              <button
                onClick={() => setKeywordInputMode('manual')}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  keywordInputMode === 'manual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manual Keywords
              </button>
            </div>
          </div>
          
          {keywordInputMode === 'target-pages' ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Choose which target pages to use for keyword analysis. Keywords from selected pages will be combined and deduplicated.
              </p>
          
          {targetPages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No active target pages with keywords found.</p>
              <p className="text-sm mt-2">Please add target pages and generate keywords first.</p>
            </div>
          ) : (
            <>
              {/* Select All Controls */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Select target pages to use their keywords for analysis
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const allPageIds = targetPages
                        .filter(page => (page as any).keywords && (page as any).keywords.trim() !== '')
                        .map(page => page.id);
                      setPendingTargetPages(allPageIds);
                      setHasUnappliedChanges(true);
                    }}
                    className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    Select All ({targetPages.filter(page => (page as any).keywords && (page as any).keywords.trim() !== '').length})
                  </button>
                  <button
                    onClick={() => {
                      setPendingTargetPages([]);
                      setHasUnappliedChanges(true);
                    }}
                    className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {targetPages.map((page) => (
                <label key={page.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pendingTargetPages.includes(page.id)}
                    onChange={(e) => handleTargetPageToggle(page.id, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{page.url}</div>
                    <div className="text-xs text-gray-500">
                      {(page as any).keywords?.split(',').length || 0} keywords
                    </div>
                  </div>
                </label>
                ))}
              </div>
            </>
          )}
          
          {(pendingTargetPages.length > 0 || hasUnappliedChanges) && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                {hasUnappliedChanges ? 'Pending selection' : 'Current selection'}: {pendingTargetPages.length} pages • 
                Total keywords: {
                  targetPages
                    .filter(p => pendingTargetPages.includes(p.id))
                    .reduce((acc, p) => {
                      const keywordList = (p as any).keywords?.split(',').map((k: string) => k.trim()) || [];
                      keywordList.forEach((k: string) => acc.add(k));
                      return acc;
                    }, new Set<string>()).size
                } (deduplicated)
              </div>
              
              {hasUnappliedChanges && (
                <button
                  onClick={applyTargetPageChanges}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Changes
                </button>
              )}
            </div>
          )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter keywords manually for quick research without setting up target pages.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <textarea
                    value={manualKeywords}
                    onChange={(e) => setManualKeywords(e.target.value)}
                    placeholder="seo tools, content marketing, guest posting, link building, digital marketing"
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {manualKeywords && (
                    <p className="text-xs text-gray-500 mt-1">
                      {manualKeywords.split(',').filter(k => k.trim()).length} keywords entered
                    </p>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Quick Research Mode</h4>
                  <p className="text-xs text-blue-800">
                    Perfect for ad-hoc research. Enter any keywords you want to check against domains. 
                    Results won't be saved to the database but you'll get instant Ahrefs analysis.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Domain Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">2. Enter Domains to Analyze</h2>
          <p className="text-sm text-gray-600 mb-4">
            Paste domains to analyze (one per line). Domains will be checked against {
              keywordInputMode === 'manual' 
                ? 'the keywords you entered above'
                : 'keywords from selected target pages'
            }.
          </p>

          {/* Refresh Info Box */}
          {keywordInputMode === 'target-pages' && client && domains.some(d => d.qualificationStatus === 'pending') && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tip: Update Pending Domains</h4>
              <p className="text-xs text-blue-800">
                Have you added new target pages or keywords? Use the "Refresh Pending" button below to update 
                all pending domains with your latest target pages and keywords without re-adding them.
              </p>
            </div>
          )}
          
          <textarea
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            placeholder="example.com\nblog.example.com\nanotherdomain.com"
            className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          {existingDomains.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">Previously checked domains found:</p>
              <ul className="text-sm text-yellow-700 mt-1">
                {existingDomains.map(d => (
                  <li key={d.domain}>• {d.domain} ({d.status})</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || 
                (keywordInputMode === 'target-pages' ? selectedTargetPages.length === 0 : !manualKeywords.trim()) || 
                !domainText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Analyze Domains
                </>
              )}
            </button>

            {keywordInputMode === 'target-pages' && client && domains.filter(d => d.qualificationStatus === 'pending').length > 0 && (
              <button
                onClick={refreshPendingDomains}
                disabled={loading || selectedTargetPages.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                title="Update pending domains with new target pages and keywords"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh Pending ({domains.filter(d => d.qualificationStatus === 'pending').length})
              </button>
            )}
          </div>
        </div>

        {/* Results Grid */}
        {domains.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium">Analysis Results</h2>
              
              <div className="flex items-center gap-4">
                {/* Experimental Features Toggle */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!hideExperimentalFeatures}
                    onChange={(e) => {
                      const newValue = !e.target.checked;
                      setHideExperimentalFeatures(newValue);
                      localStorage.setItem('hideExperimentalFeatures', String(newValue));
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">Show experimental features</span>
                </label>
                
                {/* Position Range Selector */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">Search Position Range</h4>
                    <span className="text-xs text-gray-500">Current: {selectedPositionRange}</span>
                  </div>
                
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { value: '1-10', label: '1-10' },
                    { value: '1-20', label: '1-20' },
                    { value: '1-50', label: '1-50' },
                    { value: '1-100', label: '1-100' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedPositionRange(option.value)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedPositionRange === option.value
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                <p className="text-xs text-gray-600 mt-1">
                  {selectedPositionRange === '1-10' && 'Highest relevance & best rankability'}
                  {selectedPositionRange === '1-20' && 'High relevance & good rankability'}
                  {selectedPositionRange === '1-50' && 'Moderate relevance (recommended)'}
                  {selectedPositionRange === '1-100' && 'All rankings (lowest average rankability)'}
                </p>
              </div>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              {/* Search Bar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Domains</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by domain name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Status Filters */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Filter by Status</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Domains', count: domains.length },
                    { value: 'pending', label: 'Pending Review', count: domains.filter(d => d.qualificationStatus === 'pending').length },
                    { value: 'high_quality', label: 'High Quality', count: domains.filter(d => d.qualificationStatus === 'high_quality').length },
                    { value: 'average_quality', label: 'Average Quality', count: domains.filter(d => d.qualificationStatus === 'average_quality').length },
                    { value: 'disqualified', label: 'Disqualified', count: domains.filter(d => d.qualificationStatus === 'disqualified').length }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value as any)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        statusFilter === filter.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow Filters */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Filter by Workflow Status</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All', count: domains.length },
                    { value: 'has_workflow', label: 'Has Workflow', count: domains.filter(d => d.hasWorkflow).length },
                    { value: 'no_workflow', label: 'No Workflow', count: domains.filter(d => !d.hasWorkflow).length }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setWorkflowFilter(filter.value as any)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        workflowFilter === filter.value
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid gap-4">
              {(() => {
                const filteredDomains = domains.filter(domain => {
                  // Status filter
                  if (statusFilter !== 'all' && domain.qualificationStatus !== statusFilter) return false;
                  
                  // Workflow filter
                  if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
                  if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
                  
                  // Search filter
                  if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  
                  return true;
                });
                
                const paginatedDomains = filteredDomains.slice(0, displayLimit);
                const hasMore = filteredDomains.length > displayLimit;
                
                return (
                  <>
                    {paginatedDomains.map((domain) => {
                // Get keywords based on mode
                let keywords: Set<string>;
                if (keywordInputMode === 'manual') {
                  // Use manual keywords
                  keywords = new Set(
                    manualKeywords
                      .split(',')
                      .map(k => k.trim())
                      .filter(k => k.length > 0)
                  );
                } else {
                  // Get keywords for this domain's target pages
                  keywords = targetPages
                    .filter(p => domain.targetPageIds.includes(p.id))
                    .reduce((acc, p) => {
                      const pageKeywords = (p as any).keywords?.split(',').map((k: string) => k.trim()) || [];
                      pageKeywords.forEach((k: string) => acc.add(k));
                      return acc;
                    }, new Set<string>());
                }
                
                const keywordArray = Array.from(keywords);
                
                // Group keywords by topical relevance
                const keywordGroups = groupKeywordsByTopic(keywordArray);
                const groupedUrls = generateGroupedAhrefsUrls(domain.domain, keywordGroups, selectedPositionRange);
                
                return (
                  <div key={domain.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{domain.domain}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {domain.keywordCount} keywords • 
                          {domain.targetPageIds.length} target pages
                        </p>
                        
                        
                        <div className="mt-3">
                          {/* Keyword groups */}
                          {groupedUrls.length > 0 ? (
                            <div>
                              <div className="space-y-2">
                                {groupedUrls.map((group, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <a
                                    href={group.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center px-3 py-1 text-white text-sm rounded hover:opacity-90 transition-opacity ${
                                      group.relevance === 'core' 
                                        ? 'bg-green-600' 
                                        : group.relevance === 'related'
                                        ? 'bg-blue-600'
                                        : 'bg-gray-600'
                                    }`}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {group.name}
                                  </a>
                                  <span className="text-xs text-gray-500">
                                    {group.keywordCount} keywords
                                  </span>
                                  {group.relevance === 'core' && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">Premium</span>
                                  )}
                                  {group.relevance === 'related' && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Good</span>
                                  )}
                                </div>
                              ))}
                              </div>
                              
                              {/* Open All and Open by Type buttons */}
                              {groupedUrls.length > 1 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      // Reverse order so user lands on first tab
                                      [...groupedUrls].reverse().forEach((group, index) => {
                                        setTimeout(() => {
                                          window.open(group.url, '_blank');
                                        }, index * 200); // Small delay to prevent popup blocker
                                      });
                                    }}
                                    className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Open All ({groupedUrls.length})
                                  </button>
                                  
                                  {groupedUrls.filter(g => g.relevance === 'core').length > 0 && (
                                    <button
                                      onClick={() => {
                                        // Reverse order so user lands on first tab
                                        [...groupedUrls]
                                          .filter(g => g.relevance === 'core')
                                          .reverse()
                                          .forEach((group, index) => {
                                            setTimeout(() => {
                                              window.open(group.url, '_blank');
                                            }, index * 200);
                                          });
                                      }}
                                      className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Open Premium ({groupedUrls.filter(g => g.relevance === 'core').length})
                                    </button>
                                  )}
                                  
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No keywords available</span>
                          )}
                          
                          {/* DataForSEO button only if experimental features enabled */}
                          {!hideExperimentalFeatures && (
                            <button
                              onClick={() => {
                                console.log('DataForSEO button onClick triggered');
                                analyzeWithDataForSeo(domain);
                              }}
                              disabled={loading}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                              title={`Analyze ${domain.domain} with DataForSEO`}
                            >
                              <Search className="w-3 h-3 mr-1" />
                              {loading ? 'Loading...' : 'DataForSEO'}
                            </button>
                          )}
                          
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-start space-x-4">
                        {/* Notes section - compact */}
                        <div className="flex-1">
                          <div className="relative">
                            <textarea
                              value={domainNotes[domain.id] || ''}
                              onChange={(e) => {
                                setDomainNotes(prev => ({
                                  ...prev,
                                  [domain.id]: e.target.value
                                }));
                              }}
                              placeholder="Notes..."
                              className="w-48 h-20 px-2 py-1 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            />
                            {client && domain.notes !== domainNotes[domain.id] && (
                              <button
                                onClick={() => saveNotes(domain.id)}
                                className="absolute bottom-1 right-1 text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Qualification buttons - cleaner design */}
                        <div className="flex flex-col space-y-1.5 min-w-[140px]">
                          {domain.qualificationStatus === 'pending' ? (
                            <>
                              <button
                                onClick={() => updateQualificationStatus(domain.id, 'high_quality')}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                              >
                                High Quality
                              </button>
                              <button
                                onClick={() => updateQualificationStatus(domain.id, 'average_quality')}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                              >
                                Average
                              </button>
                              <button
                                onClick={() => updateQualificationStatus(domain.id, 'disqualified')}
                                className="px-3 py-1.5 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors"
                              >
                                Disqualify
                              </button>
                            </>
                          ) : (
                            <div className="space-y-2">
                              {domain.qualificationStatus === 'high_quality' && (
                                <>
                                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded cursor-pointer hover:bg-green-200 group relative" 
                                        onClick={() => updateQualificationStatus(domain.id, 'pending' as any)}
                                        title="Click to reset to pending">
                                    High Quality
                                    <RotateCcw className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity inline" />
                                  </span>
                                  {!domain.hasWorkflow && (
                                    <button
                                      onClick={() => createWorkflow(domain)}
                                      className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Workflow
                                    </button>
                                  )}
                                </>
                              )}
                              {domain.qualificationStatus === 'average_quality' && (
                                <>
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded cursor-pointer hover:bg-blue-200 group relative" 
                                        onClick={() => updateQualificationStatus(domain.id, 'pending' as any)}
                                        title="Click to reset to pending">
                                    Average
                                    <RotateCcw className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity inline" />
                                  </span>
                                  {!domain.hasWorkflow && (
                                    <button
                                      onClick={() => createWorkflow(domain)}
                                      className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Workflow
                                    </button>
                                  )}
                                </>
                              )}
                              {domain.qualificationStatus === 'disqualified' && (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded cursor-pointer hover:bg-gray-200 group relative" 
                                      onClick={() => updateQualificationStatus(domain.id, 'pending' as any)}
                                      title="Click to reset to pending">
                                  Disqualified
                                  <RotateCcw className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity inline" />
                                </span>
                              )}
                              {domain.hasWorkflow && (
                                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Has Workflow
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Delete button */}
                          <button
                            onClick={() => deleteDomain(domain.id)}
                            className="mt-2 px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors flex items-center justify-center w-full"
                            title="Delete domain"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                    
                    {/* Show More Button */}
                    {hasMore && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setDisplayLimit(displayLimit + ITEMS_PER_PAGE)}
                          className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Show More ({filteredDomains.length - paginatedDomains.length} remaining)
                        </button>
                      </div>
                    )}
                    
                    {/* Results Summary */}
                    <div className="mt-4 text-center text-sm text-gray-600">
                      Showing {paginatedDomains.length} of {filteredDomains.length} domains
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* DataForSEO Results Modal */}
      {dataForSeoModal.isOpen && (
        <DataForSeoResultsModal
          isOpen={dataForSeoModal.isOpen}
          onClose={() => setDataForSeoModal({ ...dataForSeoModal, isOpen: false })}
          domain={dataForSeoModal.domain}
          domainId={dataForSeoModal.domainId}
          clientId={dataForSeoModal.clientId}
          initialResults={dataForSeoModal.initialResults}
          totalFound={dataForSeoModal.totalFound}
        />
      )}
    </div>
  );
}

export default function BulkAnalysisPage() {
  return (
    <AuthWrapper>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }>
        <BulkAnalysisPageContent />
      </Suspense>
    </AuthWrapper>
  );
}