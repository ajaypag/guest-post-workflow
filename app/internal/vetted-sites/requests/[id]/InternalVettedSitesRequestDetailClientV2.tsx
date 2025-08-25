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
  Globe,
  Filter as FilterIcon,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Hash,
  Target,
  Sparkles,
  Database,
  ExternalLink,
  KeyRound,
  Loader2,
  Package,
  Check
} from 'lucide-react';

interface TargetPageInfo {
  id: string;
  url: string;
  clientId: string;
  clientName: string;
  hasKeywords: boolean;
  hasDescription: boolean;
  keywordCount?: number;
}

interface BulkAnalysisProject {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  domainCount: number;
  qualifiedCount: number;
  createdAt: string;
}

interface RequestDetail {
  id: string;
  accountId: string | null;
  targetUrls: string[];
  filters: any;
  notes?: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'fulfilled';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  fulfilledBy?: string;
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedClients?: any[];
  linkedProjects?: BulkAnalysisProject[];
  actualDomainCount?: number;
  actualQualifiedCount?: number;
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
  rejected: { 
    label: 'Rejected', 
    color: 'text-red-700 bg-red-50',
    icon: XCircle,
  },
  fulfilled: { 
    label: 'Fulfilled', 
    color: 'text-gray-700 bg-gray-50',
    icon: CheckCircle,
  }
};

