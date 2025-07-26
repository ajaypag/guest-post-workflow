'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client, TargetPage } from '@/types/user';
import { groupKeywordsByTopic, generateGroupedAhrefsUrls } from '@/lib/utils/keywordGroupingV2';
import DataForSeoResultsModal from '@/components/DataForSeoResultsModal';
import BulkAnalysisResultsModal from '@/components/BulkAnalysisResultsModal';
import AIQualificationModal from '@/components/AIQualificationModal';
import BulkAnalysisTutorial from '@/components/BulkAnalysisTutorial';
import BulkAnalysisTable from '@/components/BulkAnalysisTable';
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
  RotateCcw,
  Trash2,
  Search,
  Download
} from 'lucide-react';

import { BulkAnalysisDomain } from '@/types/bulk-analysis';

export default function BulkAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [domainText, setDomainText] = useState('');
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');
  
  // Manual keyword input mode
  const [keywordInputMode, setKeywordInputMode] = useState<'target-pages' | 'manual'>('target-pages');
  const [manualKeywords, setManualKeywords] = useState('');
  
  // Filtering options
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'high_quality' | 'average_quality' | 'disqualified'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'has_workflow' | 'no_workflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(50);
  const ITEMS_PER_PAGE = 50;
  
  // DataForSEO modal state
  const [dataForSeoModal, setDataForSeoModal] = useState<{
    isOpen: boolean;
    domainId: string;
    domain: string;
    clientId: string;
    initialResults?: any[];
    totalFound: number;
    cacheInfo?: any;
  }>({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 });
  
  // Experimental features toggle - shown by default
  const [hideExperimentalFeatures, setHideExperimentalFeatures] = useState(false);
  
  // Multi-select state for bulk operations
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [bulkAnalysisRunning, setBulkAnalysisRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResultsModal, setBulkResultsModal] = useState<{
    isOpen: boolean;
    jobId: string;
    analyzedDomains: Array<{ id: string; domain: string }>;
  }>({ isOpen: false, jobId: '', analyzedDomains: [] });
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsJobId, setResultsJobId] = useState<string | null>(null);
  
  // Keyword clustering state
  const [showKeywordClusters, setShowKeywordClusters] = useState(false);
  const [keywordClusters, setKeywordClusters] = useState<Array<{
    name: string;
    keywords: string[];
    relevance: 'core' | 'related' | 'wider';
    priority: number;
    selected: boolean;
  }>>([]);
  
  // AI Qualification state
  const [showAIQualification, setShowAIQualification] = useState(false);
  const [aiQualificationDomains, setAIQualificationDomains] = useState<Array<{ id: string; domain: string }>>([]);
  
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
    loadClient();
  }, [params.id]);

  useEffect(() => {
    if (client) {
      loadDomains();
    }
  }, [client]);

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
      
      // Get target pages
      const pages = (clientData as any)?.targetPages || [];
      setTargetPages(pages.filter((p: any) => p.status === 'active' && p.keywords));
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const loadDomains = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis`);
      if (response.ok) {
        const data = await response.json();
        // Add clientId to each domain
        const domainsWithClientId = (data.domains || []).map((d: any) => ({
          ...d,
          clientId: params.id
        }));
        setDomains(domainsWithClientId);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  // Selection helpers
  const toggleDomainSelection = (domainId: string) => {
    const newSelection = new Set(selectedDomains);
    if (newSelection.has(domainId)) {
      newSelection.delete(domainId);
    } else {
      newSelection.add(domainId);
    }
    setSelectedDomains(newSelection);
  };

  const selectAll = (domainIds: string[]) => {
    setSelectedDomains(new Set(domainIds));
  };

  const clearSelection = () => {
    setSelectedDomains(new Set());
  };

  const startAIQualification = () => {
    const selectedDomainList = domains
      .filter(d => selectedDomains.has(d.id))
      .map(d => ({ id: d.id, domain: d.domain }));
    
    setAIQualificationDomains(selectedDomainList);
    setShowAIQualification(true);
  };

  const handleAIQualificationComplete = async (results: any[]) => {
    // Reload domains to get updated qualifications
    await loadDomains();
    setMessage(`✅ AI qualification applied to ${results.length} domains`);
    setSelectedDomains(new Set());
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

      // Check for existing domains
      const checkResponse = await fetch(`/api/clients/${params.id}/bulk-analysis/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainList })
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        setExistingDomains(checkData.existing || []);
      }

      // Create or update domains
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: domainList,
          targetPageIds: keywordInputMode === 'target-pages' ? selectedTargetPages : [],
          manualKeywords: keywordInputMode === 'manual' ? manualKeywords : undefined
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
    } catch (error) {
      console.error('Error analyzing domains:', error);
      setMessage('❌ Error analyzing domains');
    } finally {
      setLoading(false);
    }
  };

  const updateQualificationStatus = async (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified') => {
    try {
      const session = AuthService.getSession();
      if (!session) {
        console.error('No user session found');
        return;
      }

      const domainNotes = notes[domainId] || '';
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: session.userId, notes: domainNotes })
      });

      if (response.ok) {
        // Update local state instead of reloading from server to prevent "jumping"
        setDomains(prevDomains => 
          prevDomains.map(domain => 
            domain.id === domainId 
              ? { ...domain, qualificationStatus: status, checkedBy: session.userId, checkedAt: new Date().toISOString(), notes: domainNotes }
              : domain
          )
        );
        // Also update the notes state to reflect saved value
        setNotes(prev => ({ ...prev, [domainId]: domainNotes }));
      } else {
        const errorData = await response.json();
        console.error('Error updating qualification status:', errorData);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const createWorkflow = async (domain: BulkAnalysisDomain) => {
    // Navigate to workflow creation with pre-filled domain and notes
    const domainNotes = domain.notes || notes[domain.id] || '';
    router.push(`/workflow/new?clientId=${client?.id}&guestPostSite=${encodeURIComponent(domain.domain)}&notes=${encodeURIComponent(domainNotes)}`);
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
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
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/refresh`, {
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

  const startBulkDataForSeoAnalysis = async () => {
    if (selectedDomains.size === 0) {
      setMessage('Please select domains to analyze');
      return;
    }

    // Get keywords based on current mode
    let keywords: string[] = [];
    if (keywordInputMode === 'manual' && manualKeywords.trim()) {
      keywords = manualKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    } else if (keywordInputMode === 'target-pages') {
      // Collect all keywords from selected target pages
      const selectedPages = targetPages.filter(p => selectedTargetPages.includes(p.id));
      const keywordSet = new Set<string>();
      
      selectedPages.forEach(page => {
        const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
        pageKeywords.forEach((k: string) => keywordSet.add(k));
      });
      
      keywords = Array.from(keywordSet);
    }

    if (keywords.length === 0) {
      setMessage('No keywords found. Please select target pages with keywords or enter manual keywords.');
      return;
    }

    // Group keywords by topic
    const groups = groupKeywordsByTopic(keywords);
    const clustersWithSelection = groups.map(group => ({
      ...group,
      selected: true // Default all clusters to selected
    }));
    
    setKeywordClusters(clustersWithSelection);
    setShowKeywordClusters(true);
    setMessage(`Found ${keywords.length} keywords grouped into ${groups.length} clusters`);
  };

  const executeDataForSeoAnalysis = async () => {
    // Get selected keywords from clusters
    const selectedKeywords = keywordClusters
      .filter(cluster => cluster.selected)
      .flatMap(cluster => cluster.keywords);

    if (selectedKeywords.length === 0) {
      setMessage('Please select at least one keyword cluster');
      return;
    }

    setShowKeywordClusters(false);
    setBulkAnalysisRunning(true);
    setBulkProgress({ current: 0, total: selectedDomains.size });
    setMessage(`🚀 Starting analysis for ${selectedDomains.size} domains with ${selectedKeywords.length} keywords...`);

    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/dataforseo/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domainIds: Array.from(selectedDomains),
          keywords: selectedKeywords,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start bulk analysis');
      }

      const { jobId, totalDomains } = await response.json();
      
      setBulkProgress({ current: 0, total: totalDomains });
      setMessage(`⏳ Analyzing ${totalDomains} domains...`);
      
      // Start polling for job status
      pollJobStatus(jobId);
      
    } catch (error: any) {
      console.error('Bulk analysis error:', error);
      setMessage(`❌ Bulk analysis failed: ${error.message}`);
      setBulkAnalysisRunning(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/clients/${params.id}/bulk-analysis/dataforseo/batch?jobId=${jobId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        const { job, items } = data;

        // Update progress
        console.log('Job status update:', {
          status: job.status,
          processedDomains: job.processedDomains,
          totalDomains: job.totalDomains,
          bulkAnalysisRunning
        });
        setBulkProgress({
          current: job.processedDomains || 0,
          total: job.totalDomains || 0
        });

        // Update message
        if (job.status === 'processing') {
          setMessage(`⏳ Processing: ${job.processedDomains}/${job.totalDomains} domains analyzed`);
        } else if (job.status === 'completed') {
          clearInterval(pollInterval);
          
          // Store analyzed domains before clearing selection
          const analyzedDomains = domains.filter(d => selectedDomains.has(d.id)).map(d => ({ id: d.id, domain: d.domain }));
          
          setMessage(
            `✅ Analysis complete! Analyzed ${job.totalKeywordsAnalyzed} keywords, found ${job.totalRankingsFound} rankings.`
          );
          setBulkAnalysisRunning(false);
          setCompletedJobId(jobId);
          
          // Store job ID and domains for later viewing (but don't open modal automatically)
          setBulkResultsModal({ isOpen: false, jobId, analyzedDomains });
          clearSelection();
          
          // Reload domains to show updated data
          loadDomains();
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setMessage(`❌ Bulk analysis failed`);
          setBulkAnalysisRunning(false);
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
        setBulkAnalysisRunning(false);
      }
    }, 2000); // Poll every 2 seconds

    // Store interval ID for cleanup
    return () => clearInterval(pollInterval);
  };

  const analyzeWithDataForSeo = async (domain: BulkAnalysisDomain) => {
    console.log('DataForSEO button clicked for domain:', domain);
    
    setLoading(true);
    setMessage('🔄 Analyzing with DataForSEO...');
    
    try {
      // Include manual keywords if in manual mode
      const manualKeywordArray = keywordInputMode === 'manual' 
        ? manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : undefined;
      
      const payload = {
        domainId: domain.id,
        locationCode: 2840, // USA
        languageCode: 'en',
        ...(manualKeywordArray && { manualKeywords: manualKeywordArray })
      };
      
      console.log('Sending request to:', `/api/clients/${params.id}/bulk-analysis/analyze-dataforseo`);
      console.log('Request payload:', payload);
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/analyze-dataforseo`, {
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
          clientId: params.id as string,
          initialResults: data.result.keywords || [],
          totalFound: data.result.totalFound || 0,
          cacheInfo: data.result.cacheInfo
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

  if (!client) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div>Loading...</div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href={`/clients/${client.id}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {client.name}
              </Link>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk Domain Analysis</h1>
                <p className="text-gray-600 mt-1">Pre-qualify guest post opportunities in bulk</p>
              </div>
            </div>
          </div>

          {/* Tutorial Video */}
          <BulkAnalysisTutorial />

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
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    keywordInputMode === 'target-pages'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Target Pages
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
                        setSelectedTargetPages(allPageIds);
                      }}
                      className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                      Select All ({targetPages.filter(page => (page as any).keywords && (page as any).keywords.trim() !== '').length})
                    </button>
                    <button
                      onClick={() => setSelectedTargetPages([])}
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
                      checked={selectedTargetPages.includes(page.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTargetPages([...selectedTargetPages, page.id]);
                        } else {
                          setSelectedTargetPages(selectedTargetPages.filter(id => id !== page.id));
                        }
                      }}
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
            
            {selectedTargetPages.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedTargetPages.length} pages • 
                Total keywords: {
                  targetPages
                    .filter(p => selectedTargetPages.includes(p.id))
                    .reduce((acc, p) => {
                      const keywordList = (p as any).keywords?.split(',').map((k: string) => k.trim()) || [];
                      keywordList.forEach((k: string) => acc.add(k));
                      return acc;
                    }, new Set<string>()).size
                } (deduplicated)
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
            {keywordInputMode === 'target-pages' && domains.some(d => d.qualificationStatus === 'pending') && (
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

            {/* Message Display */}
            {message && (
              <div className={`mt-3 p-3 rounded-lg ${
                message.startsWith('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
                message.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
                message.startsWith('⏳') || message.startsWith('🔄') || message.startsWith('🚀') ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                'bg-gray-50 border border-gray-200 text-gray-800'
              }`}>
                <p className="text-sm">{message}</p>
                
                {/* Progress Bar for Bulk Analysis */}
                {bulkAnalysisRunning && bulkProgress.total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* View Results Button */}
                {completedJobId && message.includes('Analysis complete') && (
                  <button
                    onClick={() => {
                      setBulkResultsModal({ ...bulkResultsModal, isOpen: true });
                      setCompletedJobId(null);
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    View Results
                  </button>
                )}
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

              {keywordInputMode === 'target-pages' && domains.filter(d => d.qualificationStatus === 'pending').length > 0 && (
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
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium">Analysis Results</h2>
                  {/* Select All Checkbox */}
                  {(() => {
                    const filteredDomains = domains.filter(domain => {
                      if (statusFilter !== 'all' && domain.qualificationStatus !== statusFilter) return false;
                      if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
                      if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
                      if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                      return true;
                    });
                    const allSelected = filteredDomains.length > 0 && 
                      filteredDomains.every(d => selectedDomains.has(d.id));
                    
                    return filteredDomains.length > 0 ? (
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => {
                            if (allSelected) {
                              clearSelection();
                            } else {
                              selectAll(filteredDomains.map(d => d.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        Select all {filteredDomains.length} domains
                      </label>
                    ) : null;
                  })()}
                </div>
                
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

                {/* Experimental Features Toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!hideExperimentalFeatures}
                      onChange={(e) => {
                        const hide = !e.target.checked;
                        setHideExperimentalFeatures(hide);
                        localStorage.setItem('hideExperimentalFeatures', hide.toString());
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Show Experimental Features</span>
                  </label>
                  {!hideExperimentalFeatures && (
                    <span className="text-xs text-gray-500">
                      Enables DataForSEO keyword analysis
                    </span>
                  )}
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

              {/* Bulk Actions Bar */}
              {selectedDomains.size > 0 && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedDomains.size} domain{selectedDomains.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {!hideExperimentalFeatures && (
                        <>
                          <button
                            onClick={startBulkDataForSeoAnalysis}
                            disabled={bulkAnalysisRunning}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            {bulkAnalysisRunning ? 'Analyzing...' : 'Analyze Selected with DataForSEO'}
                          </button>
                          <button
                            onClick={startAIQualification}
                            disabled={bulkAnalysisRunning}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Qualify Selected
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          // TODO: Export selected domains
                          setMessage('🚧 Export selected domains coming soon!');
                        }}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyword Cluster Selection Modal */}
              {showKeywordClusters && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="p-6 border-b">
                      <h2 className="text-xl font-semibold">Select Keyword Clusters for Analysis</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Keywords have been grouped into topical clusters. Select which clusters to analyze with DataForSEO.
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                        {/* Select All/None buttons */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-gray-600">
                            {keywordClusters.filter(c => c.selected).length} of {keywordClusters.length} clusters selected • 
                            {' '}{keywordClusters.filter(c => c.selected).flatMap(c => c.keywords).length} keywords
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setKeywordClusters(clusters => 
                                clusters.map(c => ({ ...c, selected: true }))
                              )}
                              className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => setKeywordClusters(clusters => 
                                clusters.map(c => ({ ...c, selected: false }))
                              )}
                              className="text-sm px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        {/* Cluster list */}
                        {keywordClusters.map((cluster, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cluster.selected}
                                onChange={(e) => {
                                  setKeywordClusters(clusters => 
                                    clusters.map((c, i) => 
                                      i === index ? { ...c, selected: e.target.checked } : c
                                    )
                                  );
                                }}
                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{cluster.name}</h3>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    cluster.relevance === 'core' 
                                      ? 'bg-green-100 text-green-800' 
                                      : cluster.relevance === 'related'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {cluster.relevance === 'core' ? 'Premium' : 
                                     cluster.relevance === 'related' ? 'Good' : 'Standard'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {cluster.keywords.length} keywords
                                  </span>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  <div className="line-clamp-2">
                                    {cluster.keywords.slice(0, 5).join(', ')}
                                    {cluster.keywords.length > 5 && ` +${cluster.keywords.length - 5} more`}
                                  </div>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 border-t bg-gray-50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setShowKeywordClusters(false);
                            setKeywordClusters([]);
                          }}
                          className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeDataForSeoAnalysis}
                          disabled={!keywordClusters.some(c => c.selected)}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Analyze Selected Clusters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Domain Table */}
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
                    <BulkAnalysisTable
                      domains={paginatedDomains}
                      targetPages={targetPages}
                      selectedDomains={selectedDomains}
                      onToggleSelection={toggleDomainSelection}
                      onUpdateStatus={updateQualificationStatus}
                      onCreateWorkflow={createWorkflow}
                      onDeleteDomain={deleteDomain}
                      onAnalyzeWithDataForSeo={analyzeWithDataForSeo}
                      onUpdateNotes={async (domainId, notes) => {
                        // Save notes
                        try {
                          const session = AuthService.getSession();
                          if (!session) {
                            console.error('No user session found');
                            return;
                          }

                          const domain = domains.find(d => d.id === domainId);
                          if (!domain) return;

                          const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              status: domain.qualificationStatus, 
                              userId: session.userId, 
                              notes: notes 
                            })
                          });

                          if (response.ok) {
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
                      }}
                      selectedPositionRange={selectedPositionRange}
                      hideExperimentalFeatures={hideExperimentalFeatures}
                      loading={loading}
                      keywordInputMode={keywordInputMode}
                      manualKeywords={manualKeywords}
                    />
                    
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
          )}
        </div>
      </div>
      
      {/* DataForSEO Results Modal */}
      {dataForSeoModal.isOpen && (
        <DataForSeoResultsModal
          isOpen={dataForSeoModal.isOpen}
          onClose={() => setDataForSeoModal({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 })}
          domainId={dataForSeoModal.domainId}
          domain={dataForSeoModal.domain}
          clientId={dataForSeoModal.clientId}
          initialResults={dataForSeoModal.initialResults}
          totalFound={dataForSeoModal.totalFound}
          cacheInfo={dataForSeoModal.cacheInfo}
        />
      )}
      
      {/* Bulk Analysis Results Modal */}
      {bulkResultsModal.isOpen && (
        <BulkAnalysisResultsModal
          isOpen={bulkResultsModal.isOpen}
          onClose={() => setBulkResultsModal({ isOpen: false, jobId: '', analyzedDomains: [] })}
          jobId={bulkResultsModal.jobId}
          domains={bulkResultsModal.analyzedDomains}
        />
      )}

      {/* AI Qualification Modal */}
      {showAIQualification && (
        <AIQualificationModal
          isOpen={showAIQualification}
          onClose={() => setShowAIQualification(false)}
          clientId={params.id as string}
          domains={aiQualificationDomains}
          onComplete={handleAIQualificationComplete}
        />
      )}
    </AuthWrapper>
  );
}