'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Target,
  Sparkles,
  Database,
  ExternalLink,
  Loader2,
  Package,
  Check,
  PlayCircle,
  KeyRound
} from 'lucide-react';
import ShareVettedSitesRequestButton from '@/components/vetted-sites/ShareVettedSitesRequestButton';
import VettedSitesTaskAssignment from '@/components/vetted-sites/VettedSitesTaskAssignment';

// Following the exact pattern from orders/[id]/internal
interface TargetPageStatus {
  id: string;
  url: string;
  hasKeywords: boolean;
  hasDescription: boolean;
  keywordCount: number;
  clientId: string;
  clientName: string;
  requestId: string;
}

interface RequestDetail {
  id: string;
  accountId: string | null;
  targetUrls: string[];
  filters: any;
  notes?: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'in_progress' | 'fulfilled' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  fulfilledBy?: string;
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Creator info
  createdByUser?: string;
  createdByUserName?: string;
  createdByUserEmail?: string;
  // Track created projects
  projectsCreated?: number;
  bulkAnalysisProjectIds?: string[];
  // Share functionality
  shareToken?: string | null;
  // Linked projects from API
  linkedProjects?: {
    projectId: string;
    addedAt: string;
    clientId: string;
    projectName: string;
  }[];
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  targetUrls: string[];
  projectId?: string;
}

const statusConfig = {
  submitted: { 
    label: 'New Request', 
    color: 'text-blue-700 bg-blue-50',
    icon: Clock,
  },
  reviewing: { 
    label: 'Under Review', 
    color: 'text-yellow-700 bg-yellow-50',
    icon: AlertCircle,
  },
  approved: { 
    label: 'Approved', 
    color: 'text-green-700 bg-green-50',
    icon: CheckCircle,
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'text-orange-700 bg-orange-50',
    icon: PlayCircle,
  },
  fulfilled: { 
    label: 'Fulfilled', 
    color: 'text-gray-700 bg-gray-50',
    icon: CheckCircle,
  },
  rejected: { 
    label: 'Rejected', 
    color: 'text-red-700 bg-red-50',
    icon: XCircle,
  },
  expired: { 
    label: 'Expired', 
    color: 'text-gray-700 bg-gray-100',
    icon: Clock,
  }
};

