'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search, Filter, Eye, CheckCircle, XCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';
import VettedSitesTaskAssignment from '@/components/vetted-sites/VettedSitesTaskAssignment';

interface VettedSitesRequest {
  id: string;
  account_id: string | null;
  account_name?: string;
  account_email?: string;
  target_urls: string[];
  filters: any;
  notes?: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'fulfilled' | 'in_progress' | 'expired';
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  submitted: { 
    label: 'New', 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
    bgGradient: 'from-blue-50 to-blue-100'
  },
  reviewing: { 
    label: 'In Review', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: AlertCircle,
    bgGradient: 'from-yellow-50 to-yellow-100'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
    bgGradient: 'from-green-50 to-green-100'
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    bgGradient: 'from-red-50 to-red-100'
  },
  fulfilled: { 
    label: 'Fulfilled', 
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: CheckCircle,
    bgGradient: 'from-gray-50 to-gray-100'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: PlayCircle,
    bgGradient: 'from-orange-50 to-orange-100'
  },
  expired: { 
    label: 'Expired', 
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Clock,
    bgGradient: 'from-gray-50 to-gray-100'
  }
};

export default function InternalVettedSitesRequestsClient() {
  const router = useRouter();
  const [requests, setRequests] = useState<VettedSitesRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
    fulfilled: 0,
    in_progress: 0,
    expired: 0
  });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, searchQuery]);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/vetted-sites/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      setRequests(data.requests || []);
      
      // Calculate stats
      const newStats = {
        total: data.requests?.length || 0,
        submitted: 0,
        reviewing: 0,
        approved: 0,
        rejected: 0,
        fulfilled: 0,
        in_progress: 0,
        expired: 0
      };
      
      data.requests?.forEach((req: VettedSitesRequest) => {
        newStats[req.status]++;
      });
      
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/vetted-sites/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      // Refresh the list
      await fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/internal/websites"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Link>
              <h1 className="text-lg font-medium text-gray-900">Vetted Sites Requests</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-lg border transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                : 'bg-white border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </button>
          
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === status
                  ? `bg-gradient-to-br ${config.bgGradient} border-${config.color.split('-')[1]}-300 shadow-sm`
                  : 'bg-white border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl font-semibold text-gray-900">
                {stats[status as keyof typeof stats]}
              </div>
              <div className="text-sm text-gray-600">{config.label}</div>
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by account, email, or target URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Filter className="h-5 w-5 mr-2 text-gray-600" />
              Filters
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {requests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-500">No requests found</div>
              </div>
            ) : (
              requests.map((request) => {
                const statusData = statusConfig[request.status] || statusConfig.submitted;
                const StatusIcon = statusData.icon;
                return (
                  <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Account Info */}
                        <div className="flex items-center space-x-4 mb-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {request.account_name || 'Internal Request'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.account_email || 'N/A'}
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusData.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusData.label}
                          </span>
                        </div>

                        {/* Target URLs Preview */}
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-1">Target URLs ({request.target_urls?.length || 0})</div>
                          <div className="flex flex-wrap gap-2">
                            {request.target_urls?.slice(0, 3).map((url, idx) => (
                              <span key={idx} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {new URL(url).hostname.replace('www.', '')}
                              </span>
                            ))}
                            {request.target_urls?.length > 3 && (
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                +{request.target_urls.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Filters Summary */}
                        {request.filters && Object.keys(request.filters).length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm text-gray-600">
                              Preferences: 
                              {request.filters.minDa && ` DR ${request.filters.minDa}+`}
                              {request.filters.maxCost && ` • Max $${request.filters.maxCost}`}
                              {request.filters.topics?.length > 0 && ` • ${request.filters.topics.length} topics`}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {request.notes && (
                          <div className="text-sm text-gray-600 italic mb-3">
                            "{request.notes.substring(0, 100)}{request.notes.length > 100 && '...'}"
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                          <span>Created {formatDate(request.created_at)}</span>
                          <span>•</span>
                          <span>ID: {request.id.substring(0, 8)}</span>
                        </div>

                        {/* Task Assignment */}
                        <VettedSitesTaskAssignment
                          requestId={request.id}
                          currentAssignee={null} // TODO: Add assignee data to interface
                          onAssignmentChange={() => fetchRequests()} // Refresh list on assignment change
                          compact={true}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ml-0 sm:ml-4">
                        <Link
                          href={`/internal/vetted-sites/requests/${request.id}`}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        
                        {/* Quick Status Actions */}
                        {request.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'reviewing')}
                              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                            >
                              Start Review
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'approved')}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              Approve
                            </button>
                          </>
                        )}
                        
                        {request.status === 'reviewing' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'approved')}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'rejected')}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {request.status === 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'fulfilled')}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Mark Fulfilled
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}