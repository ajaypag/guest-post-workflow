'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client, TargetPage } from '@/types/user';
import { groupKeywordsByTopic, generateGroupedAhrefsUrls } from '@/lib/utils/keywordGroupingV2';
import DataForSeoResultsModal from '@/components/DataForSeoResultsModal';
import BulkAnalysisResultsModal from '@/components/BulkAnalysisResultsModal';
import BulkAnalysisTable from '@/components/BulkAnalysisTable';
import GuidedTriageFlow from '@/components/GuidedTriageFlow';
import { MultiSelect, MultiSelectOption } from '@/components/ui/MultiSelect';
import MoveToProjectDialog from '@/components/bulk-analysis/MoveToProjectDialog';
import { MessageDisplay } from '@/components/bulk-analysis/MessageDisplay';
import WebsiteDetailModal from '@/components/websites/WebsiteDetailModal';
import InlineDatabaseSelector from '@/components/bulk-analysis/InlineDatabaseSelector';
import { BulkAnalysisProject } from '@/types/bulk-analysis-projects';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { ProcessedWebsite } from '@/types/airtable';
import OrderSelectionModal from '@/components/orders/OrderSelectionModal';
import DomainAssignmentModal from '@/components/orders/DomainAssignmentModal';
import DuplicateResolutionModal from '@/components/ui/DuplicateResolutionModal';
import { OrderBadgeDisplay } from '@/components/bulk-analysis/OrderBadgeDisplay';
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
  ChevronDown,
  Search,
  Download,
  Folder,
  Settings,
  Edit,
  ArrowRight,
  Zap,
  Sparkles,
  FolderOpen,
  Brain,
  X,
  Database
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<BulkAnalysisProject | null>(null);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [domainText, setDomainText] = useState('');
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');
  const [userType, setUserType] = useState<string>('');
  
  // Manual keyword input mode
  const [keywordInputMode, setKeywordInputMode] = useState<'target-pages' | 'manual'>('target-pages');
  const [manualKeywords, setManualKeywords] = useState('');
  
  // Filtering options
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'has_workflow' | 'no_workflow'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'human_verified' | 'ai_qualified' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'createdAt' | 'domain' | 'updatedAt' | 'qualificationStatus' | 'hasDataForSeoResults' | 'hasWorkflow' | 'keywordCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(50);
  const ITEMS_PER_PAGE = 50;
  
  // Status filter options for multi-select
  const statusOptions: MultiSelectOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'high_quality', label: 'High Quality' },
    { value: 'good_quality', label: 'Good Quality' },
    { value: 'marginal_quality', label: 'Marginal Quality' },
    { value: 'disqualified', label: 'Disqualified' }
  ];
  
  
  // DataForSEO modal state
  const [dataForSeoModal, setDataForSeoModal] = useState<{
    isOpen: boolean;
    domainId: string;
    domain: string;
    clientId: string;
    initialResults?: any[];
    totalFound: number;
    taskId?: string;
    cacheInfo?: any;
  }>({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 });
  
  // DataForSEO and AI features are now production-ready and always shown
  
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
  const [recentlyAnalyzedDomains, setRecentlyAnalyzedDomains] = useState<Set<string>>(new Set());
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
  
  // AI Qualification state - removed modal, now automatic
  
  // Triage mode state
  const [triageMode, setTriageMode] = useState(false);
  const [showGuidedTriage, setShowGuidedTriage] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [currentSortedFilteredDomains, setCurrentSortedFilteredDomains] = useState<BulkAnalysisDomain[]>([]);
  
  // Add domains section visibility
  const [showAddDomains, setShowAddDomains] = useState(false);
  
  // Bulk workflow creation state
  const [bulkWorkflowCreating, setBulkWorkflowCreating] = useState(false);
  
  // Duplicate resolution state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatesToResolve, setDuplicatesToResolve] = useState<any[]>([]);
  const [pendingDomainSubmission, setPendingDomainSubmission] = useState<any>(null);
  const [bulkWorkflowProgress, setBulkWorkflowProgress] = useState({ current: 0, total: 0 });
  
  // Bulk status update state
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  
  // Move to project state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  
  // More actions dropdown state
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  
  // Master qualification state
  const [masterQualificationRunning, setMasterQualificationRunning] = useState(false);
  const [masterQualificationProgress, setMasterQualificationProgress] = useState({ current: 0, total: 0 });
  const [useOrderTargetPages, setUseOrderTargetPages] = useState(true); // Default to using order-specific target pages when in order context
  const [targetPageSelectionMode, setTargetPageSelectionMode] = useState<'all' | 'order' | 'manual'>('all');
  const [manuallySelectedTargetPages, setManuallySelectedTargetPages] = useState<Set<string>>(new Set());
  const [showTargetPageSelector, setShowTargetPageSelector] = useState(false);
  
  // Smart selection state
  const [showSmartSelection, setShowSmartSelection] = useState(false);
  
  // Domain input mode state
  const [domainInputMode, setDomainInputMode] = useState<'paste' | 'database'>('paste');
  const [selectedDatabaseWebsites, setSelectedDatabaseWebsites] = useState<ProcessedWebsite[]>([]);
  
  // Order selection modal state
  const [orderSelectionModal, setOrderSelectionModal] = useState<{
    isOpen: boolean;
    domains: BulkAnalysisDomain[];
  }>({ isOpen: false, domains: [] });

  // Domain assignment modal state (new smart modal)
  const [domainAssignmentModal, setDomainAssignmentModal] = useState<{
    isOpen: boolean;
    domains: BulkAnalysisDomain[];
  }>({ isOpen: false, domains: [] });
  
  // Order context state - for when accessed from an order
  const orderId = searchParams.get('orderId');
  const [orderContext, setOrderContext] = useState<{
    order: any | null;
    isLoading: boolean;
    error: string | null;
  }>({ 
    order: null, 
    isLoading: !!orderId,
    error: null 
  });

  // State for all associated orders
  const [associatedOrders, setAssociatedOrders] = useState<any[]>([]);
  const [loadingAssociatedOrders, setLoadingAssociatedOrders] = useState(false);
  
  // Calculate sorted and filtered domains
  const sortedFilteredDomains = useMemo(() => {
    // Filter domains
    let filteredDomains = domains.filter(domain => {
      // Status filter - if any statuses are selected, domain must match one of them
      if (statusFilter.length > 0 && !statusFilter.includes(domain.qualificationStatus)) return false;
      
      // Workflow filter
      if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
      if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
      
      // Verification filter
      if (verificationFilter === 'human_verified' && !domain.wasManuallyQualified) return false;
      if (verificationFilter === 'ai_qualified' && (domain.wasManuallyQualified || domain.qualificationStatus === 'pending')) return false;
      if (verificationFilter === 'unverified' && domain.qualificationStatus !== 'pending') return false;
      
      // Search filter
      if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
    
    // Apply sorting
    const sorted = [...filteredDomains].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'domain':
          compareValue = a.domain.localeCompare(b.domain);
          break;
        case 'createdAt':
          compareValue = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'updatedAt':
          compareValue = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
          break;
        case 'qualificationStatus':
          // Custom order: high_quality > good_quality > marginal_quality > disqualified > pending
          const statusOrder: Record<string, number> = { 
            'high_quality': 0, 
            'good_quality': 1, 
            'marginal_quality': 2, 
            'disqualified': 3, 
            'pending': 4,
            '': 5  // Handle empty status
          };
          const aOrder = statusOrder[a.qualificationStatus || ''] ?? 99;
          const bOrder = statusOrder[b.qualificationStatus || ''] ?? 99;
          compareValue = aOrder - bOrder;
          break;
        case 'hasDataForSeoResults':
          compareValue = (a.hasDataForSeoResults ? 0 : 1) - (b.hasDataForSeoResults ? 0 : 1);
          break;
        case 'hasWorkflow':
          compareValue = (a.hasWorkflow ? 0 : 1) - (b.hasWorkflow ? 0 : 1);
          break;
        case 'keywordCount':
          compareValue = (a.keywordCount || 0) - (b.keywordCount || 0);
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
  }, [domains, statusFilter, workflowFilter, verificationFilter, searchQuery, sortBy, sortOrder]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [statusFilter, workflowFilter, verificationFilter, searchQuery]);

  // DataForSEO and AI features are always enabled

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
    }
    loadClient();
    loadProject();
  }, [params.id, params.projectId]);

  useEffect(() => {
    if (client && project) {
      loadDomains();
    }
  }, [client, project]);

  // Track if user came via guided parameter
  const [cameFromGuidedLink, setCameFromGuidedLink] = useState(false);
  
  // Handle guided parameter from URL
  useEffect(() => {
    const guidedDomainId = searchParams.get('guided');
    if (guidedDomainId && domains.length > 0) {
      // Find the domain with this ID
      const guidedDomain = domains.find(d => d.id === guidedDomainId);
      if (guidedDomain) {
        // Mark that we came from a guided link
        setCameFromGuidedLink(true);
        // Set the specific domain for guided triage
        setCurrentSortedFilteredDomains([guidedDomain]);
        // Automatically open guided triage with this domain selected
        setShowGuidedTriage(true);
        // Set search to show only this domain
        setSearchQuery(guidedDomain.domain);
      }
    }
  }, [searchParams, domains]);

  // Load order context if present
  useEffect(() => {
    if (orderId) {
      loadOrderContext();
      // Default to order mode when in order context
      setTargetPageSelectionMode('order');
    } else {
      // Default to all mode when not in order context
      setTargetPageSelectionMode('all');
    }
  }, [orderId]);

  const loadOrderContext = async () => {
    if (!orderId) return;
    
    try {
      setOrderContext(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Fetch order details with line items
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      if (!orderResponse.ok) {
        throw new Error('Failed to load order');
      }
      const orderData = await orderResponse.json();
      
      setOrderContext({
        order: orderData,
        isLoading: false,
        error: null
      });
      
      // Extract target pages from line items - ONLY for current client
      // Don't set target pages here, let loadClient handle it with full data
      // This was causing the "0 keywords" issue by overwriting with incomplete data
      
      // Associate project with order if not already associated
      if (project) {
        const associateResponse = await fetch(`/api/projects/${params.projectId}/associate-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });
        
        if (!associateResponse.ok) {
          const errorData = await associateResponse.json();
          console.error('Failed to associate project with order:', errorData);
          // If client mismatch, show error
          if (errorData.error?.includes('Client mismatch')) {
            throw new Error('Security error: This project belongs to a different client');
          }
        }
      }
    } catch (error) {
      console.error('Error loading order context:', error);
      setOrderContext(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load order context'
      }));
    }
  };

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
      
      // Get target pages - show all active pages, even without keywords
      const pages = (clientData as any)?.targetPages || [];
      setTargetPages(pages.filter((p: any) => p.status === 'active'));
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const loadAssociatedOrders = async () => {
    if (!params.projectId) return;
    
    try {
      setLoadingAssociatedOrders(true);
      const response = await fetch(`/api/projects/${params.projectId}/associated-orders`);
      if (response.ok) {
        const data = await response.json();
        setAssociatedOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading associated orders:', error);
    } finally {
      setLoadingAssociatedOrders(false);
    }
  };

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${params.projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        
        // Load associated orders for this project
        loadAssociatedOrders();
        
        // Load default target pages if project was created from an order
        try {
          const defaultsResponse = await fetch(`/api/bulk-analysis/projects/${params.projectId}/default-target-pages`);
          if (defaultsResponse.ok) {
            const defaultsData = await defaultsResponse.json();
            if (defaultsData.targetPageIds && defaultsData.targetPageIds.length > 0) {
              setSelectedTargetPages(defaultsData.targetPageIds);
            }
          }
        } catch (error) {
          console.log('No default target pages found for project');
        }
      } else if (response.status === 404) {
        setMessage('❌ Project not found');
        router.push(`/clients/${params.id}/bulk-analysis`);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setMessage('❌ Failed to load project');
    }
  };

  const loadDomains = async () => {
    try {
      // Always load all domains for the project
      // (We no longer filter by order since order groups are gone)
      const response = await fetch(
        `/api/clients/${params.id}/bulk-analysis?projectId=${params.projectId}`
      );
      
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

  const startMasterQualification = async () => {
    const selectedDomainList = domains
      .filter(d => selectedDomains.has(d.id))
      .map(d => ({ id: d.id, domain: d.domain }));
    
    if (selectedDomainList.length === 0) {
      setMessage('Please select domains to qualify');
      return;
    }

    setMasterQualificationRunning(true);
    setMasterQualificationProgress({ current: 0, total: selectedDomainList.length });
    
    // Determine which target page IDs to use based on selection mode
    let targetPageIds: string[] | undefined;
    
    if (targetPageSelectionMode === 'order' && orderId && orderContext.order?.lineItems) {
      // Use order-specific target pages
      targetPageIds = [];
      for (const lineItem of orderContext.order.lineItems) {
        // Check both targetPageIds (array) and targetPageId (single)
        if (lineItem.targetPageIds && Array.isArray(lineItem.targetPageIds)) {
          targetPageIds.push(...lineItem.targetPageIds);
        } else if (lineItem.targetPageId) {
          targetPageIds.push(lineItem.targetPageId);
        }
      }
      // Remove duplicates
      targetPageIds = [...new Set(targetPageIds)];
      
      if (targetPageIds.length > 0) {
        setMessage(`🎯 Running qualification for ${selectedDomainList.length} domains using ${targetPageIds.length} order-specific target URLs...`);
      } else {
        setMessage(`🚀 Running complete qualification for ${selectedDomainList.length} domains (no order target URLs found)...`);
        targetPageIds = undefined;
      }
    } else if (targetPageSelectionMode === 'manual' && manuallySelectedTargetPages.size > 0) {
      // Use manually selected target pages
      targetPageIds = Array.from(manuallySelectedTargetPages);
      setMessage(`🎯 Running qualification for ${selectedDomainList.length} domains using ${targetPageIds.length} manually selected target URLs...`);
    } else {
      // Use all client target pages (default)
      setMessage(`🚀 Running complete qualification for ${selectedDomainList.length} domains using all client target URLs...`);
    }

    // Start the qualification
    const qualificationPromise = fetch(`/api/clients/${params.id}/bulk-analysis/master-qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domainIds: selectedDomainList.map(d => d.id),
        targetPageIds, // Include target page IDs if available
        locationCode: 2840,
        languageCode: 'en'
      })
    });

    // Start polling for progress
    const pollInterval = setInterval(async () => {
      try {
        // Poll for progress updates here if we implement SSE later
        // For now, we'll just wait for completion
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 1000);

    try {
      const response = await qualificationPromise;

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run master qualification');
      }

      const data = await response.json();
      clearInterval(pollInterval);

      // Update local domain state immediately with results
      setDomains(prevDomains => 
        prevDomains.map(domain => {
          const result = data.results.find((r: any) => r.domainId === domain.id);
          if (result && result.qualificationStatus) {
            return {
              ...domain,
              qualificationStatus: result.qualificationStatus,
              hasDataForSeoResults: result.dataForSeoStatus === 'success',
              dataForSeoResultsCount: result.keywordsFound || 0,
              updatedAt: new Date().toISOString()
            };
          }
          return domain;
        })
      );

      // Clear selection and show success message
      setSelectedDomains(new Set());
      const summary = data.summary;
      setMessage(
        `✅ Master qualification complete! ${summary.qualification.highQuality} high quality, ` +
        `${summary.qualification.goodQuality} good quality, ${summary.qualification.marginalQuality} marginal quality, ` +
        `${summary.qualification.disqualified} disqualified`
      );
      
      // Reload domains to get updated stats
      await loadDomains();
      await loadProject();

    } catch (error: any) {
      console.error('Master qualification error:', error);
      setMessage(`❌ Master qualification failed: ${error.message}`);
      clearInterval(pollInterval);
    } finally {
      setMasterQualificationRunning(false);
      setMasterQualificationProgress({ current: 0, total: 0 });
    }
  };

  const fetchSmartFilters = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/master-qualify`);
      if (response.ok) {
        const data = await response.json();
        return data.filters;
      }
    } catch (error) {
      console.error('Error fetching smart filters:', error);
    }
    return null;
  };

  const startAIQualification = async () => {
    const selectedDomainList = domains
      .filter(d => selectedDomains.has(d.id))
      .map(d => ({ id: d.id, domain: d.domain }));
    
    if (selectedDomainList.length === 0) {
      setMessage('Please select domains to qualify');
      return;
    }

    setLoading(true);
    setMessage(`🤖 AI is analyzing ${selectedDomainList.length} domains...`);

    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/ai-qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: selectedDomainList.map(d => d.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run AI qualification');
      }

      const data = await response.json();
      
      // Update local domain state immediately
      setDomains(prevDomains => 
        prevDomains.map(domain => {
          const qualification = data.qualifications.find((q: any) => q.domainId === domain.id);
          if (qualification) {
            return {
              ...domain,
              qualificationStatus: qualification.qualification,
              aiQualificationReasoning: qualification.reasoning,
              aiQualifiedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return domain;
        })
      );

      // Clear selection and show success message
      setSelectedDomains(new Set());
      setMessage(`✅ AI qualification complete! ${data.summary.highQuality} high quality, ${data.summary.goodQuality} good quality, ${data.summary.marginalQuality} marginal quality, ${data.summary.disqualified} disqualified domains`);
      
      // Reload domains to get updated stats
      await loadDomains();

    } catch (error: any) {
      console.error('AI qualification error:', error);
      setMessage(`❌ AI qualification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAIQualificationComplete = async (results: any[]) => {
    // This function is no longer used since AI qualification is automatic
    // Keeping for backward compatibility
    await loadDomains();
    setMessage(`✅ AI qualification applied to ${results.length} domains`);
    setSelectedDomains(new Set());
  };

  const handleAnalyze = async () => {
    if (domainInputMode === 'database') {
      // Handle database mode
      if (selectedDatabaseWebsites.length === 0) {
        setMessage('Please select websites from the database');
        return;
      }
      
      if (keywordInputMode === 'target-pages' && selectedTargetPages.length === 0) {
        setMessage('Please select target pages');
        return;
      } else if (keywordInputMode === 'manual' && !manualKeywords.trim()) {
        setMessage('Please enter keywords');
        return;
      }
      
      setLoading(true);
      setMessage('');
      try {
        // Extract domains and metadata from selected websites
        let domainList = selectedDatabaseWebsites.map(w => w.domain);
        const metadata: Record<string, any> = {};
        
        selectedDatabaseWebsites.forEach(website => {
          metadata[website.domain] = {
            id: website.id,
            domainRating: website.domainRating,
            totalTraffic: website.totalTraffic,
            guestPostCost: website.guestPostCost,
            categories: website.categories,
            contacts: website.contacts,
            publishedOpportunities: website.publishedOpportunities,
            skipDataForSeo: true // Skip DataForSEO API calls for database websites
          };
        });
        
        // First check for duplicates
        const checkResponse = await fetch(`/api/clients/${params.id}/bulk-analysis/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains: domainList,
            projectId: params.projectId
          })
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          // Filter out domains already in current project
          let domainsToAdd = domainList;
          if (checkData.alreadyInProject && checkData.alreadyInProject.length > 0) {
            console.log(`Skipping ${checkData.alreadyInProject.length} domains already in project:`, checkData.alreadyInProject);
            domainsToAdd = domainList.filter(d => !checkData.alreadyInProject.includes(d));
            
            if (domainsToAdd.length === 0) {
              setMessage(`⚠️ All selected domains are already in this project`);
              setLoading(false);
              return;
            }
          }
          
          if (checkData.duplicates && checkData.duplicates.length > 0) {
            // Store submission data for after resolution (only domains not already in project)
            setPendingDomainSubmission({
              domains: domainsToAdd,
              targetPageIds: keywordInputMode === 'target-pages' ? selectedTargetPages : [],
              manualKeywords: keywordInputMode === 'manual' ? manualKeywords : undefined,
              projectId: params.projectId,
              airtableMetadata: metadata,
              isDatabase: true
            });
            
            // Show duplicate resolution modal
            setDuplicatesToResolve(checkData.duplicates);
            setShowDuplicateModal(true);
            setLoading(false);
            return;
          }
          
          // Update domainList to only include domains not already in project
          domainList = domainsToAdd;
        }

        // No duplicates, proceed with normal creation
        const response = await fetch(`/api/clients/${params.id}/bulk-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains: domainList,
            targetPageIds: keywordInputMode === 'target-pages' ? selectedTargetPages : [],
            manualKeywords: keywordInputMode === 'manual' ? manualKeywords : undefined,
            projectId: params.projectId,
            airtableMetadata: metadata
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          await loadDomains();
          setSelectedDatabaseWebsites([]);
          setMessage(`✅ Added ${data.domains.length} websites from database to project`);
        } else {
          throw new Error('Failed to add websites');
        }
      } catch (error) {
        console.error('Error adding websites:', error);
        setMessage('❌ Error adding websites from database');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle paste mode (existing logic)
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
        let domainList = domainText
          .split('\n')
          .map(d => d.trim())
          .filter(Boolean);

        // Check for duplicates in other projects
        const checkResponse = await fetch(`/api/clients/${params.id}/bulk-analysis/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains: domainList,
            projectId: params.projectId
          })
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          // Filter out domains already in current project
          let domainsToAdd = domainList;
          if (checkData.alreadyInProject && checkData.alreadyInProject.length > 0) {
            console.log(`Skipping ${checkData.alreadyInProject.length} domains already in project:`, checkData.alreadyInProject);
            domainsToAdd = domainList.filter(d => !checkData.alreadyInProject.includes(d));
            
            if (domainsToAdd.length === 0) {
              setMessage(`⚠️ All entered domains are already in this project`);
              setLoading(false);
              return;
            }
          }
          
          if (checkData.duplicates && checkData.duplicates.length > 0) {
            // Store submission data for after resolution (only domains not already in project)
            setPendingDomainSubmission({
              domains: domainsToAdd,
              targetPageIds: keywordInputMode === 'target-pages' ? selectedTargetPages : [],
              manualKeywords: keywordInputMode === 'manual' ? manualKeywords : undefined,
              projectId: params.projectId,
              airtableMetadata: undefined,
              isDatabase: false
            });
            
            // Show duplicate resolution modal
            setDuplicatesToResolve(checkData.duplicates);
            setShowDuplicateModal(true);
            setLoading(false);
            return;
          }
          
          // Update domainList to only include domains not already in project
          domainList = domainsToAdd;
        }

        // No duplicates, proceed with normal creation
        const response = await fetch(`/api/clients/${params.id}/bulk-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains: domainList,
            targetPageIds: keywordInputMode === 'target-pages' ? selectedTargetPages : [],
            manualKeywords: keywordInputMode === 'manual' ? manualKeywords : undefined,
            projectId: params.projectId,
            airtableMetadata: undefined // No metadata for paste mode
          })
        });

        if (response.ok) {
          const data = await response.json();
          await loadDomains();
          setDomainText('');
          setMessage(`✅ Added ${data.domains.length} domains to project`);
        } else {
          throw new Error('Failed to create domains');
        }
      } catch (error) {
        console.error('Error analyzing domains:', error);
        setMessage('❌ Error analyzing domains');
      } finally {
        setLoading(false);
      }
    }
  };


  const updateQualificationStatus = async (domainId: string, status: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified', isManual?: boolean) => {
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
        body: JSON.stringify({ status, userId: session.userId, notes: domainNotes, isManual })
      });

      if (response.ok) {
        // Update local state instead of reloading from server to prevent "jumping"
        setDomains(prevDomains => 
          prevDomains.map(domain => 
            domain.id === domainId 
              ? { 
                  ...domain, 
                  qualificationStatus: status, 
                  checkedBy: session.userId, 
                  checkedAt: new Date().toISOString(), 
                  notes: domainNotes,
                  wasManuallyQualified: isManual || false,
                  manuallyQualifiedBy: isManual ? session.userId : domain.manuallyQualifiedBy,
                  manuallyQualifiedAt: isManual ? new Date().toISOString() : domain.manuallyQualifiedAt
                }
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

  const aiQualifySingleDomain = async (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    
    setLoading(true);
    setMessage(`🤖 AI is analyzing ${domain.domain}...`);

    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/ai-qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds: [domainId]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run AI qualification');
      }

      const data = await response.json();
      
      // Update local domain state immediately
      setDomains(prevDomains => 
        prevDomains.map(d => {
          if (d.id === domainId) {
            const qualification = data.qualifications[0];
            return {
              ...d,
              qualificationStatus: qualification.qualification,
              aiQualificationReasoning: qualification.reasoning,
              aiQualifiedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
          return d;
        })
      );

      setMessage(`✅ ${domain.domain} qualified as ${data.qualifications[0].qualification.replace('_', ' ')}`);
      
      // Reload domains to get updated stats
      await loadDomains();

    } catch (error: any) {
      console.error('AI qualification error:', error);
      setMessage(`❌ AI qualification failed for ${domain.domain}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const bulkCreateWorkflows = async (domainIds: string[]) => {
    if (!client) return;
    
    setBulkWorkflowCreating(true);
    setBulkWorkflowProgress({ current: 0, total: domainIds.length });
    
    let successCount = 0;
    let failureCount = 0;
    
    try {
      for (let i = 0; i < domainIds.length; i++) {
        const domainId = domainIds[i];
        const domain = domains.find(d => d.id === domainId);
        if (!domain) continue;
        
        setBulkWorkflowProgress({ current: i + 1, total: domainIds.length });
        
        try {
          // Create workflow via API
          const domainNotes = domain.notes || notes[domain.id] || '';
          
          const response = await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: client.id,
              title: `Guest Post - ${domain.domain}`,
              description: `Auto-generated workflow for ${domain.domain}${domainNotes ? `\n\nNotes: ${domainNotes}` : ''}`,
              status: 'draft',
              guestPostSite: domain.domain,
              steps: []
            })
          });
          
          if (response.ok) {
            const workflow = await response.json();
            
            // Update domain to mark as having workflow
            await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                status: domain.qualificationStatus,
                userId: AuthService.getSession()?.userId,
                workflowId: workflow.id,
                hasWorkflow: true
              })
            });
            
            successCount++;
          } else {
            throw new Error('Failed to create workflow');
          }
        } catch (error) {
          console.error(`Failed to create workflow for ${domain.domain}:`, error);
          failureCount++;
        }
      }
      
      // Update local state
      setDomains(prevDomains => 
        prevDomains.map(d => {
          if (domainIds.includes(d.id)) {
            return { ...d, hasWorkflow: true };
          }
          return d;
        })
      );
      
      // Clear selection
      setSelectedDomains(new Set());
      
      if (failureCount === 0) {
        setMessage(`✅ Successfully created ${successCount} workflows`);
      } else {
        setMessage(`⚠️ Created ${successCount} workflows, ${failureCount} failed`);
      }
      
    } catch (error) {
      console.error('Bulk workflow creation error:', error);
      setMessage('❌ Failed to create workflows');
    } finally {
      setBulkWorkflowCreating(false);
      setBulkWorkflowProgress({ current: 0, total: 0 });
    }
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

  // Update only the analyzed domains without reloading the entire list
  const updateAnalyzedDomainsOnly = async (analyzedDomainIds: Set<string>) => {
    try {
      // Mark domains as recently analyzed for visual feedback
      setRecentlyAnalyzedDomains(analyzedDomainIds);
      
      // Clear the visual indicator after 5 seconds
      setTimeout(() => {
        setRecentlyAnalyzedDomains(new Set());
      }, 5000);
      
      // Fetch only the analyzed domains' updated data
      const updatePromises = Array.from(analyzedDomainIds).map(async (domainId) => {
        const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const updatedDomains = await Promise.all(updatePromises);
      
      // Update local state with the new data while preserving order
      setDomains(prevDomains => 
        prevDomains.map(domain => {
          if (analyzedDomainIds.has(domain.id)) {
            const updated = updatedDomains.find(d => d && d.id === domain.id);
            if (updated) {
              // Preserve clientId
              return { ...updated, clientId: params.id };
            }
          }
          return domain;
        })
      );
    } catch (error) {
      console.error('Error updating analyzed domains:', error);
      // Fallback to full reload if update fails
      loadDomains();
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
      // Get keywords from domains' target pages
      const selectedDomainsList = domains.filter(d => selectedDomains.has(d.id));
      const keywordSet = new Set<string>();
      
      // Collect keywords from each domain's target pages
      selectedDomainsList.forEach(domain => {
        if (domain.targetPageIds && domain.targetPageIds.length > 0) {
          // Get keywords from this domain's target pages
          const domainTargetPages = targetPages.filter(p => domain.targetPageIds.includes(p.id));
          domainTargetPages.forEach(page => {
            const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
            pageKeywords.forEach((k: string) => keywordSet.add(k));
          });
        }
      });
      
      // If no keywords found from domains' target pages, use all target pages' keywords
      if (keywordSet.size === 0 && targetPages.length > 0) {
        targetPages.forEach(page => {
          const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
          pageKeywords.forEach((k: string) => keywordSet.add(k));
        });
      }
      
      keywords = Array.from(keywordSet);
    }

    if (keywords.length === 0) {
      setMessage('No keywords found. Please ensure target pages have keywords or enter manual keywords.');
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
    setMessage(`🚀 Starting analysis for ${selectedDomains.size} domains with ${selectedKeywords.length} keywords...`);
    setBulkAnalysisRunning(true);
    setBulkProgress({ current: 0, total: selectedDomains.size });

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
      
      // Ensure progress bar stays visible
      setMessage(`⏳ Analyzing ${totalDomains} domains...`);
      setBulkProgress({ current: 0, total: totalDomains });
      
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
        setBulkProgress({
          current: job.processedDomains || 0,
          total: job.totalDomains || 0
        });

        // Update message
        if (job.status === 'processing') {
          setMessage(`⏳ Processing: ${job.processedDomains}/${job.totalDomains} domains analyzed`);
        } else if (job.status === 'completed') {
          clearInterval(pollInterval);
          
          // Store analyzed domains BEFORE clearing selection
          const analyzedDomainIds = new Set(Array.from(selectedDomains));
          const analyzedDomains = domains.filter(d => analyzedDomainIds.has(d.id)).map(d => ({ id: d.id, domain: d.domain }));
          
          setMessage(
            `✅ Analysis complete! Analyzed ${job.totalKeywordsAnalyzed} keywords, found ${job.totalRankingsFound} rankings.`
          );
          setBulkAnalysisRunning(false);
          setCompletedJobId(jobId);
          
          // Store job ID and domains for later viewing (but don't open modal automatically)
          setBulkResultsModal({ isOpen: false, jobId, analyzedDomains });
          clearSelection();
          
          // Instead of reloading all domains, just update the analyzed ones
          // This preserves the current order and prevents "jumping"
          updateAnalyzedDomainsOnly(analyzedDomainIds);
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
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/analyze-dataforseo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (!data.result) {
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
          taskId: data.result.taskId,
          cacheInfo: data.result.cacheInfo
        });
        setMessage('');
      } else {
        setMessage(`❌ DataForSEO error: ${data.details || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('DataForSEO analysis error:', error);
      setMessage(`❌ Failed to analyze with DataForSEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified' | 'pending') => {
    try {
      setShowBulkStatusMenu(false);
      setLoading(true);
      
      const domainIds = Array.from(selectedDomains);
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds,
          status,
          action: 'updateStatus'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update domains');
      }

      const result = await response.json();
      
      // Update local state
      setDomains(prev => prev.map(domain => {
        if (selectedDomains.has(domain.id)) {
          return {
            ...domain,
            qualificationStatus: status,
            checkedBy: 'system',
            checkedAt: new Date().toISOString()
          };
        }
        return domain;
      }));
      
      setMessage(`✅ Updated ${result.updated} domains to ${status.replace('_', ' ')}`);
      clearSelection();
      
      // Reload project stats
      loadProject();
    } catch (error) {
      console.error('Error updating domains:', error);
      setMessage('❌ Failed to update domain status');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToExistingOrder = async (orderId: string, domains: BulkAnalysisDomain[]) => {
    try {
      setLoading(true);
      setMessage('Adding domains to order...');
      
      // Get the order details with line items
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      if (!orderResponse.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const orderData = await orderResponse.json();
      
      // Check if order has line items
      if (!orderData.lineItems || orderData.lineItems.length === 0) {
        throw new Error('Order has no line items');
      }
      
      // Find unassigned line items for this client (exclude cancelled and refunded items)
      const unassignedLineItems = orderData.lineItems
        .filter((item: any) => 
          item.clientId === params.id && 
          !item.assignedDomainId &&
          !['cancelled', 'refunded'].includes(item.status)
        );
      
      if (unassignedLineItems.length === 0) {
        throw new Error('No unassigned line items available for this client. All line items already have domains assigned.');
      }
      
      // Create assignments mapping domains to line items
      const assignments = domains.slice(0, unassignedLineItems.length).map((domain, index) => ({
        lineItemId: unassignedLineItems[index].id,
        domainId: domain.id,
        targetPageUrl: unassignedLineItems[index].targetPageUrl || targetPages[0]?.url || null,
        anchorText: unassignedLineItems[index].anchorText || null
      }));
      
      // Use the line items endpoint for assigning domains
      const response = await fetch(`/api/orders/${orderId}/line-items/assign-domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          assignments,
          projectId: params.projectId // Pass the project ID so it can be stored in metadata
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add domains to order');
      }
      
      const result = await response.json();
      
      // Show detailed success message
      const assignedCount = result.assignments?.length || 0;
      const skippedCount = domains.length - assignedCount;
      
      if (skippedCount > 0) {
        setMessage(`✅ Assigned ${assignedCount} domains to line items (${skippedCount} domains could not be assigned - not enough unassigned line items)`);
      } else {
        setMessage(`✅ Successfully assigned ${assignedCount} domains to line items!`);
      }
      
      // Optional: Navigate to order after a short delay to show the message
      setTimeout(() => {
        router.push(`/orders/${orderId}/internal`);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error adding to order:', error);
      setMessage(`❌ Failed to add domains: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToProject = async (targetProjectId: string) => {
    try {
      setLoading(true);
      
      const domainIds = Array.from(selectedDomains);
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainIds,
          targetProjectId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to move domains');
      }
      
      const result = await response.json();
      
      // Remove moved domains from current view
      setDomains(prev => prev.filter(domain => !selectedDomains.has(domain.id)));
      setSelectedDomains(new Set());
      setShowMoveDialog(false);
      
      setMessage(`✅ Moved ${result.movedCount} domains to project`);
    } catch (error) {
      console.error('Error moving domains:', error);
      setMessage('❌ Failed to move domains');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDuplicateResolution = async (resolutions: any[]) => {
    if (!pendingDomainSubmission) return;
    
    try {
      setLoading(true);
      setMessage('Processing duplicate resolutions...');
      
      // Submit with duplicate resolutions
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/resolve-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingDomainSubmission,
          resolutions
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        await loadDomains();
        
        // Clear UI state based on submission type
        if (pendingDomainSubmission.isDatabase) {
          setSelectedDatabaseWebsites([]);
        } else {
          setDomainText('');
        }
        
        // Count actions taken
        const keepBothCount = resolutions.filter(r => r.resolution === 'keep_both').length;
        const movedCount = resolutions.filter(r => r.resolution === 'move_to_new').length;
        const skippedCount = resolutions.filter(r => r.resolution === 'skip').length;
        const updatedCount = resolutions.filter(r => r.resolution === 'update_original').length;
        
        // Build detailed message
        const messages = [];
        if (keepBothCount > 0) messages.push(`${keepBothCount} added to this project (kept in both)`);
        if (movedCount > 0) messages.push(`${movedCount} moved to this project`);
        if (skippedCount > 0) messages.push(`${skippedCount} skipped (kept in original project only)`);
        if (updatedCount > 0) messages.push(`${updatedCount} updated in original project`);
        
        const totalAdded = keepBothCount + movedCount;
        let message = totalAdded > 0 
          ? `✅ Added ${totalAdded} domain${totalAdded !== 1 ? 's' : ''} to project. `
          : '✅ Duplicate resolution complete. ';
        
        setMessage(message + messages.join(', '));
        
        // Clear duplicate resolution state
        setShowDuplicateModal(false);
        setDuplicatesToResolve([]);
        setPendingDomainSubmission(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve duplicates');
      }
    } catch (error) {
      console.error('Error resolving duplicates:', error);
      setMessage('❌ Error resolving duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const domainIds = Array.from(selectedDomains);
    const domainCount = domainIds.length;
    
    if (domainCount === 0) return;
    
    const message = domainCount === 1
      ? 'Are you sure you want to delete this domain?'
      : `Are you sure you want to delete ${domainCount} domains?`;
    
    if (!confirm(message + '\n\nThis action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete domains');
      }
      
      const result = await response.json();
      
      // Remove deleted domains from local state
      setDomains(prev => prev.filter(domain => !selectedDomains.has(domain.id)));
      setSelectedDomains(new Set());
      
      // Reload project stats
      loadProject();
      
      setMessage(`✅ Deleted ${result.deleted} domain${result.deleted !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting domains:', error);
      setMessage('❌ Failed to delete domains');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSelected = () => {
    try {
      // Get selected domains
      const selectedDomainsList = domains.filter(d => selectedDomains.has(d.id));
      
      if (selectedDomainsList.length === 0) {
        setMessage('❌ No domains selected for export');
        return;
      }
      
      // Create CSV content
      const headers = ['Domain', 'Status', 'Keywords', 'Has Workflow', 'Checked Date', 'Notes', 'AI Reasoning'];
      const rows = selectedDomainsList.map(d => [
        d.domain,
        d.qualificationStatus.replace('_', ' '),
        (d.keywordCount || 0).toString(),
        d.hasWorkflow ? 'Yes' : 'No',
        d.checkedAt ? new Date(d.checkedAt).toLocaleDateString() : '',
        d.notes || '',
        d.aiQualificationReasoning || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `bulk-analysis-${project?.name.toLowerCase().replace(/\s+/g, '-') || 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage(`✅ Exported ${selectedDomainsList.length} domains to CSV`);
    } catch (error) {
      console.error('Error exporting domains:', error);
      setMessage('❌ Failed to export domains');
    }
  };

  const handleExportAll = () => {
    try {
      if (domains.length === 0) {
        setMessage('❌ No domains to export');
        return;
      }
      
      // Apply current filters to export
      const filteredDomains = domains.filter(domain => {
        // Status filter - if any statuses are selected, domain must match one of them
        if (statusFilter.length > 0 && !statusFilter.includes(domain.qualificationStatus)) {
          return false;
        }
        
        // Workflow filter
        if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
        if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
        
        // Verification filter
        if (verificationFilter === 'human_verified' && !domain.wasManuallyQualified) return false;
        if (verificationFilter === 'ai_qualified' && (domain.wasManuallyQualified || domain.qualificationStatus === 'pending')) return false;
        if (verificationFilter === 'unverified' && domain.qualificationStatus !== 'pending') return false;
        
        // Search filter
        if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        return true;
      });
      
      // Create CSV content
      const headers = ['Domain', 'Status', 'Keywords', 'Has Workflow', 'Checked Date', 'Notes', 'AI Reasoning'];
      const rows = filteredDomains.map(d => [
        d.domain,
        d.qualificationStatus.replace('_', ' '),
        (d.keywordCount || 0).toString(),
        d.hasWorkflow ? 'Yes' : 'No',
        d.checkedAt ? new Date(d.checkedAt).toLocaleDateString() : '',
        d.notes || '',
        d.aiQualificationReasoning || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `bulk-analysis-all-${project?.name.toLowerCase().replace(/\s+/g, '-') || 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage(`✅ Exported ${filteredDomains.length} domains to CSV`);
    } catch (error) {
      console.error('Error exporting all domains:', error);
      setMessage('❌ Failed to export domains');
    }
  };

  if (!client || !project) {
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
              {orderId ? (
                <Link
                  href={`/orders/${orderId}/internal`}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Order
                </Link>
              ) : (
                <Link
                  href={`/clients/${client.id}/bulk-analysis`}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Link>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: project.color + '20' }}
                >
                  {project.icon || '📁'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  {project.description && (
                    <p className="text-gray-600 mt-1">{project.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Context Indicator */}
          {orderContext.order && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-medium">
                    Viewing domains for order: {orderContext.order.name || `Order #${orderId?.substring(0, 8)}`}
                  </span>
                </div>
                <Link
                  href={`/orders/${orderId}/internal`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View Order
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          )}

          {/* Associated Orders Display */}
          {associatedOrders.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Orders Using This Project ({associatedOrders.length})
                </h3>
                {loadingAssociatedOrders && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                )}
              </div>
              <OrderBadgeDisplay 
                orders={associatedOrders}
                currentOrderId={orderId || undefined}
                onOrderClick={(order) => {
                  // Navigate to the bulk analysis page with this order context
                  router.push(`/clients/${params.id}/bulk-analysis/projects/${params.projectId}?orderId=${order.orderId}`);
                }}
                compact={associatedOrders.length > 3}
              />
            </div>
          )}
          
          {/* Order Context Error */}
          {orderContext.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">
                  Failed to load order context: {orderContext.error}
                </span>
              </div>
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

          {/* Add Domains Section - Contextual Display */}
          {domains.length === 0 ? (
            // New project - show add domains prominently
            userType === 'internal' ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-blue-900">Get Started</h3>
                </div>
                <p className="text-blue-800">
                  This project doesn't have any domains yet. Add domains below to start qualifying guest post opportunities.
                </p>
              </div>
          
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
                <p>No active target pages found for this client.</p>
                <p className="text-sm mt-2">Please add target pages to the client first.</p>
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
              Add domains to analyze. Domains will be added to this project and checked against {
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
            
            {/* Tab Selection */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setDomainInputMode('paste')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  domainInputMode === 'paste'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Paste Domains
                </div>
              </button>
              <button
                onClick={() => setDomainInputMode('database')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  domainInputMode === 'database'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Select from Database
                </div>
              </button>
            </div>
            
            {/* Domain Input Content */}
            {domainInputMode === 'paste' ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Enter domains (one per line)
                </label>
                <textarea
                  value={domainText}
                  onChange={(e) => setDomainText(e.target.value)}
                  placeholder="example.com
blog.example.com
anotherdomain.com"
                  className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                  {domainText.split('\n').filter(d => d.trim()).length} domains entered
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <InlineDatabaseSelector
                  clientId={params.id as string}
                  projectId={project?.id || ''}
                  selectedWebsites={selectedDatabaseWebsites}
                  onSelectionChange={setSelectedDatabaseWebsites}
                />
              </div>
            )}
            
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
            <MessageDisplay
              message={message}
              bulkAnalysisRunning={bulkAnalysisRunning}
              bulkProgress={bulkProgress}
              masterQualificationRunning={masterQualificationRunning}
              masterQualificationProgress={masterQualificationProgress}
              completedJobId={completedJobId}
              onViewResults={() => {
                setBulkResultsModal({ ...bulkResultsModal, isOpen: true });
                setCompletedJobId(null);
              }}
            />
            
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleAnalyze}
                disabled={loading || 
                  (keywordInputMode === 'target-pages' ? selectedTargetPages.length === 0 : !manualKeywords.trim()) || 
                  (domainInputMode === 'paste' ? !domainText.trim() : selectedDatabaseWebsites.length === 0)}
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
                    Add to Project
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
            </>
          ) : (
            // Advertiser view - show message for empty project
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-3">
                <AlertCircle className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">No Domains Yet</h3>
              </div>
              <p className="text-gray-700">
                This project doesn't have any domains yet. Your account manager will add domains to analyze for guest post opportunities.
              </p>
            </div>
          )
          ) : (
            // Existing project - show subtle add domains option
            <>
              {!showAddDomains && userType === 'internal' && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddDomains(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Domains
                  </button>
                </div>
              )}
              
              {showAddDomains && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Add More Domains</h3>
                    <button
                      onClick={() => setShowAddDomains(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
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
                      Add domains to analyze. Domains will be added to this project and checked against {
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
                    
                    {/* Tab Selection */}
                    <div className="flex border-b mb-4">
                      <button
                        onClick={() => setDomainInputMode('paste')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          domainInputMode === 'paste'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Paste Domains
                        </div>
                      </button>
                      <button
                        onClick={() => setDomainInputMode('database')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          domainInputMode === 'database'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Select from Database
                        </div>
                      </button>
                    </div>
                    
                    {/* Domain Input Content */}
                    {domainInputMode === 'paste' ? (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                          Enter domains (one per line)
                        </label>
                        <textarea
                          value={domainText}
                          onChange={(e) => setDomainText(e.target.value)}
                          placeholder="example.com
blog.example.com
anotherdomain.com"
                          className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500">
                          {domainText.split('\n').filter(d => d.trim()).length} domains entered
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <InlineDatabaseSelector
                          clientId={params.id as string}
                          projectId={params.projectId as string}
                          selectedWebsites={selectedDatabaseWebsites}
                          onSelectionChange={setSelectedDatabaseWebsites}
                        />
                      </div>
                    )}
                    
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
                    <MessageDisplay
                      message={message}
                      bulkAnalysisRunning={bulkAnalysisRunning}
                      bulkProgress={bulkProgress}
                      masterQualificationRunning={masterQualificationRunning}
                      masterQualificationProgress={masterQualificationProgress}
                      completedJobId={completedJobId}
                      onViewResults={() => {
                        setBulkResultsModal({ ...bulkResultsModal, isOpen: true });
                        setCompletedJobId(null);
                      }}
                    />
                    
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={handleAnalyze}
                        disabled={loading || 
                          (keywordInputMode === 'target-pages' ? selectedTargetPages.length === 0 : !manualKeywords.trim()) || 
                          (domainInputMode === 'paste' ? !domainText.trim() : selectedDatabaseWebsites.length === 0)}
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
                            Add to Project
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
                </>
              )}
            </>
          )}

          {/* Results Grid */}
          {domains.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium">Project Domains</h2>
                  <button
                    onClick={handleExportAll}
                    disabled={loading || domains.length === 0}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Export All ({domains.length})
                  </button>
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
              
              {/* Primary Action Bar - Always Visible */}
              <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
                    {/* Auto-Qualify All Button */}
                    <button
                      onClick={async () => {
                        // Select all domains that need qualification
                        const domainsNeedingQualification = domains.filter(d => 
                          !d.hasDataForSeoResults || d.qualificationStatus === 'pending'
                        );
                        if (domainsNeedingQualification.length === 0) {
                          setMessage('✅ All domains are already qualified!');
                          return;
                        }
                        selectAll(domainsNeedingQualification.map(d => d.id));
                        // Small delay to let state update
                        setTimeout(() => startMasterQualification(), 100);
                      }}
                      disabled={bulkAnalysisRunning || loading || masterQualificationRunning || domains.length === 0}
                      className="inline-flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 lg:flex-initial justify-center lg:justify-start"
                      title={(() => {
                        const needingDataForSeo = domains.filter(d => !d.hasDataForSeoResults).length;
                        const needingAI = domains.filter(d => d.qualificationStatus === 'pending').length;
                        const needingBoth = domains.filter(d => !d.hasDataForSeoResults && d.qualificationStatus === 'pending').length;
                        return `Qualify all domains (${needingBoth} need both, ${needingDataForSeo - needingBoth} need DataForSEO only, ${needingAI - needingBoth} need AI only)`;
                      })()}
                    >
                      {masterQualificationRunning ? (
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                          <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      {masterQualificationRunning ? 'Qualifying...' : 'Auto-Qualify All'}
                    </button>

                    {/* Guided Review Button */}
                    <button
                      onClick={() => {
                        setCurrentSortedFilteredDomains(sortedFilteredDomains);
                        setShowGuidedTriage(true);
                      }}
                      className="inline-flex items-center px-3 sm:px-4 py-2 bg-purple-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex-1 lg:flex-initial justify-center lg:justify-start"
                      title="Review domains one by one with DataForSEO and AI analysis"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Guided Review
                    </button>
                  </div>

                  {/* Right side with search and filters */}
                  <div className="flex items-center gap-2 flex-nowrap w-full lg:w-auto">
                    {/* Expandable Search */}
                    <div className="relative">
                      {isSearchExpanded ? (
                        <div className="flex items-center relative">
                          <input
                            type="text"
                            placeholder="Search domains..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape' && !searchQuery) {
                                setIsSearchExpanded(false);
                              }
                            }}
                            className="w-48 lg:w-64 pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                          />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setIsSearchExpanded(false);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsSearchExpanded(true)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Search domains"
                        >
                          <Search className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    {/* Filters Container - Hide when search is expanded */}
                    {!isSearchExpanded && (
                      <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide relative">
                        {/* Status Filter */}
                        <MultiSelect
                          options={statusOptions}
                          selectedValues={statusFilter}
                          onChange={setStatusFilter}
                          placeholder="All Statuses"
                          className="min-w-[120px] lg:min-w-[140px]"
                        />

                        {/* Workflow Filter - Hidden on mobile */}
                        <select
                          value={workflowFilter}
                          onChange={(e) => setWorkflowFilter(e.target.value as 'all' | 'has_workflow' | 'no_workflow')}
                          className="hidden sm:block border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
                        >
                          <option value="all">All Workflows</option>
                          <option value="has_workflow">Has Workflow</option>
                          <option value="no_workflow">No Workflow</option>
                        </select>

                        {/* Verification Filter */}
                        <select
                          value={verificationFilter}
                          onChange={(e) => setVerificationFilter(e.target.value as 'all' | 'human_verified' | 'ai_qualified' | 'unverified')}
                          className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[100px] lg:min-w-[140px]"
                        >
                          <option value="all">All</option>
                          <option value="human_verified">Human</option>
                          <option value="ai_qualified">AI</option>
                          <option value="unverified">Unverified</option>
                        </select>

                        {/* Sort By Dropdown */}
                        <div className="flex items-center gap-1 border-l pl-2">
                          <select
                            value={sortBy}
                            onChange={(e) => {
                              const newSortBy = e.target.value as any;
                              setSortBy(newSortBy);
                              // When switching to status sorting, default to ascending (best first)
                              if (newSortBy === 'qualificationStatus' && sortBy !== 'qualificationStatus') {
                                setSortOrder('asc');
                              }
                            }}
                            className="border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[90px] lg:min-w-[140px]"
                          >
                            <option value="createdAt">Date</option>
                            <option value="updatedAt">Modified</option>
                            <option value="domain">Name</option>
                            <option value="qualificationStatus">Status</option>
                            <option value="hasDataForSeoResults" className="hidden lg:block">DataForSEO</option>
                            <option value="hasWorkflow" className="hidden lg:block">Workflow</option>
                            <option value="keywordCount" className="hidden lg:block">Keywords</option>
                          </select>
                          <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                            title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                          >
                            {sortOrder === 'asc' ? (
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Clear Filters - Always visible */}
                    {(searchQuery || statusFilter.length > 0 || workflowFilter !== 'all' || verificationFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter([]);
                          setWorkflowFilter('all');
                          setVerificationFilter('all');
                          setIsSearchExpanded(false);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>


              {/* Bulk Actions Bar */}
              {selectedDomains.size > 0 && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Selection Count with Expandable Stats */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-indigo-900">
                          {selectedDomains.size} domain{selectedDomains.size > 1 ? 's' : ''} selected
                        </span>
                        {(() => {
                          const selectedDomainsArray = Array.from(selectedDomains);
                          const qualifiedCount = domains.filter(d => 
                            selectedDomainsArray.includes(d.id) && 
                            (d.qualificationStatus === 'high_quality' || d.qualificationStatus === 'good_quality' || d.qualificationStatus === 'marginal_quality') && 
                            !d.hasWorkflow
                          ).length;
                          const pendingCount = domains.filter(d => 
                            selectedDomainsArray.includes(d.id) && 
                            d.qualificationStatus === 'pending'
                          ).length;
                          const disqualifiedCount = domains.filter(d => 
                            selectedDomainsArray.includes(d.id) && 
                            d.qualificationStatus === 'disqualified'
                          ).length;
                          
                          return (
                            <>
                              {qualifiedCount > 0 && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                  {qualifiedCount} qualified
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                  {pendingCount} pending
                                </span>
                              )}
                              {disqualifiedCount > 0 && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                  {disqualifiedCount} disqualified
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Clear selection
                      </button>
                      {/* Smart Selection Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSmartSelection(!showSmartSelection)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                        >
                          Smart Select
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showSmartSelection && (
                          <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="p-2">
                              <button
                                onClick={async () => {
                                  const filters = await fetchSmartFilters();
                                  if (filters?.allPendingDataForSeo) {
                                    selectAll(filters.allPendingDataForSeo);
                                    setShowSmartSelection(false);
                                    setMessage(`Selected ${filters.allPendingDataForSeo.length} domains pending DataForSEO`);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                              >
                                <span>All Pending DataForSEO</span>
                                <Search className="w-4 h-4 text-gray-400" />
                              </button>
                              <button
                                onClick={async () => {
                                  const filters = await fetchSmartFilters();
                                  if (filters?.allPendingAI) {
                                    selectAll(filters.allPendingAI);
                                    setShowSmartSelection(false);
                                    setMessage(`Selected ${filters.allPendingAI.length} domains pending AI qualification`);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                              >
                                <span>All Pending AI</span>
                                <Sparkles className="w-4 h-4 text-gray-400" />
                              </button>
                              <button
                                onClick={async () => {
                                  const filters = await fetchSmartFilters();
                                  if (filters?.allPendingBoth) {
                                    selectAll(filters.allPendingBoth);
                                    setShowSmartSelection(false);
                                    setMessage(`Selected ${filters.allPendingBoth.length} domains pending both analyses`);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                              >
                                <span>All Pending Both</span>
                                <Zap className="w-4 h-4 text-gray-400" />
                              </button>
                              <div className="border-t mt-2 pt-2">
                                <button
                                  onClick={() => {
                                    selectAll(domains.filter(d => d.qualificationStatus === 'pending').map(d => d.id));
                                    setShowSmartSelection(false);
                                    setMessage(`Selected all ${domains.filter(d => d.qualificationStatus === 'pending').length} pending domains`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                >
                                  All Pending Domains
                                </button>
                                <button
                                  onClick={() => {
                                    selectAll(domains.filter(d => !d.hasWorkflow).map(d => d.id));
                                    setShowSmartSelection(false);
                                    setMessage(`Selected ${domains.filter(d => !d.hasWorkflow).length} domains without workflows`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                >
                                  No Workflow
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Target Page Selection Mode */}
                      <div className="flex items-center mr-3">
                        <label htmlFor="targetPageMode" className="mr-2 text-sm text-gray-700">
                          Target URLs:
                        </label>
                        <select
                          id="targetPageMode"
                          value={targetPageSelectionMode}
                          onChange={(e) => setTargetPageSelectionMode(e.target.value as 'all' | 'order' | 'manual')}
                          className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Client URLs</option>
                          {orderId && orderContext.order && (
                            <option value="order">Order URLs Only</option>
                          )}
                          <option value="manual">Select URLs...</option>
                        </select>
                        
                        {/* Show selected count for manual mode */}
                        {targetPageSelectionMode === 'manual' && (
                          <>
                            <button
                              onClick={() => setShowTargetPageSelector(true)}
                              className="ml-2 text-sm text-indigo-600 hover:text-indigo-700 underline"
                            >
                              {manuallySelectedTargetPages.size === 0 
                                ? 'Select URLs' 
                                : `${manuallySelectedTargetPages.size} selected`}
                            </button>
                            {manuallySelectedTargetPages.size > 0 && (
                              <button
                                onClick={() => setManuallySelectedTargetPages(new Set())}
                                className="ml-2 text-sm text-red-600 hover:text-red-700"
                                title="Clear selection"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Master Qualification Button */}
                      <button
                        onClick={startMasterQualification}
                        disabled={bulkAnalysisRunning || loading || masterQualificationRunning || 
                                 (targetPageSelectionMode === 'manual' && manuallySelectedTargetPages.size === 0)}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        {masterQualificationRunning ? (
                          <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        {masterQualificationRunning ? 'Qualifying...' : 'Auto-Qualify Selected'}
                      </button>

                      {/* Create Workflows Button - Show when qualified domains are selected */}
                      {(() => {
                        const selectedDomainsArray = Array.from(selectedDomains);
                        const qualifiedDomains = domains.filter(d => 
                          selectedDomainsArray.includes(d.id) && 
                          (d.qualificationStatus === 'high_quality' || d.qualificationStatus === 'good_quality') && 
                          !d.hasWorkflow
                        );
                        
                        if (qualifiedDomains.length > 0) {
                          return (
                            <button
                              onClick={() => bulkCreateWorkflows(qualifiedDomains.map(d => d.id))}
                              disabled={bulkWorkflowCreating}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                              {bulkWorkflowCreating ? (
                                <>
                                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create {qualifiedDomains.length} Workflow{qualifiedDomains.length > 1 ? 's' : ''}
                                </>
                              )}
                            </button>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                          onBlur={() => setTimeout(() => setIsMoreActionsOpen(false), 200)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          More Actions
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        
                        {isMoreActionsOpen && (
                          <div className="absolute right-0 z-10 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
                            {/* Update Status - Nested */}
                            <div className="relative">
                              <button
                                onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Update Status
                                <ChevronDown className="w-4 h-4 ml-auto" />
                              </button>
                              
                              {showBulkStatusMenu && (
                                <div className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                                  <button
                                    onClick={() => {
                                      handleBulkStatusUpdate('high_quality');
                                      setIsMoreActionsOpen(false);
                                      setShowBulkStatusMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    High Quality
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleBulkStatusUpdate('good_quality');
                                      setIsMoreActionsOpen(false);
                                      setShowBulkStatusMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                    Good Quality
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleBulkStatusUpdate('marginal_quality');
                                      setIsMoreActionsOpen(false);
                                      setShowBulkStatusMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    Marginal Quality
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleBulkStatusUpdate('pending');
                                      setIsMoreActionsOpen(false);
                                      setShowBulkStatusMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Loader2 className="w-4 h-4 text-gray-600" />
                                    Pending
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleBulkStatusUpdate('disqualified');
                                      setIsMoreActionsOpen(false);
                                      setShowBulkStatusMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600" />
                                    Disqualified
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Move to Project */}
                            <button
                              onClick={() => {
                                setShowMoveDialog(true);
                                setIsMoreActionsOpen(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Move to Project
                            </button>
                            
                            {/* Export */}
                            <button
                              onClick={() => {
                                handleExportSelected();
                                setIsMoreActionsOpen(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export CSV
                            </button>
                            
                            <div className="border-t border-gray-200 my-1"></div>
                            
                            {/* DataForSEO Only */}
                            <button
                              onClick={() => {
                                startBulkDataForSeoAnalysis();
                                setIsMoreActionsOpen(false);
                              }}
                              disabled={bulkAnalysisRunning || loading}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bulkAnalysisRunning ? (
                                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Search className="w-4 h-4 mr-2" />
                              )}
                              DataForSEO Only
                            </button>
                            
                            {/* AI Only */}
                            <button
                              onClick={() => {
                                startAIQualification();
                                setIsMoreActionsOpen(false);
                              }}
                              disabled={bulkAnalysisRunning || loading || masterQualificationRunning}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {masterQualificationRunning ? (
                                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Brain className="w-4 h-4 mr-2" />
                              )}
                              AI Qualify Only
                            </button>
                            
                            <div className="border-t border-gray-200 my-1"></div>
                            
                            {/* Delete */}
                            <button
                              onClick={() => {
                                handleBulkDelete();
                                setIsMoreActionsOpen(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Selected
                            </button>
                          </div>
                        )}
                      </div>
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
                  // Status filter - if any statuses are selected, domain must match one of them
                  if (statusFilter.length > 0 && !statusFilter.includes(domain.qualificationStatus)) return false;
                  
                  // Workflow filter
                  if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
                  if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
                  
                  // Verification filter
                  if (verificationFilter === 'human_verified' && !domain.wasManuallyQualified) return false;
                  if (verificationFilter === 'ai_qualified' && (domain.wasManuallyQualified || domain.qualificationStatus === 'pending')) return false;
                  if (verificationFilter === 'unverified' && domain.qualificationStatus !== 'pending') return false;
                  
                  // Search filter
                  if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  
                  return true;
                });
                
                // Apply sorting
                const paginatedDomains = sortedFilteredDomains.slice(0, displayLimit);
                const hasMore = sortedFilteredDomains.length > displayLimit;
                
                return (
                  <>
                    {/* Quick Actions when no domains selected */}
                    {selectedDomains.size === 0 && filteredDomains.length > 0 && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-purple-800">
                            <strong>Tip:</strong> Select domains to qualify them with AI
                          </p>
                          <button
                            onClick={() => selectAll(sortedFilteredDomains.map(d => d.id))}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Select All {sortedFilteredDomains.length} Domains
                          </button>
                        </div>
                      </div>
                    )}

                    <BulkAnalysisTable
                      domains={paginatedDomains}
                      targetPages={targetPages}
                      selectedDomains={selectedDomains}
                      recentlyAnalyzedDomains={recentlyAnalyzedDomains}
                      onToggleSelection={toggleDomainSelection}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      onUpdateStatus={updateQualificationStatus}
                      onCreateWorkflow={createWorkflow}
                      onDeleteDomain={deleteDomain}
                      onAnalyzeWithDataForSeo={analyzeWithDataForSeo}
                      onAddToOrder={(domains) => {
                        // Open smart domain assignment modal
                        setDomainAssignmentModal({
                          isOpen: true,
                          domains: domains
                        });
                      }}
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
                      onAIQualifySingle={aiQualifySingleDomain}
                      selectedPositionRange={selectedPositionRange}
                      loading={loading}
                      keywordInputMode={keywordInputMode}
                      manualKeywords={manualKeywords}
                      triageMode={triageMode}
                      onToggleTriageMode={() => setShowGuidedTriage(true)}
                      onBulkCreateWorkflows={bulkCreateWorkflows}
                      bulkWorkflowCreating={bulkWorkflowCreating}
                    />
                    
                    {/* Show More Button */}
                    {hasMore && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setDisplayLimit(displayLimit + ITEMS_PER_PAGE)}
                          className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Show More ({sortedFilteredDomains.length - paginatedDomains.length} remaining)
                        </button>
                      </div>
                    )}
                    
                    {/* Results Summary */}
                    <div className="mt-4 text-center">
                      <div className="text-sm text-gray-600">
                        Showing {paginatedDomains.length} of {sortedFilteredDomains.length} domains
                        {sortedFilteredDomains.length < domains.length && (
                          <span className="text-indigo-600 ml-1">
                            (filtered from {domains.length} total)
                          </span>
                        )}
                      </div>
                      
                      {/* Active Filters Summary */}
                      {(searchQuery || statusFilter.length > 0 || workflowFilter !== 'all' || verificationFilter !== 'all') && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                          <span className="text-gray-500">Active filters:</span>
                          {searchQuery && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              Search: "{searchQuery}"
                            </span>
                          )}
                          {statusFilter.length > 0 && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                              Status: {statusFilter.length === statusOptions.length ? 'All' : statusFilter.map(s => s.replace('_', ' ')).join(', ')}
                            </span>
                          )}
                          {workflowFilter !== 'all' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {workflowFilter === 'has_workflow' ? 'Has workflow' : 'No workflow'}
                            </span>
                          )}
                          {verificationFilter !== 'all' && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
                              {verificationFilter === 'human_verified' ? 'Human verified' : 
                               verificationFilter === 'ai_qualified' ? 'AI qualified' : 'Unverified'}
                            </span>
                          )}
                        </div>
                      )}
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
          taskId={dataForSeoModal.taskId}
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


      {/* Guided Triage Flow */}
      {showGuidedTriage && (
        <GuidedTriageFlow
          domains={currentSortedFilteredDomains}
          targetPages={targetPages}
          onClose={() => {
            setShowGuidedTriage(false);
            loadDomains(); // Reload to see updates
            
            // If user came from guided link, navigate properly
            if (cameFromGuidedLink) {
              // Check if we have an order context to go back to
              if (orderContext?.order?.id) {
                router.push(`/orders/${orderContext.order.id}/internal`);
              } else {
                // Fallback to going back or to the projects list
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push(`/clients/${params.id}/bulk-analysis`);
                }
              }
            }
          }}
          onUpdateStatus={async (domainId: string, status: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified', isManual?: boolean) => {
            await updateQualificationStatus(domainId, status, isManual);
            
            // If user came from guided link and just qualified the domain they were guided to
            if (cameFromGuidedLink && domainId === searchParams.get('guided')) {
              // Short delay to show the update, then navigate back
              setTimeout(() => {
                if (orderContext?.order?.id) {
                  router.push(`/orders/${orderContext.order.id}/internal`);
                } else {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(`/clients/${params.id}/bulk-analysis`);
                  }
                }
              }, 500);
            }
          }}
          onAnalyzeWithDataForSeo={analyzeWithDataForSeo}
          keywordInputMode={keywordInputMode}
          manualKeywords={manualKeywords}
          userId={AuthService.getSession()?.userId || ''}
        />
      )}

      {/* Move to Project Dialog */}
      {showMoveDialog && (
        <MoveToProjectDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          clientId={params.id as string}
          currentProjectId={params.projectId as string}
          domainCount={selectedDomains.size}
          onConfirm={handleMoveToProject}
        />
      )}

      {/* Duplicate Resolution Modal */}
      <DuplicateResolutionModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicatesToResolve([]);
          setPendingDomainSubmission(null);
        }}
        duplicates={duplicatesToResolve}
        targetProjectName={project?.name || 'this project'}
        onResolve={handleDuplicateResolution}
        loading={loading}
      />
      
      {/* Domain Assignment Modal (Smart Assignment) */}
      <DomainAssignmentModal
        isOpen={domainAssignmentModal.isOpen}
        selectedDomains={domainAssignmentModal.domains}
        clientId={params.id as string}
        projectId={params.projectId as string}
        sourceOrderId={orderId || undefined}
        onClose={() => setDomainAssignmentModal({ isOpen: false, domains: [] })}
        onAssignmentComplete={(result) => {
          setMessage(`✅ Successfully assigned ${result.assignments?.length || 0} domains to line items!`);
          // Refresh domains to show updated assignments
          loadDomains();
          // Navigate to order after a short delay
          setTimeout(() => {
            // Use orderId from result
            const orderId = result.orderId || result.assignments?.[0]?.orderId;
            if (orderId) {
              router.push(`/orders/${orderId}/internal`);
            }
          }, 2000);
        }}
      />

      {/* Target Page Selection Modal */}
      {showTargetPageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select Target URLs for Qualification</h2>
              <button
                onClick={() => setShowTargetPageSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4 text-sm text-gray-600">
              Select which target URLs should be used when qualifying domains. Only selected URLs will be matched against.
            </div>

            {/* Quick actions */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setManuallySelectedTargetPages(new Set(targetPages.map(tp => tp.id)))}
                className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Select All ({targetPages.length})
              </button>
              <button
                onClick={() => setManuallySelectedTargetPages(new Set())}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear All
              </button>
              {orderId && orderContext.order?.lineItems && (
                <button
                  onClick={() => {
                    const orderTargetPageIds = new Set<string>();
                    for (const lineItem of orderContext.order.lineItems) {
                      // Check both targetPageIds (array) and targetPageId (single)
                      if (lineItem.targetPageIds && Array.isArray(lineItem.targetPageIds)) {
                        lineItem.targetPageIds.forEach((id: string) => orderTargetPageIds.add(id));
                      } else if (lineItem.targetPageId) {
                        orderTargetPageIds.add(lineItem.targetPageId);
                      }
                    }
                    setManuallySelectedTargetPages(orderTargetPageIds);
                  }}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select Order URLs
                </button>
              )}
            </div>

            {/* Target pages list */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-4">
              {targetPages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No target pages found for this client
                </div>
              ) : (
                <div className="space-y-2">
                  {targetPages.map((targetPage) => (
                    <label
                      key={targetPage.id}
                      className="flex items-start p-3 hover:bg-gray-50 cursor-pointer rounded-md"
                    >
                      <input
                        type="checkbox"
                        checked={manuallySelectedTargetPages.has(targetPage.id)}
                        onChange={(e) => {
                          const newSelection = new Set(manuallySelectedTargetPages);
                          if (e.target.checked) {
                            newSelection.add(targetPage.id);
                          } else {
                            newSelection.delete(targetPage.id);
                          }
                          setManuallySelectedTargetPages(newSelection);
                        }}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">
                          {targetPage.url}
                        </div>
                        <div className="text-sm text-gray-500">
                          {targetPage.domain}
                        </div>
                        {targetPage.keywords && (
                          <div className="text-xs text-gray-400 mt-1">
                            {targetPage.keywords.split(',').filter(k => k.trim()).length} keywords
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {manuallySelectedTargetPages.size} of {targetPages.length} selected
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTargetPageSelector(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowTargetPageSelector(false);
                    if (manuallySelectedTargetPages.size > 0) {
                      setMessage(`Selected ${manuallySelectedTargetPages.size} target URLs for qualification`);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Apply Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Order Selection Modal (keep for fallback) */}
      <OrderSelectionModal
        isOpen={orderSelectionModal.isOpen}
        onClose={() => setOrderSelectionModal({ isOpen: false, domains: [] })}
        clientId={params.id as string}
        projectId={params.projectId as string}
        onSelectOrder={(orderId) => {
          if (orderId) {
            // Add to existing order
            handleAddToExistingOrder(orderId, orderSelectionModal.domains);
          } else {
            // Create new order
            const domainIds = orderSelectionModal.domains.map(d => d.id);
            const searchParams = new URLSearchParams();
            searchParams.set('domains', JSON.stringify(domainIds));
            searchParams.set('clientId', params.id as string);
            router.push(`/orders/new`);
          }
          setOrderSelectionModal({ isOpen: false, domains: [] });
        }}
      />
    </AuthWrapper>
  );
}