export default function InternalVettedSitesRequestDetailV3({ 
  requestId 
}: { 
  requestId: string 
}) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Target page states - following order pattern exactly
  const [targetPageStatuses, setTargetPageStatuses] = useState<TargetPageStatus[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<string>('');
  const [confirmingRequest, setConfirmingRequest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  
  // Client groups for project creation
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  
  // Assignment state
  const [assignedUser, setAssignedUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetail();
    }
  }, [requestId]);

  useEffect(() => {
    // Check target page statuses when request is approved
    if (request?.status === 'approved') {
      checkTargetPageStatuses();
    }
  }, [request?.status]);

  useEffect(() => {
    // Fetch assignee details when request is loaded
    if (request?.fulfilledBy) {
      fetchAssigneeDetails(request.fulfilledBy);
    } else {
      setAssignedUser(null);
    }
  }, [request?.fulfilledBy]);

  const fetchRequestDetail = async () => {
    if (!requestId) return;
    
    try {
      const response = await fetch(`/api/vetted-sites/requests/${requestId}`);
      if (!response.ok) throw new Error('Failed to fetch request');
      
      const data = await response.json();
      setRequest(data.request);
      setReviewNotes(data.request.reviewNotes || '');
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssigneeDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data; // Handle both { user } and direct user response
        setAssignedUser({
          id: userData.id,
          name: userData.name,
          email: userData.email
        });
      }
    } catch (error) {
      console.error('Error fetching assignee details:', error);
      setAssignedUser(null);
    }
  };

  // Following the exact pattern from orders/[id]/internal
  const checkTargetPageStatuses = async () => {
    if (!request) return;
    
    const statuses: TargetPageStatus[] = [];
    
    // For each target URL in the request
    for (const targetUrl of request.targetUrls) {
      try {
        // First check if target page exists
        const response = await fetch(`/api/target-pages/by-url?url=${encodeURIComponent(targetUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.targetPage) {
            statuses.push({
              id: data.targetPage.id,
              url: targetUrl,
              hasKeywords: !!(data.targetPage.keywords && data.targetPage.keywords.trim() !== ''),
              hasDescription: !!(data.targetPage.description && data.targetPage.description.trim() !== ''),
              keywordCount: data.targetPage.keywords?.split(',').filter((k: string) => k.trim()).length || 0,
              clientId: data.targetPage.clientId,
              clientName: data.targetPage.client?.name || 'Unknown',
              requestId: requestId!
            });
          } else {
            // Target page doesn't exist yet - need to create it
            // For now, mark as not having keywords/description
            statuses.push({
              id: '', // Will be created when we generate keywords
              url: targetUrl,
              hasKeywords: false,
              hasDescription: false,
              keywordCount: 0,
              clientId: '',
              clientName: 'Not assigned',
              requestId: requestId!
            });
          }
        }
      } catch (error) {
        console.error(`Error checking target page ${targetUrl}:`, error);
      }
    }
    
    setTargetPageStatuses(statuses);
    
    // Pre-select pages that need keywords
    const pagesNeedingKeywords = statuses.filter(p => !p.hasKeywords).map(p => p.id);
    if (pagesNeedingKeywords.length > 0) {
      setSelectedPages(new Set(pagesNeedingKeywords));
    }
    
    // Group by client for project creation
    const groups = statuses.reduce((acc, page) => {
      if (!page.clientId) return acc;
      
      const existing = acc.find(g => g.clientId === page.clientId);
      if (existing) {
        existing.targetUrls.push(page.url);
      } else {
        acc.push({
          clientId: page.clientId,
          clientName: page.clientName,
          targetUrls: [page.url],
          projectId: undefined
        });
      }
      return acc;
    }, [] as ClientGroup[]);
    
    // Map linked projects to client groups
    console.log('🔍 DEBUG: request.linkedProjects:', request?.linkedProjects);
    console.log('🔍 DEBUG: groups before mapping:', groups.map(g => ({ clientId: g.clientId, clientName: g.clientName, projectId: g.projectId })));
    
    if (request?.linkedProjects && request.linkedProjects.length > 0) {
      console.log('🔍 DEBUG: Found linkedProjects, mapping to groups');
      for (const group of groups) {
        // For now, just use the first project for each client
        // TODO: Better matching logic if multiple projects per client
        const linkedProject = request.linkedProjects[0]; // Get first project explicitly
        if (linkedProject && linkedProject.projectId) {
          console.log('🔍 DEBUG: Setting projectId for group:', group.clientId, 'projectId:', linkedProject.projectId);
          group.projectId = linkedProject.projectId;
        }
      }
    } else {
      console.log('🔍 DEBUG: No linkedProjects found in request');
    }
    
    console.log('🔍 DEBUG: groups after mapping:', groups.map(g => ({ clientId: g.clientId, clientName: g.clientName, projectId: g.projectId })));
    
    setClientGroups(groups);
  };

  // Following the exact pattern from generateKeywordsForSelected in orders
  const generateKeywordsForSelected = async () => {
    if (selectedPages.size === 0) {
      setMessage({ type: 'warning', text: 'Please select target pages to generate keywords for' });
      return;
    }
    
    setGeneratingKeywords(true);
    setMessage({ type: 'info', text: `Generating keywords for ${selectedPages.size} target pages...` });
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const pageId of selectedPages) {
      const page = targetPageStatuses.find(p => p.id === pageId);
      if (!page) continue;
      
      setCurrentProcessingPage(page.url);
      
      try {
        // Generate keywords
        const keywordResponse = await fetch(`/api/target-pages/${pageId}/keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUrl: page.url })
        });
        
        if (keywordResponse.ok) {
          // Also generate description
          const descResponse = await fetch(`/api/target-pages/${pageId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (descResponse.ok) {
            successCount++;
          }
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Error generating keywords for ${page.url}:`, error);
        failureCount++;
      }
    }
    
    setGeneratingKeywords(false);
    setCurrentProcessingPage('');
    setSelectedPages(new Set());
    
    setMessage({ 
      type: successCount > 0 ? 'success' : 'error',
      text: `Generated keywords for ${successCount} pages, ${failureCount} failed` 
    });
    
    // Reload target page statuses
    await checkTargetPageStatuses();
  };

  // Following the exact pattern from handleConfirmOrder
  const handleConfirmRequest = async () => {
    if (!request) return;
    
    // Check if all target pages have keywords
    const pagesWithoutKeywords = targetPageStatuses.filter(p => !p.hasKeywords);
    if (pagesWithoutKeywords.length > 0) {
      setMessage({ 
        type: 'warning', 
        text: `${pagesWithoutKeywords.length} target pages still need keywords. Please generate them first.` 
      });
      return;
    }
    
    setConfirmingRequest(true);
    setMessage({ type: 'info', text: 'Creating bulk analysis projects...' });
    
    try {
      const response = await fetch(`/api/vetted-sites/requests/${requestId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPageStatuses,
          clientGroups
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to confirm request');
      }
      
      const data = await response.json();
      
      setMessage({
        type: 'success',
        text: `Request confirmed successfully! Created ${data.projectsCreated} bulk analysis projects.`
      });
      
      // Reload the request to get updated data
      await fetchRequestDetail();
      
      // Also check target page statuses after confirmation
      if (data.projectsCreated > 0) {
        await checkTargetPageStatuses();
      }
    } catch (err) {
      console.error('Error confirming request:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to confirm request'
      });
    } finally {
      setConfirmingRequest(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!requestId) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/vetted-sites/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          reviewNotes: reviewNotes
        })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      await fetchRequestDetail();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Request not found</div>
      </div>
    );
  }

  const statusData = statusConfig[request.status] || statusConfig.submitted;
  const StatusIcon = statusData.icon;
  const allPagesHaveKeywords = targetPageStatuses.every(p => p.hasKeywords);
  const somePagesSelected = selectedPages.size > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Request Detail</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusData.color} self-start sm:self-auto`}>
                <StatusIcon className="h-4 w-4 mr-1.5" />
                {statusData.label}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {request.status === 'submitted' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('reviewing')}
                    disabled={updating}
                    className="px-4 py-2 min-h-[44px] bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 active:bg-yellow-300 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updating}
                    className="px-4 py-2 min-h-[44px] bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    Approve
                  </button>
                </>
              )}
              
              {request.status === 'reviewing' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updating}
                    className="px-4 py-2 min-h-[44px] bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updating}
                    className="px-4 py-2 min-h-[44px] bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-300 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    Reject
                  </button>
                </>
              )}
              
              {request.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('fulfilled')}
                    disabled={updating}
                    className="px-4 py-2 min-h-[44px] bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    Mark as Fulfilled
                  </button>
                  <ShareVettedSitesRequestButton 
                    requestId={request.id}
                    currentShareToken={request.shareToken}
                  />
                </>
              )}
              
              {request.status === 'fulfilled' && (
                <ShareVettedSitesRequestButton 
                  requestId={request.id}
                  currentShareToken={request.shareToken}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4`}>
          <div className={`rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Target URLs Section - Following order pattern */}
            {request.status === 'approved' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Target className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-medium text-gray-900">Target URLs</h2>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded">
                      {targetPageStatuses.filter(p => p.hasKeywords).length}/{targetPageStatuses.length} Ready
                    </span>
                  </div>
                  
                  {targetPageStatuses.some(p => !p.hasKeywords) && (
                    <button
                      onClick={generateKeywordsForSelected}
                      disabled={generatingKeywords || !somePagesSelected}
                      className="px-3 py-2 min-h-[44px] bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation w-full sm:w-auto justify-center"
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
                
                <div className="space-y-2">
                  {targetPageStatuses.map((page) => (
                    <div key={page.url} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
                      <div className="flex items-start sm:items-center space-x-3">
                        {!page.hasKeywords && (
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
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.url}</div>
                          <div className="text-xs text-gray-500">{page.clientName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {page.hasKeywords ? (
                          <span className="inline-flex items-center text-xs text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {page.keywordCount} keywords
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-yellow-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs keywords
                          </span>
                        )}
                        {page.hasDescription ? (
                          <span className="inline-flex items-center text-xs text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Has description
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-yellow-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs description
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Confirm Request Button - Following order pattern */}
                {allPagesHaveKeywords && !request.projectsCreated && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleConfirmRequest}
                      disabled={confirmingRequest}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {confirmingRequest ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Projects...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4" />
                          Confirm Request & Create Projects
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Analysis Projects - Following order pattern */}
            {(request.status === 'approved' || request.status === 'in_progress' || request.status === 'fulfilled') && request.linkedProjects && request.linkedProjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">Bulk Analysis Projects</h2>
                  <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs sm:text-sm rounded">
                    {request.linkedProjects.length} Created
                  </span>
                </div>
                
                <div className="space-y-3">
                  {request.linkedProjects.map((project, index) => (
                    <div key={project.projectId} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900 text-sm sm:text-base">{project.projectName || `Bulk Analysis Project ${index + 1}`}</div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">
                            Created {new Date(project.addedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Link
                          href={`/clients/${project.clientId}/bulk-analysis/projects/${project.projectId}`}
                          className="inline-flex items-center justify-center px-3 py-2 min-h-[40px] bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 active:bg-indigo-300 transition-colors text-xs sm:text-sm touch-manipulation w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Project
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Original Target URLs Display (for non-approved requests) */}
            {request.status !== 'approved' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">Target URLs</h2>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded">
                    {request.targetUrls?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {request.targetUrls?.map((url, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{url}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new URL(url).hostname.replace('www.', '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Notes</h2>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}

            {/* Review Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Internal Review Notes</h2>
              </div>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add internal notes about this request..."
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={4}
              />
              {reviewNotes !== (request.reviewNotes || '') && (
                <button
                  onClick={() => handleStatusUpdate(request.status)}
                  disabled={updating}
                  className="mt-3 px-4 py-2 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 touch-manipulation w-full sm:w-auto"
                >
                  Save Notes
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Request Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Request Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">Request ID</div>
                  <div className="text-sm font-mono text-gray-700">{request.id.substring(0, 8)}</div>
                </div>
                {request.createdByUserName && (
                  <div>
                    <div className="text-xs text-gray-500">Submitted By</div>
                    <div className="text-sm text-gray-700">{request.createdByUserName}</div>
                    <div className="text-xs text-gray-500">{request.createdByUserEmail}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Created</div>
                  <div className="text-sm text-gray-700">{formatDate(request.createdAt)}</div>
                </div>
                {request.reviewedAt && (
                  <div>
                    <div className="text-xs text-gray-500">Reviewed</div>
                    <div className="text-sm text-gray-700">{formatDate(request.reviewedAt)}</div>
                  </div>
                )}
                {request.approvedAt && (
                  <div>
                    <div className="text-xs text-gray-500">Approved</div>
                    <div className="text-sm text-gray-700">{formatDate(request.approvedAt)}</div>
                  </div>
                )}
                {request.fulfilledAt && (
                  <div>
                    <div className="text-xs text-gray-500">Fulfilled</div>
                    <div className="text-sm text-gray-700">{formatDate(request.fulfilledAt)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Assignment */}
            <VettedSitesTaskAssignment
              requestId={requestId}
              currentAssignee={assignedUser}
              onAssignmentChange={(assignee) => {
                setAssignedUser(assignee);
                // Update the request's fulfilledBy field locally to prevent flashing
                if (assignee) {
                  setRequest(prev => prev ? { ...prev, fulfilledBy: assignee.id } : prev);
                } else {
                  setRequest(prev => prev ? { ...prev, fulfilledBy: null } : prev);
                }
                // Refresh request to get updated fulfillment data after a delay
                setTimeout(() => fetchRequestDetail(), 1000);
              }}
            />

            {/* Project Creation Checklist (for approved requests) */}
            {request.status === 'approved' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Project Creation Checklist</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full mr-2 flex items-center justify-center ${
                      targetPageStatuses.length > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {targetPageStatuses.length > 0 && <Check className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className="text-sm text-gray-700">Target pages identified</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full mr-2 flex items-center justify-center ${
                      allPagesHaveKeywords ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {allPagesHaveKeywords && <Check className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className="text-sm text-gray-700">All pages have keywords</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full mr-2 flex items-center justify-center ${
                      request.projectsCreated ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {request.projectsCreated && <Check className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className="text-sm text-gray-700">Projects created</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}