'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService, type AuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  ArrowLeft, Loader2, CheckCircle, Clock, Users, FileText, 
  RefreshCw, ExternalLink, Globe, LinkIcon, Eye, Package,
  Target, ChevronRight, ChevronUp, ChevronDown, AlertCircle, Activity, Building, User, DollarSign,
  Download, Share2, XCircle, CreditCard, Trash2, Zap, PlayCircle,
  ClipboardCheck, Send, Database, Search, Plus, Edit, KeyRound, Sparkles
} from 'lucide-react';

interface TargetPageStatus {
  id: string;
  url: string;
  hasKeywords: boolean;
  hasDescription: boolean;
  keywordCount: number;
  clientName: string;
  orderGroupId: string;
}

interface SiteSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: {
    id: string;
    domain: string;
    qualificationStatus?: string;
    notes?: string;
  } | null;
  domainRating?: number;
  traffic?: number;
  price: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'client_approved' | 'client_rejected';
  submissionStatus?: string;
  clientApprovedAt?: string;
  clientRejectedAt?: string;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
  specialInstructions?: string;
  targetPageUrl?: string;
  anchorText?: string;
  metadata?: {
    targetPageUrl?: string;
    anchorText?: string;
    specialInstructions?: string;
    suggestedBy?: string;
    suggestedAt?: string;
    suggestedReason?: string;
    batchId?: string;
    projectId?: string;
    qualificationStatus?: string;
    hasDataForSeoResults?: boolean;
    notes?: string;
    lastUpdatedBy?: string;
    lastUpdatedAt?: string;
    // AI Qualification fields
    overlapStatus?: 'direct' | 'related' | 'both' | 'none';
    authorityDirect?: 'strong' | 'moderate' | 'weak' | 'n/a';
    authorityRelated?: 'strong' | 'moderate' | 'weak' | 'n/a';
    topicScope?: 'short_tail' | 'long_tail' | 'ultra_long_tail';
    topicReasoning?: string;
    aiQualificationReasoning?: string;
    evidence?: {
      direct_count: number;
      direct_median_position: number | null;
      related_count: number;
      related_median_position: number | null;
    };
    statusHistory?: Array<{
      status: string;
      timestamp: string;
      updatedBy: string;
      notes?: string;
    }>;
    [key: string]: any;
  };
}

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
  };
  linkCount: number;
  bulkAnalysisProjectId?: string;
  targetPages?: Array<{
    id?: string;
    url: string;
    pageId?: string;
  }>;
  anchorTexts?: string[];
  packageType?: string;
  packagePrice?: number;
  groupStatus?: string;
  siteSelections?: {
    approved: number;
    pending: number;
    total: number;
  };
}

interface Account {
  id: string;
  email: string;
  contactName?: string;
  companyName?: string;
}

interface OrderDetail {
  id: string;
  accountId: string;
  account?: Account;
  status: string;
  state?: string;
  subtotal: number;
  totalPrice: number;
  totalWholesale?: number;
  profitMargin?: number;
  discountAmount?: number;
  discountPercent?: string;
  includesClientReview?: boolean;
  clientReviewFee?: number;
  rushDelivery?: boolean;
  rushFee?: number;
  internalNotes?: string;
  accountNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  paidAt?: string;
  completedAt?: string;
  orderGroups?: OrderGroup[];
}

