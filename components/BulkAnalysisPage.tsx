'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client, TargetPage } from '@/types/user';
import { DataForSeoResultsModal } from '@/components/DataForSeoResultsModal';
import { groupKeywordsByTopic, generateGroupedAhrefsUrls } from '@/lib/utils/keywordGrouping';
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
  Users,
  Trash2,
  Search
} from 'lucide-react';

interface BulkAnalysisDomain {
  id: string;
  domain: string;
  qualificationStatus: 'pending' | 'high_quality' | 'average_quality' | 'disqualified';
  keywordCount: number;
  targetPageIds: string[];
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  workflowId?: string;
}

interface BulkAnalysisPageProps {
  initialClientId?: string; // From route params for /clients/[id]/bulk-analysis
}

export default function BulkAnalysisPage({ initialClientId }: BulkAnalysisPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Client management - can be from props, URL params, or dropdown selection
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClientId || searchParams.get('clientId') || null
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [pendingTargetPages, setPendingTargetPages] = useState<string[]>([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [domainText, setDomainText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [domainNotes, setDomainNotes] = useState<Record<string, string>>({});
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  
  // Manual keyword input mode
  const [keywordInputMode, setKeywordInputMode] = useState<'target-pages' | 'manual'>(
    selectedClientId ? 'target-pages' : 'manual'
  );
  const [manualKeywords, setManualKeywords] = useState('');
  
  // Filtering and pagination
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'high_quality' | 'average_quality' | 'disqualified'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'has_workflow' | 'no_workflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;
  
  // Experimental features
  const [hideExperimentalFeatures, setHideExperimentalFeatures] = useState(false);
  
  // DataForSEO modal
  const [dataForSeoModal, setDataForSeoModal] = useState<{
    isOpen: boolean;
    domainId: string;
    domain: string;
    clientId: string;
    initialResults?: any[];
    totalFound?: number;
  }>({ isOpen: false, domainId: '', domain: '', clientId: '' });

  // Load experimental features preference
  useEffect(() => {
    const stored = localStorage.getItem('hideExperimentalFeatures');
    setHideExperimentalFeatures(stored === 'true');
  }, []);

  // Load all clients on mount
  useEffect(() => {
    const allClients = clientStorage.getAllClients();
    setClients(allClients);
  }, []);

  // Handle client selection and loading
  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'standalone') {
      const selectedClient = clientStorage.getClient(selectedClientId);
      if (selectedClient) {
        setClient(selectedClient);
        // Update URL if needed
        if (!initialClientId) {
          router.push(`/bulk-analysis?clientId=${selectedClientId}`);
        }
      } else {
        setClient(null);
        setSelectedClientId(null);
      }
    } else {
      setClient(null);
    }
  }, [selectedClientId, initialClientId, router]);

  // Fetch domains when client changes or filters change
  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'standalone') {
      fetchDomains();
    } else {
      setDomains([]);
      setTargetPages([]);
    }
  }, [selectedClientId, statusFilter, workflowFilter, searchQuery, page]);

  // Load target pages when client is selected
  useEffect(() => {
    if (client) {
      const pages = client.targetPages.filter(page => 
        page.status === 'active' && 
        page.keywords && 
        page.keywords.length > 0
      );
      setTargetPages(pages);
    } else {
      setTargetPages([]);
      setSelectedTargetPages([]);
    }
  }, [client]);

  const fetchDomains = async () => {
    if (!selectedClientId || selectedClientId === 'standalone') return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(workflowFilter !== 'all' && { hasWorkflow: workflowFilter === 'has_workflow' ? 'true' : 'false' }),
        ...(searchQuery && { search: searchQuery })
      });
      
      const response = await fetch(`/api/clients/${selectedClientId}/bulk-analysis?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDomains(prev => page === 1 ? data.domains : [...prev, ...data.domains]);
        setHasMore(data.hasMore);
        
        // Initialize notes
        const notesMap: Record<string, string> = {};
        data.domains.forEach((d: BulkAnalysisDomain) => {
          if (d.notes) notesMap[d.id] = d.notes;
        });
        setDomainNotes(prev => ({ ...prev, ...notesMap }));
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
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
          // Refresh all domains to avoid replacing existing ones
          await fetchDomains();
          setDomainText('');
          setMessage(`✅ Added ${data.domains.length} domains for analysis`);
        } else {
          throw new Error('Failed to create domains');
        }
      } else {
        // Manual mode - create temporary domain objects for display
        const tempDomains = domainList.map((domain, index) => ({
          id: `temp-${Date.now()}-${index}`,
          domain,
          qualificationStatus: 'pending' as const,
          keywordCount: manualKeywords.split(',').filter(k => k.trim()).length,
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

      let data;
      try {
        data = await response.json();
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

  const updateQualificationStatus = async (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified') => {
    if (!client) {
      setMessage('❌ Client required to save qualification status');
      return;
    }
    
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
          userId: session.userId,
          notes: notes
        })
      });

      if (response.ok) {
        setDomains(prevDomains => 
          prevDomains.map(d => 
            d.id === domainId 
              ? { ...d, qualificationStatus: status, checkedBy: session.userId, checkedAt: new Date().toISOString() }
              : d
          )
        );
        
        if (status === 'high_quality' || status === 'average_quality') {
          setTimeout(() => {
            window.open(
              `/clients/${client.id}/workflows/new?domain=${encodeURIComponent(
                domains.find(d => d.id === domainId)?.domain || ''
              )}&notes=${encodeURIComponent(notes)}`,
              '_blank'
            );
          }, 100);
        }
      } else {
        const errorData = await response.json();
        console.error('Error updating status:', errorData);
        setMessage(`❌ Error updating status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating qualification status:', error);
      setMessage('❌ Failed to update qualification status');
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!client || domainId.startsWith('temp-')) {
      // For temp domains, just remove from state
      setDomains(prev => prev.filter(d => d.id !== domainId));
      setMessage('✅ Domain removed');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/clients/${client.id}/bulk-analysis/${domainId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
        setMessage('✅ Domain deleted successfully');
      } else {
        throw new Error('Failed to delete domain');
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
      setMessage('❌ Failed to delete domain');
    }
  };

  // Render the unified bulk analysis UI
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with client selector or back button */}
          <div className="mb-8">
            {initialClientId ? (
              // Client-specific route - show back button
              <Link 
                href={`/clients/${initialClientId}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Client
              </Link>
            ) : (
              // Standalone route - show client selector
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client (Optional)
                </label>
                <select
                  value={selectedClientId || ''}
                  onChange={(e) => setSelectedClientId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Client - Standalone Analysis</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-gray-900">
              Bulk Domain Analysis
              {client && ` - ${client.name}`}
            </h1>
          </div>

          {/* Rest of the UI remains the same as standalone version */}
          {/* ... All the existing UI components ... */}
          
        </main>
      </div>
    </AuthWrapper>
  );
}