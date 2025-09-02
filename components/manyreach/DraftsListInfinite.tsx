'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Loader2, 
  ChevronDown,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Draft {
  id: string;
  email_from: string;
  email_subject: string;
  campaign_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  parsed_data: any;
  edited_data?: any;
  email_log_id?: string;
  raw_content?: string;
  html_content?: string;
}

interface DraftsListInfiniteProps {
  onDraftSelect?: (draft: Draft) => void;
  onDraftUpdate?: () => void;
}

export function DraftsListInfinite({ onDraftSelect, onDraftUpdate }: DraftsListInfiniteProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();
  
  const LIMIT = 100;

  const fetchDrafts = useCallback(async (reset = false) => {
    if (!reset && !hasMore) return;
    
    const isLoadingMore = !reset && drafts.length > 0;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: currentOffset.toString(),
        ...(search && { search })
      });
      
      const response = await fetch(`/api/admin/manyreach/drafts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch drafts');
      
      const data = await response.json();
      
      if (reset) {
        setDrafts(data.drafts || []);
        setOffset(LIMIT);
      } else {
        setDrafts(prev => [...prev, ...(data.drafts || [])]);
        setOffset(prev => prev + LIMIT);
      }
      
      setTotal(data.total || 0);
      setHasMore((data.drafts?.length || 0) === LIMIT);
      
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [drafts.length, hasMore, offset, search]);

  // Initial load
  useEffect(() => {
    fetchDrafts(true);
  }, [search]);

  // Search debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 500);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchInput]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchDrafts(false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchDrafts, hasMore, loadingMore, loading]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleRefresh = () => {
    setOffset(0);
    fetchDrafts(true);
    if (onDraftUpdate) onDraftUpdate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publisher Drafts
            {total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {total} total
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by email, subject, or campaign..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-gray-600">
            Showing {drafts.length} of {total}
          </span>
          {search && (
            <span className="text-blue-600">
              Filtering: "{search}"
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && drafts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading drafts...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {search ? `No drafts found matching "${search}"` : 'No drafts found'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-350px)] min-h-[600px] overflow-y-auto">
            {drafts.map((draft) => {
              // Parse JSON data if needed
              const parsedData = typeof draft.parsed_data === 'string' 
                ? JSON.parse(draft.parsed_data) 
                : draft.parsed_data;
              const editedData = draft.edited_data && typeof draft.edited_data === 'string'
                ? JSON.parse(draft.edited_data)
                : draft.edited_data;
              
              const data = editedData || parsedData || {};
              const hasOffer = data.hasOffer;
              const companyName = data.publisher?.companyName;
              const contactName = data.publisher?.contactName;
              
              return (
                <div
                  key={draft.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onDraftSelect?.(draft)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {companyName || draft.email_from}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(draft.status)}`}
                        >
                          {getStatusIcon(draft.status)}
                          <span className="ml-1">{draft.status}</span>
                        </Badge>
                        {hasOffer && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            Has Offer
                          </Badge>
                        )}
                      </div>
                      
                      {contactName && (
                        <div className="text-xs text-gray-700 mt-0.5">
                          Contact: {contactName}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-600 mt-1">
                        {draft.email_subject}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{draft.email_from}</span>
                        <span>•</span>
                        <span>{draft.campaign_name}</span>
                        <span>•</span>
                        <span>{new Date(draft.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-4">
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading more...</span>
                </div>
              )}
            </div>
            
            {!hasMore && drafts.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                All {drafts.length} drafts loaded
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}