// Helper functions for state and progress
const getStateDisplay = (status: string, state?: string) => {
  if (status === 'draft') return { label: 'Draft', color: 'bg-gray-100 text-gray-700' };
  if (status === 'pending_confirmation') return { label: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-700' };
  if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  if (status === 'completed') return { label: 'Completed', color: 'bg-green-100 text-green-700' };
  
  // For confirmed orders, show the state
  switch (state) {
    case 'analyzing':
      return { label: 'Finding Sites', color: 'bg-blue-100 text-blue-700' };
    case 'sites_ready':
    case 'site_review':
      return { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'client_reviewing':
      return { label: 'Client Reviewing', color: 'bg-purple-100 text-purple-700' };
    case 'selections_confirmed':
      return { label: 'Selections Confirmed', color: 'bg-green-100 text-green-700' };
    case 'payment_received':
      return { label: 'Payment Received', color: 'bg-green-100 text-green-700' };
    case 'workflows_generated':
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
    default:
      return { label: 'Processing', color: 'bg-gray-100 text-gray-700' };
  }
};

const getProgressSteps = (status: string, state?: string) => {
  const steps = [
    { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, description: 'Order has been received and confirmed' },
    { id: 'analyzing', label: 'Finding Sites', icon: Search, description: 'Team is identifying suitable sites' },
    { id: 'site_review', label: 'Review Sites', icon: Users, description: 'Sites ready for client review' },
    { id: 'in_progress', label: 'Creating Content', icon: FileText, description: 'Writing and placing links' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, description: 'All links have been placed' }
  ];
  
  let currentStep = 0;
  if (status === 'confirmed' || status === 'pending_confirmation') {
    currentStep = 1;
    if (state === 'analyzing') currentStep = 1;
    if (state === 'sites_ready' || state === 'site_review' || state === 'client_reviewing') currentStep = 2;
    if (state === 'selections_confirmed' || state === 'payment_received' || state === 'workflows_generated' || state === 'in_progress') currentStep = 3;
  }
  if (status === 'paid') currentStep = 3;
  if (status === 'completed') currentStep = 4;
  
  return { steps, currentStep };
};

export default function InternalOrderManagementPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [siteSubmissions, setSiteSubmissions] = useState<Record<string, SiteSubmission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [targetPageStatuses, setTargetPageStatuses] = useState<TargetPageStatus[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<string | null>(null);
  const [editingLineItem, setEditingLineItem] = useState<{ groupId: string; index: number } | null>(null);
  const [assigningDomain, setAssigningDomain] = useState<string | null>(null);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Handle closing edit dropdown on click outside or ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingLineItem && !(e.target as HTMLElement).closest('.edit-dropdown')) {
        setEditingLineItem(null);
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingLineItem) {
        setEditingLineItem(null);
      }
    };
    
    if (editingLineItem) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [editingLineItem]);

  useEffect(() => {
    const checkAuth = async () => {
      // Check session for userType
      const currentSession = AuthService.getSession();
      if (!currentSession || currentSession.userType !== 'internal') {
        router.push('/orders');
        return;
      }
      
      setSession(currentSession);
      loadOrder();
    };
    
    checkAuth();
  }, [orderId]);

  useEffect(() => {
    // Always load site submissions to show suggestions
    if (order?.orderGroups) {
      loadSiteSubmissions();
    }
    if (order?.status === 'pending_confirmation') {
      checkTargetPageStatuses();
    }
  }, [order?.state, order?.orderGroups, order?.status]);

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to load order');
      }
      
      const data = await response.json();
      console.log('Order data received:', data);
      console.log('Order groups:', data.orderGroups);
      
      // Don't load site submissions here - they'll be loaded separately
      
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const loadSiteSubmissions = async () => {
    if (!order?.orderGroups) return;
    
    setLoadingSubmissions(true);
    try {
      const submissionsByGroup: Record<string, SiteSubmission[]> = {};
      
      for (const group of order.orderGroups) {
        try {
          const response = await fetch(`/api/orders/${order.id}/groups/${group.id}/submissions`);
          if (response.ok) {
            const data = await response.json();
            submissionsByGroup[group.id] = data.submissions || [];
          }
        } catch (error) {
          console.error(`Error loading submissions for group ${group.id}:`, error);
        }
      }
      
      setSiteSubmissions(submissionsByGroup);
    } catch (error) {
      console.error('Error loading site submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const checkTargetPageStatuses = async () => {
    if (!order?.orderGroups) return;
    
    const statuses: TargetPageStatus[] = [];
    
    for (const group of order.orderGroups) {
      for (const targetPage of group.targetPages || []) {
        if (targetPage.pageId) {
          try {
            const response = await fetch(`/api/target-pages/${targetPage.pageId}`);
            if (response.ok) {
              const pageData = await response.json();
              statuses.push({
                id: pageData.id,
                url: pageData.url,
                hasKeywords: !!(pageData.keywords && pageData.keywords.trim() !== ''),
                hasDescription: !!(pageData.description && pageData.description.trim() !== ''),
                keywordCount: pageData.keywords ? pageData.keywords.split(',').filter((k: string) => k.trim()).length : 0,
                clientName: group.client.name,
                orderGroupId: group.id
              });
            }
          } catch (error) {
            console.error(`Failed to load target page ${targetPage.pageId}:`, error);
          }
        }
      }
    }
    
    setTargetPageStatuses(statuses);
    
    // Auto-select pages that need keywords
    const pagesNeedingKeywords = statuses.filter(p => !p.hasKeywords).map(p => p.id);
    setSelectedPages(new Set(pagesNeedingKeywords));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    if (order?.state === 'sites_ready' || order?.state === 'site_review' || order?.state === 'client_reviewing') {
      await loadSiteSubmissions();
    }
    if (order?.status === 'pending_confirmation') {
      await checkTargetPageStatuses();
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const generateKeywordsForSelected = async () => {
    if (selectedPages.size === 0) {
      setMessage({ type: 'warning', text: 'Please select target pages to generate keywords for' });
      return;
    }
    
    setGeneratingKeywords(true);
    setMessage({ type: 'info', text: `Generating keywords for ${selectedPages.size} target pages...` });
    
    let successCount = 0;
    let failureCount = 0;
    let currentIndex = 0;
    const totalPages = selectedPages.size;
    
    for (const pageId of selectedPages) {
      const page = targetPageStatuses.find(p => p.id === pageId);
      if (!page) continue;
      
      currentIndex++;
      setCurrentProcessingPage(page.url);
      setMessage({ 
        type: 'info', 
        text: `Processing ${currentIndex}/${totalPages}: ${page.url}` 
      });
      
      try {
        // Generate keywords
        if (!page.hasKeywords) {
          const keywordResponse = await fetch(`/api/target-pages/${pageId}/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!keywordResponse.ok) {
            const errorData = await keywordResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to generate keywords (${keywordResponse.status})`);
          }
        }
        
        // Generate description
        if (!page.hasDescription) {
          const descResponse = await fetch(`/api/target-pages/${pageId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!descResponse.ok) {
            const errorData = await descResponse.json().catch(() => ({}));
            console.error(`Failed to generate description for ${page.url}:`, errorData.error || descResponse.statusText);
            // Continue with other pages even if description fails
          }
        }
        
        successCount++;
        
        // Add a small delay between API calls to avoid rate limits
        if (currentIndex < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      } catch (error: any) {
        console.error(`Failed to generate content for ${page.url}:`, error);
        failureCount++;
      }
    }
    
    setGeneratingKeywords(false);
    setCurrentProcessingPage(null);
    
    if (failureCount === 0) {
      setMessage({ 
        type: 'success', 
        text: `Successfully generated keywords for ${successCount} target pages` 
      });
    } else {
      setMessage({ 
        type: 'warning', 
        text: `Generated keywords for ${successCount} pages, ${failureCount} failed` 
      });
    }
    
    // Reload target page statuses
    await checkTargetPageStatuses();
  };

  const handleConfirmOrder = async () => {
    if (!order) return;
    
    // Check if all target pages have keywords
    const pagesWithoutKeywords = targetPageStatuses.filter(p => !p.hasKeywords);
    if (pagesWithoutKeywords.length > 0) {
      setMessage({ 
        type: 'warning', 
        text: `${pagesWithoutKeywords.length} target pages still need keywords. Please generate them first.` 
      });
      return;
    }
    
    setActionLoading(prev => ({ ...prev, confirm: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: session?.userId || undefined
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to confirm order');
      }
      
      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Order confirmed successfully! Created ${data.projectsCreated} bulk analysis projects.`
      });
      await loadOrder();
    } catch (err) {
      console.error('Error confirming order:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to confirm order'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, confirm: false }));
    }
  };

  const handleMarkSitesReady = async () => {
    setActionLoading(prev => ({ ...prev, sites_ready: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/update-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'sites_ready' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order state');
      }
      
      setMessage({
        type: 'success',
        text: 'Sites marked as ready for client review'
      });
      await loadOrder();
    } catch (err) {
      console.error('Error updating order state:', err);
      setMessage({
        type: 'error',
        text: 'Failed to update order state'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, sites_ready: false }));
    }
  };

  const handleAssignTargetPage = async (submissionId: string, targetPageUrl: string, groupId: string) => {
    try {
      setAssigningDomain(submissionId);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Use the new target URL update endpoint
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/site-selections/${submissionId}/target-url`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ 
          targetPageUrl,
          anchorText: null // Can be set later
        })
      }).finally(() => clearTimeout(timeoutId));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update target page assignment');
      }
      
      // Reload submissions to show the update
      await loadSiteSubmissions();
      setMessage({
        type: 'success',
        text: targetPageUrl ? 'Domain assigned to target page successfully' : 'Domain unassigned successfully'
      });
      
    } catch (error: any) {
      console.error('Error assigning target page:', error);
      
      let errorMessage = 'Failed to assign target page';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({
        type: 'error',
        text: `Error: ${errorMessage}`
      });
    } finally {
      setAssigningDomain(null);
    }
  };

  const handleGenerateWorkflows = async () => {
    if (!order || order.status !== 'paid') {
      setMessage({
        type: 'warning',
        text: 'Order must be paid before generating workflows'
      });
      return;
    }
    
    setActionLoading(prev => ({ ...prev, generate_workflows: true }));
    try {
      const response = await fetch(`/api/orders/${orderId}/generate-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate workflows');
      }
      
      const data = await response.json();
      setMessage({
        type: 'success',
        text: `Successfully generated ${data.workflowsCreated} workflows!`
      });
      await loadOrder();
    } catch (err) {
      console.error('Error generating workflows:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to generate workflows'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, generate_workflows: false }));
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (error || !order) {
    return (
      <AuthWrapper>
        <Header />
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">{error || 'Order not found'}</p>
            <Link href="/orders" className="mt-4 text-blue-600 hover:underline">
              Back to Orders
            </Link>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_confirmation': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const { steps, currentStep } = getProgressSteps(order?.status || '', order?.state);
  const stateDisplay = getStateDisplay(order?.status || '', order?.state);

  // Progressive column system based on workflow stage
  const getWorkflowStage = () => {
    if (!order) return 'initial';
    if (order.status === 'completed') return 'completed';
    if (order.state === 'in_progress') return 'content_creation';
    
    // Check if we have any site submissions - if so, we're past initial selection
    const totalSubmissions = Object.values(siteSubmissions).flat().length;
    
    if (totalSubmissions > 0) {
      // If we have sites, determine if we're in selection or post-approval phase
      const approvedSubmissions = Object.values(siteSubmissions).flat().filter(s => s.submissionStatus === 'client_approved').length;
      
      // If more than half are approved, we're in post-approval consolidation phase
      if (approvedSubmissions / totalSubmissions > 0.5) {
        return 'post_approval';
      }
      
      // Otherwise, we're still in site selection but with consolidated view
      return 'site_selection_with_sites';
    }
    
    // No sites yet - show traditional separate columns
    return 'initial';
  };

  const workflowStage = getWorkflowStage();

  const getColumnConfig = () => {
    switch (workflowStage) {
      case 'site_selection_with_sites':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'status']
        };
      case 'post_approval':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'status']
        };
      case 'content_creation':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: true,
          showPublishedUrl: false,
          showStatus: true,
          columns: ['client', 'link_details', 'site', 'content_status', 'draft_url']
        };
      case 'completed':
        return {
          showSeparateDetails: false,
          showGuestPostSite: true,
          showDraftUrl: false,
          showPublishedUrl: true,
          showStatus: false,
          columns: ['client', 'link_details', 'site', 'published_url', 'completion']
        };
      default:
        return {
          showSeparateDetails: true,
          showGuestPostSite: false,
          showDraftUrl: false,
          showPublishedUrl: false,
          showStatus: false,
          columns: ['client', 'anchor', 'price', 'tools']
        };
    }
  };

  const columnConfig = getColumnConfig();

  const getColumnCount = () => {
    return columnConfig.columns.length;
  };

  // Consolidated Link Details Component
  const LinkDetailsCell = ({ targetPageUrl, anchorText, price }: { 
    targetPageUrl?: string; 
    anchorText?: string; 
    price?: number; 
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <Globe className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium truncate max-w-[200px]" title={targetPageUrl}>
          {targetPageUrl ? (() => {
            try {
              return new URL(targetPageUrl).pathname;
            } catch {
              return targetPageUrl.length > 30 ? targetPageUrl.substring(0, 30) + '...' : targetPageUrl;
            }
          })() : 'No target page'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <LinkIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-700 truncate max-w-[200px]" title={anchorText}>
          "{anchorText || 'No anchor text'}"
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="text-gray-900 font-medium">
          {price ? formatCurrency(price) : 'Price TBD'}
        </span>
      </div>
    </div>
  );

  // Dynamic cell renderer
  const renderTableCell = (
    column: string, 
    data: {
      group: any;
      index: number;
      targetPageUrl?: string;
      anchorText?: string;
      displaySubmission?: any;
      availableForTarget: any[];
      showPoolView: boolean;
      groupId: string;
    }
  ) => {
    const { group, index, targetPageUrl, anchorText, displaySubmission, availableForTarget, showPoolView, groupId } = data;
    
    switch (column) {
      case 'client':
        return (
          <td className="px-6 py-4 pl-8">
            <div className="flex items-center gap-2">
              {showPoolView && availableForTarget.length > 1 && (
                <button
                  className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                  onClick={() => setEditingLineItem(editingLineItem?.groupId === groupId && editingLineItem?.index === index ? null : { groupId, index })}
                  title={`${availableForTarget.length} alternative domains available`}
                >
                  {editingLineItem?.groupId === groupId && editingLineItem?.index === index ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-xs text-gray-500 font-medium">
                    {availableForTarget.length} alternatives
                  </span>
                </button>
              )}
              <div className="text-sm">
                <div className="text-gray-900">Link {index + 1}</div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {targetPageUrl ? 'Target page assigned' : 'No target page selected'}
                </div>
              </div>
            </div>
          </td>
        );
        
      case 'anchor':
        return (
          <td className="px-6 py-4 text-sm text-gray-900">
            {anchorText || '-'}
          </td>
        );
        
      case 'link_details':
        return (
          <td className="px-6 py-4">
            <LinkDetailsCell 
              targetPageUrl={targetPageUrl} 
              anchorText={anchorText}
              price={displaySubmission?.price || (index === 0 ? group.packagePrice : undefined)} 
            />
          </td>
        );
        
      case 'site':
        return columnConfig.showGuestPostSite ? (
          <td className="px-6 py-4">
            {displaySubmission ? (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">
                      {displaySubmission.domain?.domain || 'Unknown'}
                    </div>
                    {group.bulkAnalysisProjectId && displaySubmission.domainId && (
                      <a
                        href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${displaySubmission.domainId}`}
                        className="inline-flex items-center px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded transition-colors"
                        title="View detailed domain analysis"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3 mr-0.5" />
                        Analysis
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${
                      displaySubmission.submissionStatus === 'client_approved' ? 'text-green-600' :
                      displaySubmission.submissionStatus === 'client_rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {displaySubmission.submissionStatus === 'client_approved' ? '✓ Approved' :
                       displaySubmission.submissionStatus === 'client_rejected' ? '✗ Rejected' :
                       '⏳ Pending'}
                    </span>
                    {displaySubmission.domainRating && (
                      <span className="text-xs text-gray-500">DR: {displaySubmission.domainRating}</span>
                    )}
                    {displaySubmission.traffic && (
                      <span className="text-xs text-gray-500">Traffic: {displaySubmission.traffic.toLocaleString()}</span>
                    )}
                    {displaySubmission.metadata?.hasDataForSeoResults && (
                      <span className="text-xs text-indigo-600" title="Has keyword ranking data">
                        <Search className="inline h-3 w-3" />
                      </span>
                    )}
                    {displaySubmission.metadata?.qualificationStatus && (
                      <span className={`text-xs ${
                        displaySubmission.metadata.qualificationStatus === 'high_quality' ? 'text-green-600' :
                        displaySubmission.metadata.qualificationStatus === 'good_quality' ? 'text-blue-600' :
                        displaySubmission.metadata.qualificationStatus === 'marginal_quality' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {displaySubmission.metadata.qualificationStatus === 'high_quality' ? '★★★' :
                         displaySubmission.metadata.qualificationStatus === 'good_quality' ? '★★' :
                         displaySubmission.metadata.qualificationStatus === 'marginal_quality' ? '★' :
                         '○'}
                      </span>
                    )}
                    {displaySubmission.metadata?.overlapStatus && (
                      <span 
                        className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full cursor-help ${
                          displaySubmission.metadata.overlapStatus === 'direct' ? 'bg-green-100 text-green-700' :
                          displaySubmission.metadata.overlapStatus === 'related' ? 'bg-blue-100 text-blue-700' :
                          displaySubmission.metadata.overlapStatus === 'both' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}
                        title={`AI Analysis: ${
                          displaySubmission.metadata.overlapStatus === 'both' ? 'STRONGEST: Perfect match - site ranks for both core and related keywords' :
                          displaySubmission.metadata.overlapStatus === 'direct' ? 'VERY STRONG: Direct keyword match - site ranks for your core keywords' :
                          displaySubmission.metadata.overlapStatus === 'related' ? 'DECENT: Related topic match - site ranks for related keywords' :
                          'No keyword overlap detected'
                        }${displaySubmission.metadata.topicScope ? ` | Content strategy: ${displaySubmission.metadata.topicScope.replace('_', ' ')}` : ''}`}
                      >
                        <Sparkles className="w-3 h-3 mr-0.5" />
                        AI
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : availableForTarget.length > 0 ? (
              <div className="flex items-center gap-2">
                {assigningDomain && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                )}
                <select
                  className="text-sm border-gray-300 rounded-md flex-1"
                  defaultValue=""
                  disabled={!!assigningDomain}
                  onChange={async (e) => {
                    if (e.target.value && targetPageUrl) {
                      // Update the selected domain's target URL
                      await handleAssignTargetPage(e.target.value, targetPageUrl, groupId);
                    }
                  }}
                >
                  <option value="">Select from pool ({availableForTarget.length} available)</option>
                  {availableForTarget.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.domain?.domain} 
                      {sub.domainRating ? ` (DR: ${sub.domainRating})` : ''}
                      {sub.metadata?.targetPageUrl && sub.metadata.targetPageUrl !== targetPageUrl ? ' - suggested for other' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-sm text-gray-400">No sites available</span>
            )}
          </td>
        ) : null;
        
      case 'price':
        return (
          <td className="px-6 py-4 text-right text-sm text-gray-900">
            {index === 0 ? formatCurrency(group.packagePrice || 0) : ''}
          </td>
        );
        
      case 'status':
        return (
          <td className="px-6 py-4">
            <div className="text-sm">
              {displaySubmission ? (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  displaySubmission.submissionStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                  displaySubmission.submissionStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                  displaySubmission.submissionStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {displaySubmission.submissionStatus === 'client_approved' ? 'Approved' :
                   displaySubmission.submissionStatus === 'client_rejected' ? 'Rejected' :
                   displaySubmission.submissionStatus === 'pending' ? 'Pending Review' :
                   displaySubmission.submissionStatus}
                </span>
              ) : (
                <span className="text-gray-500">Awaiting site selection</span>
              )}
            </div>
          </td>
        );
        
      case 'tools':
        return (
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              {/* Tools for individual line items - currently empty but ready for future tools */}
              {/* Bulk Analysis is handled at group level to avoid redundancy */}
              <span className="text-xs text-gray-400">-</span>
            </div>
          </td>
        );
        
      default:
        return <td className="px-6 py-4 text-sm text-gray-500">-</td>;
    }
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/orders"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Internal Management - Order #{order.id.slice(0, 8)}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${stateDisplay.color}`}>
                  {stateDisplay.label}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Order
                </Link>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'warning' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
               <AlertCircle className="h-5 w-5 mt-0.5" />}
              <div className="flex-1">{message.text}</div>
            </div>
          )}

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Progress Steps */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    
                    return (
                      <div key={step.id} className="relative">
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                            ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                          `}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`
                            absolute left-4 top-8 w-0.5 h-8
                            ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                          `} />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Internal Actions Box */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Internal Actions</h3>
                  <div className="space-y-2">
                    {/* Order Confirmation with Target Page Status */}
                    {order.status === 'pending_confirmation' && (
                      <>
                        {/* Target Pages Status Section */}
                        {targetPageStatuses.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-medium text-gray-700">Target Pages Status</h4>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  {targetPageStatuses.filter(p => p.hasKeywords).length} Ready
                                </span>
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                                  {targetPageStatuses.filter(p => !p.hasKeywords).length} Need Keywords
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {targetPageStatuses.map((page) => (
                                <div key={page.id} className={`flex items-center gap-2 p-2 rounded text-xs ${
                                  page.hasKeywords ? 'bg-gray-50' : 'bg-yellow-50'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPages.has(page.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedPages);
                                      if (e.target.checked) {
                                        newSelected.add(page.id);
                                      } else {
                                        newSelected.delete(page.id);
                                      }
                                      setSelectedPages(newSelected);
                                    }}
                                    disabled={page.hasKeywords}
                                    className="rounded text-indigo-600 h-3 w-3"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate text-gray-700">{page.url}</div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500">{page.clientName}</span>
                                      {page.hasKeywords ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                          <KeyRound className="h-3 w-3" />
                                          {page.keywordCount}
                                        </span>
                                      ) : (
                                        <span className="text-yellow-600">No keywords</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {targetPageStatuses.some(p => !p.hasKeywords) && (
                              <button
                                onClick={generateKeywordsForSelected}
                                disabled={generatingKeywords || selectedPages.size === 0}
                                className="mt-2 w-full px-3 py-2 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {generatingKeywords ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {currentProcessingPage ? 'Processing...' : 'Generating...'}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    Generate Keywords ({selectedPages.size})
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Confirm Order Button */}
                        <button
                          onClick={handleConfirmOrder}
                          disabled={actionLoading.confirm || targetPageStatuses.some(p => !p.hasKeywords)}
                          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading.confirm ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Confirming...
                            </span>
                          ) : (
                            'Confirm Order'
                          )}
                        </button>
                        
                        {targetPageStatuses.some(p => !p.hasKeywords) && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Generate keywords for all target pages before confirming
                          </p>
                        )}
                      </>
                    )}
                    
                    {/* Bulk Analysis Links */}
                    {order.state === 'analyzing' && order.orderGroups?.some(g => g.bulkAnalysisProjectId) && (
                      <div className="space-y-2">
                        {order.orderGroups.filter(g => g.bulkAnalysisProjectId).map(group => (
                          <Link
                            key={group.id}
                            href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                            className="block w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 text-center"
                          >
                            Analyze {group.client.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    {/* Site Readiness */}
                    {order.state === 'analyzing' && (
                      <button
                        onClick={handleMarkSitesReady}
                        disabled={actionLoading.sites_ready}
                        className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading.sites_ready ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          'Mark Sites Ready'
                        )}
                      </button>
                    )}
                    
                    {/* Workflow Generation */}
                    {order.status === 'paid' && (
                      <button
                        onClick={handleGenerateWorkflows}
                        disabled={actionLoading.generate_workflows}
                        className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        {actionLoading.generate_workflows ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          'Generate Workflows'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Account Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.account?.contactName || order.account?.companyName || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.account?.email || 'No email'}</dd>
                  </div>
                  {order.account?.companyName && order.account?.contactName && (
                    <div>
                      <dt className="text-sm text-gray-500">Company</dt>
                      <dd className="text-sm font-medium text-gray-900">{order.account.companyName}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Middle/Right Columns - Order Details Table */}
            <div className="lg:col-span-2">
              {/* Site Review Summary Card */}
              {(order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') && Object.keys(siteSubmissions).length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Site Review Status
                      </h3>
                      <p className="text-sm text-purple-700 mt-1">
                        Monitor client's site selection progress
                      </p>
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        {Object.entries(siteSubmissions).map(([groupId, submissions]) => {
                          const group = order.orderGroups?.find(g => g.id === groupId);
                          if (!group) return null;
                          const pending = submissions.filter(s => s.status === 'pending').length;
                          const approved = submissions.filter(s => s.status === 'approved').length;
                          const rejected = submissions.filter(s => s.status === 'rejected').length;
                          
                          return (
                            <div key={groupId} className="flex items-center gap-2">
                              <span className="font-medium">{group.client.name}:</span>
                              {pending > 0 && <span className="text-yellow-700">{pending} pending</span>}
                              {approved > 0 && <span className="text-green-700">{approved} approved</span>}
                              {rejected > 0 && <span className="text-red-700">{rejected} rejected</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {loadingSubmissions && (
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                    )}
                  </div>
                </div>
              )}
              
              {/* Order Details Table with Proper Client Grouping */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                </div>
                
                <div className="overflow-x-auto -mx-6">
                  <div className="inline-block min-w-full px-6 align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {columnConfig.columns.map((column) => {
                          const getColumnHeader = (col: string) => {
                            switch (col) {
                              case 'client': return 'Client / Target Page';
                              case 'anchor': return 'Anchor Text';
                              case 'link_details': return 'Link Details';
                              case 'site': return 'Guest Post Site';
                              case 'price': return 'Price';
                              case 'status': return 'Status';
                              case 'content_status': return 'Content Status';
                              case 'draft_url': return 'Draft URL';
                              case 'published_url': return 'Published URL';
                              case 'completion': return 'Completion';
                              case 'tools': return 'Internal Tools';
                              default: return col;
                            }
                          };

                          const isRightAligned = column === 'price';

                          return (
                            <th 
                              key={column}
                              className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                isRightAligned ? 'text-right' : ''
                              }`}
                            >
                              {getColumnHeader(column)}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Group line items by client */}
                      {order.orderGroups && order.orderGroups.map(group => {
                        const groupId = group.id;
                        const isExpanded = expandedGroup === groupId;
                        const groupSubmissions = siteSubmissions[groupId] || [];
                        
                        // Calculate statistics for this group
                        const totalSuggestions = groupSubmissions.length;
                        const approvedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_approved').length;
                        const pendingCount = groupSubmissions.filter(s => s.submissionStatus === 'pending').length;
                        const rejectedCount = groupSubmissions.filter(s => s.submissionStatus === 'client_rejected').length;
                        
                        // Determine which submissions are assigned to line items
                        const assignedSubmissions = groupSubmissions.filter(s => s.targetPageUrl || s.metadata?.targetPageUrl);
                        const unassignedSubmissions = groupSubmissions.filter(s => !s.targetPageUrl && !s.metadata?.targetPageUrl);
                        
                        // Check if we should show pool view (more suggestions than needed or has unassigned)
                        const showPoolView = totalSuggestions > group.linkCount || unassignedSubmissions.length > 0;
                        
                        return (
                        <>
                          {/* Client group header row */}
                          <tr key={`${groupId}-header`} className="bg-gray-50">
                            <td colSpan={getColumnCount()} className="px-6 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">{group.client.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {group.linkCount} link{group.linkCount > 1 ? 's' : ''} needed
                                    </div>
                                  </div>
                                  {totalSuggestions > 0 && (
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-gray-500">
                                        {totalSuggestions} site{totalSuggestions !== 1 ? 's' : ''} suggested
                                      </span>
                                      {approvedCount > 0 && (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle className="h-3 w-3" />
                                          {approvedCount} approved
                                        </span>
                                      )}
                                      {pendingCount > 0 && (
                                        <span className="flex items-center gap-1 text-yellow-600">
                                          <Clock className="h-3 w-3" />
                                          {pendingCount} pending
                                        </span>
                                      )}
                                      {rejectedCount > 0 && (
                                        <span className="flex items-center gap-1 text-red-600">
                                          <XCircle className="h-3 w-3" />
                                          {rejectedCount} rejected
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {group.bulkAnalysisProjectId && (
                                  <Link
                                    href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`}
                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    <Database className="h-3 w-3 mr-1" />
                                    Bulk Analysis
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Line items for this client */}
                          {[...Array(group.linkCount)].map((_, index) => {
                            const targetPageUrl = group.targetPages?.[index]?.url;
                            const anchorText = group.anchorTexts?.[index];
                            
                            // Find site submissions for this line item
                            const exactMatch = groupSubmissions.find(sub => 
                              (sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl) &&
                              sub.submissionStatus === 'client_approved'
                            );
                            
                            // If no exact approved match, look for any suggestion for this target
                            const suggestedMatch = !exactMatch ? groupSubmissions.find(sub => 
                              (sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl)
                            ) : null;
                            
                            // Get available suggestions for this target (for dropdown)
                            const availableForTarget = groupSubmissions.filter(sub => {
                              // Include if suggested for this target or unassigned
                              const isForThisTarget = sub.targetPageUrl === targetPageUrl || 
                                                     sub.metadata?.targetPageUrl === targetPageUrl;
                              const isUnassigned = !sub.targetPageUrl && !sub.metadata?.targetPageUrl;
                              const isNotRejected = sub.submissionStatus !== 'client_rejected';
                              
                              return (isForThisTarget || isUnassigned) && isNotRejected;
                            });
                            
                            const displaySubmission = exactMatch || suggestedMatch;
                            
                            return (
                              <React.Fragment key={`${groupId}-${index}`}>
                                <tr className="hover:bg-gray-50">
                                  {columnConfig.columns.map((column) => 
                                    renderTableCell(column, {
                                      group,
                                      index,
                                      targetPageUrl,
                                      anchorText,
                                      displaySubmission,
                                      availableForTarget,
                                      showPoolView,
                                      groupId
                                    })
                                  )}
                                </tr>
                                
                                {/* Expandable bulk analysis mini-table */}
                                {editingLineItem?.groupId === groupId && 
                                 editingLineItem?.index === index && 
                                 showPoolView && 
                                 availableForTarget.length > 1 && (
                                  <tr className="bg-white border-l-4 border-indigo-200">
                                    <td colSpan={getColumnCount()} className="px-6 py-4">
                                      <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="mb-3">
                                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                                            Domain Comparison ({availableForTarget.length} options)
                                          </h4>
                                          <p className="text-xs text-gray-600">
                                            Compare all available domains for this link placement
                                          </p>
                                        </div>
                                        
                                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                              <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Domain
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Keywords
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Authority
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Overlap
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Quality
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                  Actions
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {availableForTarget.map((submission, subIndex) => (
                                                <tr key={`${groupId}-${index}-sub-${subIndex}`} className={submission.id === displaySubmission?.id ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                      {submission.id === displaySubmission?.id ? (
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                      ) : (
                                                        <div className="w-4 h-4" />
                                                      )}
                                                      <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                          {submission.domain?.domain}
                                                        </div>
                                                        {submission.id === displaySubmission?.id && (
                                                          <span className="text-xs text-green-600 font-medium">Current selection</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="text-xs">
                                                      {submission.domain?.keywordCount ? (
                                                        <span className="font-medium text-gray-900">{submission.domain.keywordCount} kw</span>
                                                      ) : (
                                                        <span className="text-gray-500">No data</span>
                                                      )}
                                                      {submission.domain?.evidence && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                          {submission.domain.evidence.direct_count > 0 && `${submission.domain.evidence.direct_count} direct`}
                                                          {submission.domain.evidence.direct_count > 0 && submission.domain.evidence.related_count > 0 && ', '}
                                                          {submission.domain.evidence.related_count > 0 && `${submission.domain.evidence.related_count} related`}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="text-xs">
                                                      {submission.domain?.authorityDirect && submission.domain.authorityDirect !== 'n/a' && (
                                                        <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${
                                                          submission.domain.authorityDirect === 'strong' ? 'bg-green-100 text-green-700' :
                                                          submission.domain.authorityDirect === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                          'bg-red-100 text-red-700'
                                                        }`}>
                                                          Direct: {submission.domain.authorityDirect}
                                                        </div>
                                                      )}
                                                      {submission.domain?.authorityRelated && submission.domain.authorityRelated !== 'n/a' && (
                                                        <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                                          submission.domain.authorityRelated === 'strong' ? 'bg-green-100 text-green-700' :
                                                          submission.domain.authorityRelated === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                          'bg-red-100 text-red-700'
                                                        }`}>
                                                          Related: {submission.domain.authorityRelated}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    {submission.domain?.overlapStatus && (
                                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        submission.domain.overlapStatus === 'both' ? 'bg-purple-100 text-purple-700' :
                                                        submission.domain.overlapStatus === 'direct' ? 'bg-green-100 text-green-700' :
                                                        submission.domain.overlapStatus === 'related' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                      }`}>
                                                        <Sparkles className="w-3 h-3 mr-1" />
                                                        {submission.domain.overlapStatus === 'both' ? 'STRONGEST' :
                                                         submission.domain.overlapStatus === 'direct' ? 'VERY STRONG' :
                                                         submission.domain.overlapStatus === 'related' ? 'DECENT' :
                                                         'NO MATCH'}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                      {submission.domain?.qualificationStatus && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                          submission.domain.qualificationStatus === 'high_quality' ? 'bg-green-100 text-green-700' :
                                                          submission.domain.qualificationStatus === 'good_quality' ? 'bg-blue-100 text-blue-700' :
                                                          submission.domain.qualificationStatus === 'marginal_quality' ? 'bg-yellow-100 text-yellow-700' :
                                                          'bg-gray-100 text-gray-600'
                                                        }`}>
                                                          {submission.domain.qualificationStatus === 'high_quality' ? '★★★' :
                                                           submission.domain.qualificationStatus === 'good_quality' ? '★★' :
                                                           submission.domain.qualificationStatus === 'marginal_quality' ? '★' :
                                                           '○'}
                                                        </span>
                                                      )}
                                                      {submission.domain?.hasDataForSeoResults && (
                                                        <span className="text-xs text-indigo-600 flex items-center">
                                                          <Search className="w-3 h-3 mr-1" />
                                                          SEO data
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                      {submission.id !== displaySubmission?.id && (
                                                        <>
                                                          <button 
                                                            className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                                            onClick={async () => {
                                                              if (displaySubmission) {
                                                                await handleAssignTargetPage(displaySubmission.id, '', groupId);
                                                              }
                                                              await handleAssignTargetPage(submission.id, targetPageUrl || '', groupId);
                                                              setEditingLineItem(null);
                                                            }}
                                                          >
                                                            Switch
                                                          </button>
                                                          <button 
                                                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                                                            onClick={async () => {
                                                              // Add as new link - this would need API endpoint to create new line item
                                                              console.log('Add as new link:', submission.id);
                                                              // TODO: Implement add as new link functionality
                                                            }}
                                                          >
                                                            Add as New Link
                                                          </button>
                                                        </>
                                                      )}
                                                      {group.bulkAnalysisProjectId && submission.domainId && (
                                                        <a
                                                          href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${submission.domainId}`}
                                                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                                          title="View detailed analysis"
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                        >
                                                          <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                          
                          {/* Site Pool View - Only show when we have pool paradigm */}
                          {showPoolView && groupSubmissions.length > 0 && (
                            <>
                              <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td colSpan={getColumnCount()} className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setExpandedGroup(isExpanded ? null : groupId)}
                                      className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                                      title={`${unassignedSubmissions.length} unassigned domains available`}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                      <span className="text-xs text-gray-500 font-medium">
                                        {unassignedSubmissions.length} unassigned
                                      </span>
                                    </button>
                                    <Package className="h-4 w-4 text-gray-600" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        Site Pool
                                      </div>
                                      <div className="text-xs text-gray-600 mt-0.5">
                                        Additional suggestions available for selection
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={getColumnCount()} className="px-6 py-4 bg-gray-50">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                      {unassignedSubmissions.map((submission) => (
                                        <div key={submission.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                              <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <div className="text-sm font-medium text-gray-900">
                                                    {submission.domain?.domain || 'Unknown'}
                                                  </div>
                                                  {group.bulkAnalysisProjectId && submission.domainId && (
                                                    <a
                                                      href={`/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}?guided=${submission.domainId}`}
                                                      className="inline-flex items-center px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded transition-colors"
                                                      title="View detailed domain analysis"
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <ExternalLink className="w-3 h-3 mr-0.5" />
                                                      Analysis
                                                    </a>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                                  {submission.domainRating && (
                                                    <span className="font-medium">DR: {submission.domainRating}</span>
                                                  )}
                                                  {submission.traffic && (
                                                    <span>Traffic: {submission.traffic.toLocaleString()}</span>
                                                  )}
                                                  {submission.metadata?.hasDataForSeoResults && (
                                                    <span className="text-indigo-600" title="Has keyword ranking data">
                                                      <Search className="inline h-3 w-3 mr-1" />
                                                      SEO Data
                                                    </span>
                                                  )}
                                                  {submission.metadata?.qualificationStatus && (
                                                    <span className={`font-medium ${
                                                      submission.metadata.qualificationStatus === 'high_quality' ? 'text-green-600' :
                                                      submission.metadata.qualificationStatus === 'good_quality' ? 'text-blue-600' :
                                                      submission.metadata.qualificationStatus === 'marginal_quality' ? 'text-yellow-600' :
                                                      'text-gray-600'
                                                    }`}>
                                                      {submission.metadata.qualificationStatus === 'high_quality' ? '★★★' :
                                                       submission.metadata.qualificationStatus === 'good_quality' ? '★★' :
                                                       submission.metadata.qualificationStatus === 'marginal_quality' ? '★' :
                                                       '○'}
                                                    </span>
                                                  )}
                                                  {submission.metadata?.overlapStatus && (
                                                    <span 
                                                      className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full cursor-help ${
                                                        submission.metadata.overlapStatus === 'direct' ? 'bg-green-100 text-green-700' :
                                                        submission.metadata.overlapStatus === 'related' ? 'bg-blue-100 text-blue-700' :
                                                        submission.metadata.overlapStatus === 'both' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-600'
                                                      }`}
                                                      title={`AI Analysis: ${
                                                        submission.metadata.overlapStatus === 'both' ? 'STRONGEST: Perfect match - site ranks for both core and related keywords' :
                                                        submission.metadata.overlapStatus === 'direct' ? 'VERY STRONG: Direct keyword match - site ranks for your core keywords' :
                                                        submission.metadata.overlapStatus === 'related' ? 'DECENT: Related topic match - site ranks for related keywords' :
                                                        'No keyword overlap detected'
                                                      }${submission.metadata.topicScope ? ` | Content strategy: ${submission.metadata.topicScope.replace('_', ' ')}` : ''}`}
                                                    >
                                                      <Sparkles className="w-3 h-3 mr-0.5" />
                                                      AI
                                                    </span>
                                                  )}
                                                  {submission.price && (
                                                    <span className="font-medium text-gray-900">{formatCurrency(submission.price)}</span>
                                                  )}
                                                </div>
                                                {submission.metadata?.suggestedReason && (
                                                  <div className="text-xs text-gray-500 mt-1 italic">
                                                    {submission.metadata.suggestedReason}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="ml-3">
                                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                                submission.submissionStatus === 'client_approved' ? 'bg-green-100 text-green-800' :
                                                submission.submissionStatus === 'client_rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {submission.submissionStatus === 'client_approved' ? 'Approved' :
                                                 submission.submissionStatus === 'client_rejected' ? 'Rejected' :
                                                 'Pending'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                        </>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={getColumnCount() - 1} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(order.totalPrice)}
                        </td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Additional Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Timeline */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Created</p>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {order.approvedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Confirmed</p>
                          <p className="text-sm text-gray-600">{new Date(order.approvedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    {order.paidAt && (
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Paid</p>
                          <p className="text-sm text-gray-600">{new Date(order.paidAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Internal Activity */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Internal Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {order.state === 'analyzing' && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Site analysis in progress</p>
                          <p className="text-xs text-gray-500">Finding placement opportunities</p>
                        </div>
                      </div>
                    )}
                    {(order.state === 'sites_ready' || order.state === 'site_review') && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Client review active</p>
                          <p className="text-xs text-gray-500">
                            {Object.values(siteSubmissions).reduce((sum, subs) => 
                              sum + subs.filter(s => s.status === 'pending').length, 0
                            )} sites awaiting decision
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notes Section - Full Width */}
              {(order.internalNotes || order.accountNotes) && (
                <div className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-gray-400" />
                      Notes
                    </h3>
                    <div className="space-y-4">
                      {order.internalNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Internal Notes</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">{order.internalNotes}</p>
                        </div>
                      )}
                      {order.accountNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Account Notes</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-blue-50 p-3 rounded">{order.accountNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pricing Details for Internal Users */}
              <div className="mt-6">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
                    Pricing Analysis
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Customer Pricing</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600">Subtotal</dt>
                          <dd className="font-medium">{formatCurrency(order.subtotal || order.totalPrice)}</dd>
                        </div>
                        {order.discountAmount && order.discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Discount ({order.discountPercent || '0'}%)</dt>
                            <dd className="font-medium text-green-600">-{formatCurrency(order.discountAmount)}</dd>
                          </div>
                        )}
                        {order.includesClientReview && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Client Review</dt>
                            <dd className="font-medium">{formatCurrency(order.clientReviewFee || 0)}</dd>
                          </div>
                        )}
                        {order.rushDelivery && (
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-600">Rush Delivery</dt>
                            <dd className="font-medium">{formatCurrency(order.rushFee || 0)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <dt className="font-medium">Total Revenue</dt>
                          <dd className="font-bold">{formatCurrency(order.totalPrice)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Profit Analysis</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600">Wholesale Cost</dt>
                          <dd className="font-medium">{formatCurrency(order.totalWholesale || 0)}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600">Revenue</dt>
                          <dd className="font-medium">{formatCurrency(order.totalPrice)}</dd>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <dt className="font-medium">Gross Profit</dt>
                          <dd className="font-bold text-green-600">{formatCurrency(order.profitMargin || (order.totalPrice - (order.totalWholesale || 0)))}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-600">Margin</dt>
                          <dd className="font-medium">
                            {order.totalWholesale ? 
                              `${Math.round(((order.totalPrice - order.totalWholesale) / order.totalPrice) * 100)}%` : 
                              'N/A'
                            }
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}