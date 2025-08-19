'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Globe,
  Search,
  Filter,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  Package,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle
} from 'lucide-react';

interface Website {
  id: string;
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: string | null; // Note: DECIMAL field comes as string
  internalQualityScore: number | null;
  internalNotes: string | null;
  status?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WebsiteWithCounts {
  website: Website;
  publisherCount: number;
  offeringCount: number;
}

interface InternalWebsitesListProps {
  websites: WebsiteWithCounts[];
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  searchParams: any;
}

export default function InternalWebsitesList({
  websites,
  totalCount,
  currentPage,
  itemsPerPage,
  searchParams
}: InternalWebsitesListProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionMenu, setBulkActionMenu] = useState(false);

  // Filter states
  const [search, setSearch] = useState(searchParams.search || '');
  const [minDR, setMinDR] = useState(searchParams.minDR || '');
  const [maxDR, setMaxDR] = useState(searchParams.maxDR || '');
  const [hasPublisher, setHasPublisher] = useState(searchParams.hasPublisher || '');
  const [verified, setVerified] = useState(searchParams.verified || '');
  const [sort, setSort] = useState(searchParams.sort || 'created_desc');
  const [status, setStatus] = useState(searchParams.status || '');
  const [source, setSource] = useState(searchParams.source || '');

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Update URL with filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (minDR) params.set('minDR', minDR);
    if (maxDR) params.set('maxDR', maxDR);
    if (hasPublisher) params.set('hasPublisher', hasPublisher);
    if (verified) params.set('verified', verified);
    if (sort) params.set('sort', sort);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    params.set('page', '1'); // Reset to first page
    
    router.push(`/internal/websites?${params.toString()}`);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setMinDR('');
    setMaxDR('');
    setHasPublisher('');
    setVerified('');
    setSort('created_desc');
    setStatus('');
    setSource('');
    router.push('/internal/websites');
  };

  // Handle pagination
  const goToPage = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set('page', page.toString());
    router.push(`/internal/websites?${params.toString()}`);
  };

  // Toggle website selection
  const toggleWebsiteSelection = (websiteId: string) => {
    setSelectedWebsites(prev =>
      prev.includes(websiteId)
        ? prev.filter(id => id !== websiteId)
        : [...prev, websiteId]
    );
  };

  // Select all websites
  const selectAllWebsites = () => {
    if (selectedWebsites.length === websites.length) {
      setSelectedWebsites([]);
    } else {
      setSelectedWebsites(websites.map(w => w.website.id));
    }
  };

  // Format numbers
  const formatTraffic = (traffic: number | null) => {
    if (!traffic) return 'N/A';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(0)}K`;
    return traffic.toString();
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Database</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage {totalCount} websites in the marketplace
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            href="/internal/import"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Link>
          <Link
            href="/internal/websites/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Website
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by domain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="domain_asc">Domain A-Z</option>
              <option value="domain_desc">Domain Z-A</option>
              <option value="dr_desc">Highest DR</option>
              <option value="dr_asc">Lowest DR</option>
              <option value="traffic_desc">Most Traffic</option>
            </select>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm ${
                showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>

            {/* Apply/Clear */}
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
            >
              Apply
            </button>
            
            {(search || minDR || maxDR || hasPublisher || verified) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min DR</label>
              <input
                type="number"
                value={minDR}
                onChange={(e) => setMinDR(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max DR</label>
              <input
                type="number"
                value={maxDR}
                onChange={(e) => setMaxDR(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="100"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Has Publisher</label>
              <select
                value={hasPublisher}
                onChange={(e) => setHasPublisher(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verified</label>
              <select
                value={verified}
                onChange={(e) => setVerified(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Sources</option>
                <option value="manyreach">ManyReach (Email)</option>
                <option value="airtable">Airtable</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedWebsites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedWebsites.length} website{selectedWebsites.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/internal/relationships/assign?websites=${selectedWebsites.join(',')}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Assign Publishers
              </button>
              <button
                onClick={() => setBulkActionMenu(!bulkActionMenu)}
                className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm"
              >
                More Actions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Websites Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedWebsites.length === websites.length && websites.length > 0}
                    onChange={selectAllWebsites}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Publishers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {websites.map(({ website, publisherCount, offeringCount }) => (
                <tr key={website.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedWebsites.includes(website.id)}
                      onChange={() => toggleWebsiteSelection(website.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        href={`/internal/websites/${website.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {website.domain}
                      </Link>
                      {website.internalNotes && (
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                          {website.internalNotes}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded font-medium ${
                      website.source === 'manyreach' ? 'bg-blue-100 text-blue-700' :
                      website.source === 'airtable' ? 'bg-green-100 text-green-700' :
                      website.source === 'manual' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {website.source === 'manyreach' ? '📧 Email' :
                       website.source === 'airtable' ? '📊 Airtable' :
                       website.source === 'manual' ? '✏️ Manual' :
                       website.source || 'Unknown'}
                    </span>
                    {website.status === 'pending' && website.source === 'manyreach' && (
                      <span className="ml-1 text-xs text-orange-600" title="Pending verification">⏳</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-900">
                          DR: <span className="font-medium">{website.domainRating || 'N/A'}</span>
                        </span>
                        <span className="text-gray-900">
                          Traffic: <span className="font-medium">{formatTraffic(website.totalTraffic)}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {publisherCount > 0 ? (
                        <>
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-900">{publisherCount}</span>
                          {offeringCount > 0 && (
                            <>
                              <Package className="h-4 w-4 text-blue-600 ml-2" />
                              <span className="text-sm text-gray-900">{offeringCount}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">No publishers</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="space-y-1">
                        {website.guestPostCost && (
                          <div className="text-gray-900">
                            GP: {formatCurrency(website.guestPostCost)}
                          </div>
                        )}
                        {!website.guestPostCost && (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {website.internalQualityScore !== null ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Score: {website.internalQualityScore}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/internal/websites/${website.id}/edit`}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <a
                        href={`https://${website.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        title="Visit"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        title="More"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} websites
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-1 rounded-lg ${
                    pageNum === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && (
              <>
                <span className="text-gray-500">...</span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className={`px-3 py-1 rounded-lg ${
                    totalPages === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-white'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}