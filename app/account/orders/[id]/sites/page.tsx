'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Check, X, ExternalLink, Search, Filter, ChevronDown, ArrowLeft, ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import BulkAnalysisTable from '@/components/BulkAnalysisTable';
import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { AuthService } from '@/lib/auth';
import Link from 'next/link';

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
    niche?: string;
  };
  linkCount: number;
  targetPages: any[];
  requirementOverrides?: {
    minDR?: number;
    minTraffic?: number;
    niches?: string[];
    customGuidelines?: string;
  };
  bulkAnalysisProjectId?: string;
}

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  orderGroups: OrderGroup[];
}

interface OrderSubmission {
  id: string;
  domainId: string;
  domain?: {
    id: string;
    domain: string;
    qualificationStatus: string;
    notes?: string;
  };
  status: string;
  targetPageUrl?: string;
  anchorText?: string;
  specialInstructions?: string;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
  submittedAt?: string;
  completedAt?: string;
  canReview: boolean;
}

export default function SiteSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [suggestedDomains, setSuggestedDomains] = useState<BulkAnalysisDomain[]>([]);
  const [allDomains, setAllDomains] = useState<BulkAnalysisDomain[]>([]);
  const [submissions, setSubmissions] = useState<OrderSubmission[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'approved'>('pending');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [userCapabilities, setUserCapabilities] = useState<any>({});
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [session, setSession] = useState<any>(null);
  
  const selectedGroup = order?.orderGroups?.find(g => g.id === selectedGroupId);
  const requiredLinks = selectedGroup?.linkCount || 0;
  const approvedCount = submissions.filter(s => s.status === 'client_approved').length;
  
  useEffect(() => {
    const loadSession = async () => {
      const userSession = await AuthService.getSession();
      setSession(userSession);
    };
    loadSession();
  }, []);
  
  useEffect(() => {
    fetchOrderAndSites();
  }, [orderId]);
  
  useEffect(() => {
    if (order?.orderGroups.length && !selectedGroupId) {
      setSelectedGroupId(order.orderGroups[0].id);
    }
  }, [order, selectedGroupId]);
  
  useEffect(() => {
    if (selectedGroupId) {
      fetchSitesForGroup();
      fetchSubmissions();
    }
  }, [selectedGroupId]);
  
  const fetchOrderAndSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setMessage('Failed to load order details');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSitesForGroup = async () => {
    if (!selectedGroupId || !selectedGroup) return;
    
    try {
      const response = await fetch(`/api/orders/${orderId}/groups/${selectedGroupId}/site-selections`);
      if (!response.ok) throw new Error('Failed to fetch sites');
      const data = await response.json();
      
      // Convert to BulkAnalysisDomain format
      const convertToBulkDomain = (domain: any): BulkAnalysisDomain => ({
        id: domain.id,
        clientId: selectedGroup.clientId,
        domain: domain.domain,
        qualificationStatus: domain.status,
        targetPageIds: [],
        selectedTargetPageId: undefined,
        keywordCount: 0,
        checkedBy: undefined,
        checkedAt: undefined,
        notes: domain.notes || undefined,
        hasWorkflow: false,
        workflowId: undefined,
        workflowCreatedAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasDataForSeoResults: false,
        wasManuallyQualified: false,
        projectId: domain.projectId || projectId || null
      });
      
      setSuggestedDomains(data.suggested?.map(convertToBulkDomain) || []);
      setAllDomains(data.all?.map(convertToBulkDomain) || []);
      setUserCapabilities(data.userCapabilities || {});
      
      // Extract projectId if available
      if (data.suggested?.length > 0 && data.suggested[0].projectId) {
        setProjectId(data.suggested[0].projectId);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setMessage('Failed to load available sites');
      setMessageType('error');
    }
  };
  
  const fetchSubmissions = async () => {
    if (!selectedGroupId) return;
    
    try {
      const includeCompleted = activeTab === 'all' || activeTab === 'approved';
      const response = await fetch(
        `/api/orders/${orderId}/groups/${selectedGroupId}/submissions?includeCompleted=${includeCompleted}`
      );
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };
  
  const handleApprove = async (domainId: string, details: any) => {
    if (!selectedGroupId) return;
    
    try {
      // Find existing submission or create new
      const submission = submissions.find(s => s.domainId === domainId);
      
      if (submission?.id) {
        // Review existing submission
        const response = await fetch(
          `/api/orders/${orderId}/groups/${selectedGroupId}/submissions/${submission.id}/review`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'approve',
              notes: details.notes || ''
            })
          }
        );
        
        if (!response.ok) throw new Error('Failed to approve submission');
      } else {
        // Create new submission (for internal users)
        const response = await fetch(
          `/api/orders/${orderId}/groups/${selectedGroupId}/site-selections`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              selections: [{
                domainId,
                targetPageUrl: details.targetPageUrl,
                anchorText: details.anchorText,
                specialInstructions: details.specialInstructions,
                status: 'approved'
              }]
            })
          }
        );
        
        if (!response.ok) throw new Error('Failed to create submission');
      }
      
      setMessage('Site approved successfully');
      setMessageType('success');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error approving site:', error);
      setMessage('Failed to approve site');
      setMessageType('error');
    }
  };
  
  const handleReject = async (domainId: string, reason: string) => {
    if (!selectedGroupId) return;
    
    try {
      const submission = submissions.find(s => s.domainId === domainId);
      
      if (submission?.id) {
        const response = await fetch(
          `/api/orders/${orderId}/groups/${selectedGroupId}/submissions/${submission.id}/review`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reject',
              notes: reason
            })
          }
        );
        
        if (!response.ok) throw new Error('Failed to reject submission');
        
        setMessage('Site rejected');
        setMessageType('success');
        await fetchSubmissions();
      }
    } catch (error) {
      console.error('Error rejecting site:', error);
      setMessage('Failed to reject site');
      setMessageType('error');
    }
  };
  
  const handleUpdateStatus = async (domainId: string, status: string) => {
    // This is handled by the approve/reject functions
    console.log('Update status:', domainId, status);
  };
  
  const handleCreateWorkflow = (domain: BulkAnalysisDomain) => {
    // Not applicable for account users
    console.log('Create workflow:', domain);
  };
  
  const handleDeleteDomain = async (domainId: string) => {
    // Not applicable for account users
    console.log('Delete domain:', domainId);
  };
  
  const handleAnalyzeWithDataForSeo = (domain: BulkAnalysisDomain) => {
    // Not applicable for account users
    console.log('Analyze:', domain);
  };
  
  const handleUpdateNotes = async (domainId: string, notes: string) => {
    // Account users can add notes during review
    console.log('Update notes:', domainId, notes);
  };
  
  const handleAddToOrder = (domains: BulkAnalysisDomain[]) => {
    // Not applicable - we're already in order context
    console.log('Add to order:', domains);
  };
  
  const handleToggleSelection = (domainId: string) => {
    const newSelected = new Set(selectedDomains);
    if (newSelected.has(domainId)) {
      newSelected.delete(domainId);
    } else {
      newSelected.add(domainId);
    }
    setSelectedDomains(newSelected);
  };
  
  const handleSelectAll = (domainIds: string[]) => {
    setSelectedDomains(new Set(domainIds));
  };
  
  const handleClearSelection = () => {
    setSelectedDomains(new Set());
  };
  
  // Filter domains based on active tab and submissions
  const getDisplayDomains = () => {
    if (activeTab === 'pending') {
      // Show only domains with pending submissions
      const pendingDomainIds = submissions
        .filter(s => s.status === 'pending' || s.status === 'submitted')
        .map(s => s.domainId);
      return suggestedDomains.filter(d => pendingDomainIds.includes(d.id));
    } else if (activeTab === 'approved') {
      // Show only approved domains
      const approvedDomainIds = submissions
        .filter(s => s.status === 'client_approved')
        .map(s => s.domainId);
      return allDomains.filter(d => approvedDomainIds.includes(d.id));
    } else {
      // Show all suggested domains
      return suggestedDomains;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Order not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/account/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">
                Review Site Recommendations
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {approvedCount} of {requiredLinks} sites approved
              </div>
              {projectId && session?.userType === 'internal' && (
                <Link
                  href={`/clients/${selectedGroup?.clientId}/bulk-analysis/projects/${projectId}?orderId=${orderId}&orderGroupId=${selectedGroupId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View in Bulk Analysis
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Client selector */}
      {order.orderGroups.length > 1 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Client:</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {order.orderGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.client.name} ({group.linkCount} links)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Message display */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Review ({submissions.filter(s => s.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Suggestions ({suggestedDomains.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </nav>
        </div>
      </div>
      
      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {getDisplayDomains().length > 0 ? (
          <BulkAnalysisTable
            domains={getDisplayDomains()}
            targetPages={selectedGroup?.targetPages || []}
            selectedDomains={selectedDomains}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onUpdateStatus={handleUpdateStatus}
            onCreateWorkflow={handleCreateWorkflow}
            onDeleteDomain={handleDeleteDomain}
            onAnalyzeWithDataForSeo={handleAnalyzeWithDataForSeo}
            onUpdateNotes={handleUpdateNotes}
            onAddToOrder={handleAddToOrder}
            selectedPositionRange="1-50"
            loading={false}
            keywordInputMode="target-pages"
            // Account user specific props
            triageMode={false}
            onToggleTriageMode={() => {}}
          />
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {activeTab === 'pending' 
                ? 'No sites pending review' 
                : activeTab === 'approved'
                ? 'No sites approved yet'
                : 'No site recommendations available yet'}
            </p>
            {activeTab === 'pending' && suggestedDomains.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Check the "All Suggestions" tab to see available sites
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Help text */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How to review sites:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click on any domain row to see detailed information</li>
            <li>• Use the approve/reject buttons to make your selections</li>
            <li>• You can add notes or special instructions for each site</li>
            <li>• Navigate to "All Suggestions" to see all recommended sites</li>
          </ul>
        </div>
      </div>
    </div>
  );
}