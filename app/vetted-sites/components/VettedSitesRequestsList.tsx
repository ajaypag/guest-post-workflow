'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Calendar,
  ExternalLink,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface VettedSitesRequest {
  id: string;
  targetUrls: string[];
  filters?: {
    minDa?: number;
    maxCost?: number;
    topics?: string[];
    keywords?: string[];
  };
  notes?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'fulfilled' | 'rejected' | 'expired';
  domainCount: number;
  qualifiedDomainCount: number;
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
  // Sales request fields (for internal users)
  isSalesRequest?: boolean;
  prospectName?: string;
  prospectEmail?: string;
  prospectCompany?: string;
  reviewedAt?: string;
  approvedAt?: string;
}

interface VettedSitesRequestsListProps {
  userType: 'internal' | 'account';
  onRequestClick?: (request: VettedSitesRequest) => void;
  refreshTrigger?: number;
}

export default function VettedSitesRequestsList({ 
  userType, 
  onRequestClick,
  refreshTrigger = 0
}: VettedSitesRequestsListProps) {
  const [requests, setRequests] = useState<VettedSitesRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/vetted-sites/requests', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load requests on mount and when refresh trigger changes
  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'submitted':
        return { 
          label: 'Submitted', 
          variant: 'secondary' as const, 
          icon: Clock,
          description: 'Waiting for review'
        };
      case 'under_review':
        return { 
          label: 'Under Review', 
          variant: 'default' as const, 
          icon: Search,
          description: 'Being analyzed by our team'
        };
      case 'approved':
        return { 
          label: 'Approved', 
          variant: 'outline' as const, 
          icon: CheckCircle,
          description: 'Analysis starting soon'
        };
      case 'fulfilled':
        return { 
          label: 'Complete', 
          variant: 'default' as const, 
          icon: CheckCircle,
          description: 'Results are ready'
        };
      case 'rejected':
        return { 
          label: 'Rejected', 
          variant: 'destructive' as const, 
          icon: XCircle,
          description: 'Request could not be processed'
        };
      case 'expired':
        return { 
          label: 'Expired', 
          variant: 'secondary' as const, 
          icon: AlertCircle,
          description: 'Request has expired'
        };
      default:
        return { 
          label: status, 
          variant: 'secondary' as const, 
          icon: Clock,
          description: ''
        };
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      request.targetUrls.some(url => url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.notes && request.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.prospectName && request.prospectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.prospectCompany && request.prospectCompany.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading your requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Vetted Sites Requests</h2>
          <p className="text-sm text-gray-600">
            Track your analysis requests and view results
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="fulfilled">Complete</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {filteredRequests.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {requests.length === 0 ? 'No requests yet' : 'No matching requests'}
            </h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? 'Submit your first vetted sites request to get started'
                : 'Try adjusting your filters to see more results'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Requests list */}
      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const statusInfo = getStatusInfo(request.status);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={request.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {userType === 'internal' && request.isSalesRequest ? (
                        <span className="text-blue-600">
                          Sales Request: {request.prospectName}
                        </span>
                      ) : (
                        `Analysis Request`
                      )}
                    </CardTitle>
                    <CardDescription>
                      Created {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      {request.fulfilledAt && (
                        <span> • Completed {format(new Date(request.fulfilledAt), 'MMM d, yyyy')}</span>
                      )}
                    </CardDescription>
                  </div>
                  
                  <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Target URLs */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Target URLs</h4>
                  <div className="space-y-1">
                    {request.targetUrls.slice(0, 2).map((url, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <ExternalLink className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </div>
                    ))}
                    {request.targetUrls.length > 2 && (
                      <span className="text-sm text-gray-500">
                        +{request.targetUrls.length - 2} more URL{request.targetUrls.length > 3 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filters summary */}
                {request.filters && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Filters</h4>
                    <div className="flex flex-wrap gap-2">
                      {request.filters.minDa && (
                        <Badge variant="outline" className="text-xs">
                          Min DA: {request.filters.minDa}
                        </Badge>
                      )}
                      {request.filters.maxCost && (
                        <Badge variant="outline" className="text-xs">
                          Max Cost: ${request.filters.maxCost}
                        </Badge>
                      )}
                      {request.filters.topics && request.filters.topics.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {request.filters.topics.length} topic{request.filters.topics.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {request.filters.keywords && request.filters.keywords.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {request.filters.keywords.length} keyword{request.filters.keywords.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Results summary */}
                {request.status === 'fulfilled' && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-1">Results Ready</h4>
                    <p className="text-sm text-green-700">
                      {request.qualifiedDomainCount} qualified domains found
                      {request.domainCount > 0 && ` out of ${request.domainCount} total`}
                    </p>
                  </div>
                )}

                {/* Sales request info */}
                {userType === 'internal' && request.isSalesRequest && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Prospect Information</h4>
                    <div className="text-sm text-blue-700">
                      <div>{request.prospectEmail}</div>
                      {request.prospectCompany && <div>{request.prospectCompany}</div>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {request.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {onRequestClick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRequestClick(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  )}
                  
                  {request.status === 'fulfilled' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        // Navigate to vetted sites with request filter
                        window.location.href = `/vetted-sites?request=${request.id}`;
                      }}
                    >
                      View Results
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}