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
  Target
} from 'lucide-react';

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
  linkedProjects?: any[];
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

export default function InternalVettedSitesRequestDetailClient({ 
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

  useEffect(() => {
    params.then(p => setRequestId(p.id));
  }, [params]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetail();
    }
  }, [requestId]);

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
            
            {/* Quick Actions */}
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
                  <Link
                    href={`/bulk-analysis/new?vettedRequestId=${request.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-block"
                  >
                    Generate Recommendations
                  </Link>
                  <button
                    onClick={() => handleStatusUpdate('fulfilled')}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Mark Fulfilled
                  </button>
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
            {/* Target URLs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <Target className="h-5 w-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Target URLs</h2>
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">
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

            {/* Results Summary (if fulfilled) */}
            {request.status === 'fulfilled' && (request.actualDomainCount || request.linkedProjects?.length) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Results Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Domains</span>
                    <span className="text-sm font-medium text-gray-900">{request.actualDomainCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Qualified</span>
                    <span className="text-sm font-medium text-green-600">{request.actualQualifiedCount || 0}</span>
                  </div>
                  {request.linkedProjects && request.linkedProjects.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-2">Linked Projects</div>
                      {request.linkedProjects.map((project: any) => (
                        <div key={project.id} className="text-sm text-gray-700 mb-1">
                          {project.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}