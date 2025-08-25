'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Globe
} from 'lucide-react';

interface VettedSitesRequest {
  id: string;
  target_urls: string[];
  filters: any;
  notes: string;
  status: 'submitted' | 'approved' | 'in_progress' | 'fulfilled' | 'rejected';
  created_at: string;
  updated_at: string;
  account_name?: string;
  account_email?: string;
  results_count?: number;
  public_token?: string;
}

interface VettedSitesRequestsListProps {
  userType: 'internal' | 'account';
  searchParams: URLSearchParams;
}

const STATUS_COLORS = {
  'submitted': 'bg-blue-100 text-blue-800 border-blue-200',
  'approved': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in_progress': 'bg-orange-100 text-orange-800 border-orange-200',
  'fulfilled': 'bg-green-100 text-green-800 border-green-200',
  'rejected': 'bg-red-100 text-red-800 border-red-200',
  'expired': 'bg-gray-100 text-gray-800 border-gray-200'
};

const STATUS_ICONS = {
  'submitted': Clock,
  'approved': CheckCircle,
  'in_progress': Clock,
  'fulfilled': CheckCircle,
  'rejected': AlertCircle,
  'expired': AlertCircle
};

export default function VettedSitesRequestsList({
  userType,
  searchParams
}: VettedSitesRequestsListProps) {
  const [requests, setRequests] = useState<VettedSitesRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      const response = await fetch(`/api/vetted-sites/requests?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setTotalPages(Math.ceil((data.total || 0) / 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, searchQuery, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRequests();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFilters = (filters: any) => {
    const parts = [];
    if (filters.price_min || filters.price_max) {
      const min = filters.price_min ? `$${(filters.price_min / 100).toFixed(0)}` : '$0';
      const max = filters.price_max !== 999999 ? `$${(filters.price_max / 100).toFixed(0)}` : '∞';
      parts.push(`${min}-${max}`);
    }
    if (filters.dr_min && filters.dr_min > 0) {
      parts.push(`DR ${filters.dr_min}+`);
    }
    if (filters.traffic_min && filters.traffic_min > 0) {
      const traffic = filters.traffic_min >= 1000 ? `${filters.traffic_min / 1000}K` : filters.traffic_min;
      parts.push(`${traffic}+ traffic`);
    }
    if (filters.niches && filters.niches.length > 0) {
      parts.push(`${filters.niches.length} niches`);
    }
    return parts.join(' • ');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Requests</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchRequests}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by URL, notes, or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter 
                ? 'Try adjusting your search or filters'
                : 'No vetted sites requests have been created yet'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => {
              const StatusIcon = STATUS_ICONS[request.status] || Clock; // Default to Clock if status not found
              
              return (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('_', ' ')}
                        </span>
                        
                        {userType === 'internal' && request.account_name && (
                          <span className="inline-flex items-center text-xs text-gray-600">
                            <User className="h-3 w-3 mr-1" />
                            {request.account_name}
                          </span>
                        )}
                        
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(request.created_at)}
                        </span>
                      </div>

                      {/* Target URLs */}
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Target URLs:</h4>
                        <div className="space-y-1">
                          {request.target_urls.slice(0, 3).map((url, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <ExternalLink className="h-3 w-3 mr-2 text-gray-400" />
                              <span className="truncate">{url}</span>
                            </div>
                          ))}
                          {request.target_urls.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{request.target_urls.length - 3} more URLs
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Filters */}
                      {request.filters && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Filters: </span>
                          <span className="text-sm text-gray-600">{formatFilters(request.filters)}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {request.notes && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Notes: </span>
                          <span className="text-sm text-gray-600">{request.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex items-center gap-2">
                      {request.status === 'fulfilled' && request.results_count && (
                        <span className="text-sm text-green-600 font-medium">
                          {request.results_count} sites found
                        </span>
                      )}
                      
                      <button
                        onClick={() => window.open(`/vetted-sites/requests/${request.id}`, '_blank')}
                        className="inline-flex items-center px-3 py-1 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}