export default function InternalVettedSitesRequestDetailClientV2({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Target page states
  const [targetPageInfo, setTargetPageInfo] = useState<TargetPageInfo[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<Set<string>>(new Set());
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [creatingProjects, setCreatingProjects] = useState(false);
  
  // Projects created from this request
  const [createdProjects, setCreatedProjects] = useState<BulkAnalysisProject[]>([]);

  useEffect(() => {
    params.then(p => setRequestId(p.id));
  }, [params]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetail();
    }
  }, [requestId]);

  useEffect(() => {
    if (request?.status === 'approved' && request.targetUrls?.length > 0) {
      checkTargetPageStatuses();
    }
  }, [request?.status, request?.targetUrls]);

  const fetchRequestDetail = async () => {
    if (!requestId) return;
    
    try {
      const response = await fetch(`/api/vetted-sites/requests/${requestId}`);
      if (!response.ok) throw new Error('Failed to fetch request');
      
      const data = await response.json();
      setRequest(data.request);
      setReviewNotes(data.request.reviewNotes || '');
      
      // If there are linked projects, set them
      if (data.request.linkedProjects?.length > 0) {
        setCreatedProjects(data.request.linkedProjects);
      }
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTargetPageStatuses = async () => {
    if (!request) return;
    
    const pageInfo: TargetPageInfo[] = [];
    
    // For each target URL, we need to:
    // 1. Find or create the target page in the database
    // 2. Check if it has keywords and description
    // 3. Determine which client it belongs to
    
    for (const targetUrl of request.targetUrls) {
      try {
        // First, check if this target page exists
        const response = await fetch(`/api/target-pages/by-url?url=${encodeURIComponent(targetUrl)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.targetPage) {
            pageInfo.push({
              id: data.targetPage.id,
              url: targetUrl,
              clientId: data.targetPage.clientId,
              clientName: data.targetPage.client?.name || 'Unknown',
              hasKeywords: !!(data.targetPage.keywords && data.targetPage.keywords.trim() !== ''),
              hasDescription: !!(data.targetPage.description && data.targetPage.description.trim() !== ''),
              keywordCount: data.targetPage.keywords?.split(',').filter((k: string) => k.trim()).length || 0
            });
          } else {
            // Target page doesn't exist yet - we'll need to create it
            pageInfo.push({
              id: '',
              url: targetUrl,
              clientId: '',
              clientName: 'Not assigned',
              hasKeywords: false,
              hasDescription: false,
              keywordCount: 0
            });
          }
        }
      } catch (error) {
        console.error(`Error checking target page ${targetUrl}:`, error);
      }
    }
    
    setTargetPageInfo(pageInfo);
  };

  const handleGenerateKeywords = async () => {
    const pagesToGenerate = selectedTargetPages.size > 0 
      ? targetPageInfo.filter(p => selectedTargetPages.has(p.id))
      : targetPageInfo.filter(p => !p.hasKeywords);
    
    if (pagesToGenerate.length === 0) {
      alert('All selected pages already have keywords');
      return;
    }
    
    setGeneratingKeywords(true);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const page of pagesToGenerate) {
      try {
        // Generate keywords for this target page
        const response = await fetch(`/api/target-pages/${page.id}/generate-keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Error generating keywords for ${page.url}:`, error);
        failureCount++;
      }
    }
    
    setGeneratingKeywords(false);
    
    // Refresh target page statuses
    await checkTargetPageStatuses();
    
    alert(`Generated keywords for ${successCount} pages, ${failureCount} failed`);
  };

  const handleCreateProjects = async () => {
    if (!request) return;
    
    // Check if all target pages have keywords
    const pagesWithoutKeywords = targetPageInfo.filter(p => !p.hasKeywords);
    if (pagesWithoutKeywords.length > 0) {
      alert(`${pagesWithoutKeywords.length} target pages still need keywords. Please generate them first.`);
      return;
    }
    
    setCreatingProjects(true);
    
    try {
      // Create bulk analysis projects based on the request
      const response = await fetch(`/api/vetted-sites/requests/${requestId}/create-projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPageInfo,
          filters: request.filters
        })
      });
      
      if (!response.ok) throw new Error('Failed to create projects');
      
      const data = await response.json();
      
      // Update request status to fulfilled
      await handleStatusUpdate('fulfilled');
      
      // Refresh to show created projects
      await fetchRequestDetail();
      
      alert(`Successfully created ${data.projectsCreated} bulk analysis projects!`);
    } catch (error) {
      console.error('Error creating projects:', error);
      alert('Failed to create projects');
    } finally {
      setCreatingProjects(false);
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

  const StatusIcon = statusConfig[request.status].icon;
  const allPagesHaveKeywords = targetPageInfo.every(p => p.hasKeywords);
  const somePagesNeedKeywords = targetPageInfo.some(p => !p.hasKeywords);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/internal/vetted-sites/requests"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back to Requests
              </Link>
              <h1 className="text-lg font-medium text-gray-900">Request Detail</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[request.status].color}`}>
                <StatusIcon className="h-4 w-4 mr-1.5" />
                {statusConfig[request.status].label}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {request.status === 'submitted' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('reviewing')}
                    disabled={updating}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updating}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
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
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updating}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              
              {request.status === 'approved' && (
                <>
                  {somePagesNeedKeywords && (
                    <button
                      onClick={handleGenerateKeywords}
                      disabled={generatingKeywords}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {generatingKeywords ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Keywords
                        </>
                      )}
                    </button>
                  )}
                  
                  {allPagesHaveKeywords && (
                    <button
                      onClick={handleCreateProjects}
                      disabled={creatingProjects || createdProjects.length > 0}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingProjects ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Projects...
                        </>
                      ) : createdProjects.length > 0 ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Projects Created
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          Create Projects
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Target URLs with Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Target className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Target URLs</h2>
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">
                    {request.targetUrls?.length || 0}
                  </span>
                </div>
                
                {request.status === 'approved' && targetPageInfo.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {targetPageInfo.filter(p => p.hasKeywords).length}/{targetPageInfo.length} have keywords
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {request.targetUrls?.map((url, idx) => {
                  const pageInfo = targetPageInfo.find(p => p.url === url);
                  
                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{url}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new URL(url).hostname.replace('www.', '')}
                          </div>
                          {pageInfo && (
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-600">
                                Client: {pageInfo.clientName}
                              </span>
                              <div className="flex items-center gap-2">
                                {pageInfo.hasKeywords ? (
                                  <span className="inline-flex items-center text-xs text-green-700">
                                    <Check className="h-3 w-3 mr-1" />
                                    {pageInfo.keywordCount} keywords
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs text-yellow-700">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Needs keywords
                                  </span>
                                )}
                                {pageInfo.hasDescription ? (
                                  <span className="inline-flex items-center text-xs text-green-700">
                                    <Check className="h-3 w-3 mr-1" />
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
                          )}
                        </div>
                        
                        {request.status === 'approved' && pageInfo && !pageInfo.hasKeywords && (
                          <input
                            type="checkbox"
                            checked={selectedTargetPages.has(pageInfo.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedTargetPages);
                              if (e.target.checked) {
                                newSelected.add(pageInfo.id);
                              } else {
                                newSelected.delete(pageInfo.id);
                              }
                              setSelectedTargetPages(newSelected);
                            }}
                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Created Projects */}
            {createdProjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center mb-4">
                  <Package className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Created Projects</h2>
                </div>
                <div className="space-y-3">
                  {createdProjects.map((project) => (
                    <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {project.clientName} • {project.domainCount} domains • {project.qualifiedCount} qualified
                          </div>
                        </div>
                        <Link
                          href={`/clients/${project.clientId}/bulk-analysis/projects/${project.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
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

            {/* Website Preferences */}
            {request.filters && Object.keys(request.filters).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center mb-4">
                  <FilterIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Website Preferences</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {request.filters.minDa && (
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Min DR: {request.filters.minDa}</span>
                    </div>
                  )}
                  {request.filters.maxCost && (
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Max Cost: ${request.filters.maxCost}</span>
                    </div>
                  )}
                  {request.filters.topics?.length > 0 && (
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600 mb-2">Topics:</div>
                      <div className="flex flex-wrap gap-2">
                        {request.filters.topics.map((topic: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Save Notes
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Request Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Request Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">Request ID</div>
                  <div className="text-sm font-mono text-gray-700">{request.id.substring(0, 8)}</div>
                </div>
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

            {/* Progress Checklist (for approved requests) */}
            {request.status === 'approved' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Project Creation Checklist</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full mr-2 flex items-center justify-center ${
                      targetPageInfo.length > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {targetPageInfo.length > 0 && <Check className="h-3 w-3 text-green-600" />}
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
                      createdProjects.length > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {createdProjects.length > 0 && <Check className="h-3 w-3 text-green-600" />}
                    </div>
                    <span className="text-sm text-gray-700">Projects created</span>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary (if fulfilled) */}
            {request.status === 'fulfilled' && createdProjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Results Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Projects Created</span>
                    <span className="text-sm font-medium text-gray-900">{createdProjects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Domains</span>
                    <span className="text-sm font-medium text-gray-900">
                      {createdProjects.reduce((sum, p) => sum + p.domainCount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Qualified Domains</span>
                    <span className="text-sm font-medium text-green-600">
                      {createdProjects.reduce((sum, p) => sum + p.qualifiedCount, 0)}
                    </span>
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