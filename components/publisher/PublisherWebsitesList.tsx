'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Pause,
  Play,
  TrendingUp,
  Users,
  DollarSign,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { PublisherWebsite } from '@/lib/types/publisher';

interface PublisherWebsitesListProps {
  websites: PublisherWebsite[];
}

export default function PublisherWebsitesList({ websites }: PublisherWebsitesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter websites based on search and status
  const filteredWebsites = websites.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (item.relationship.isActive || false)) ||
      (statusFilter === 'paused' && !(item.relationship.isActive || false));
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge
  const getStatusBadge = (isActive: boolean, verificationStatus: string) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          <Pause className="h-3 w-3 mr-1" />
          Paused
        </span>
      );
    }
    
    switch (verificationStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        );
    }
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Format traffic
  const formatTraffic = (traffic: number | null) => {
    if (!traffic) return 'N/A';
    if (traffic >= 1000000) {
      return `${(traffic / 1000000).toFixed(1)}M`;
    }
    if (traffic >= 1000) {
      return `${(traffic / 1000).toFixed(1)}K`;
    }
    return traffic.toString();
  };

  // Table columns
  const columns = [
    { key: 'website', header: 'Website', accessor: (item: any) => item.website, label: 'Website' },
    { key: 'status', header: 'Status', accessor: (item: any) => item.status, label: 'Status' },
    { key: 'metrics', header: 'Metrics', accessor: (item: any) => item.metrics, label: 'Metrics' },
    { key: 'earnings', header: 'Earnings', accessor: (item: any) => item.earnings, label: 'Earnings' },
    { key: 'actions', header: 'Actions', accessor: (item: any) => item.actions, label: 'Actions' },
  ];

  // Table rows
  const rows = filteredWebsites.map(item => ({
    key: item.website.id,
    website: (
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Globe className="h-5 w-5 text-gray-600" />
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">
            {item.website.domain}
          </div>
          <div className="text-xs text-gray-500">
            {item.relationship.relationshipType}
          </div>
        </div>
      </div>
    ),
    status: getStatusBadge(item.relationship.isActive || false, item.relationship.verificationStatus),
    metrics: (
      <div className="text-sm">
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">
            DR: <span className="font-medium">{item.website.domainRating || 'N/A'}</span>
          </span>
          <span className="text-gray-600">
            Traffic: <span className="font-medium">{formatTraffic(item.website.totalTraffic)}/mo</span>
          </span>
        </div>
      </div>
    ),
    earnings: (
      <div className="text-sm">
        <div className="font-medium text-gray-900">$0</div>
        <div className="text-xs text-gray-500">This month</div>
      </div>
    ),
    actions: (
      <div className="flex items-center space-x-2">
        <Link
          href={`/publisher/websites/${item.website.id}`}
          className="p-1 hover:bg-gray-100 rounded"
          title="View details"
        >
          <Eye className="h-4 w-4 text-gray-400" />
        </Link>
        <Link
          href={`/publisher/websites/${item.website.id}/offerings`}
          className="p-1 hover:bg-gray-100 rounded"
          title="Manage offerings"
        >
          <Edit className="h-4 w-4 text-gray-400" />
        </Link>
        <button className="p-1 hover:bg-gray-100 rounded" title="More options">
          <MoreVertical className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    ),
  }));

  // Mobile card renderer - using data directly instead of parsing JSX
  const mobileCardRenderer = (row: any, index: number) => {
    const item = filteredWebsites[index];
    if (!item) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {item.website.domain}
              </div>
              <div className="text-xs text-gray-500">
                {item.relationship.relationshipType}
              </div>
            </div>
          </div>
          {getStatusBadge(item.relationship.isActive || false, item.relationship.verificationStatus)}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Domain Rating</span>
            <p className="font-medium">
              {item.website.domainRating || 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Traffic</span>
            <p className="font-medium">
              {formatTraffic(item.website.totalTraffic)}/mo
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-500">Earnings</span>
            <p className="text-sm font-medium">$0</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/publisher/websites/${item.website.id}`}
              className="p-1 hover:bg-gray-100 rounded"
              title="View details"
            >
              <Eye className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              href={`/publisher/websites/${item.website.id}/offerings`}
              className="p-1 hover:bg-gray-100 rounded"
              title="Manage offerings"
            >
              <Edit className="h-4 w-4 text-gray-400" />
            </Link>
            <button className="p-1 hover:bg-gray-100 rounded" title="More options">
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your websites and their offerings
          </p>
        </div>
        <Link
          href="/publisher/websites/claim"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Website
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search websites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Websites Table/List */}
      {filteredWebsites.length > 0 ? (
        <ResponsiveTable
          columns={columns}
          data={rows}
          keyExtractor={(row) => row.key}
          breakpoint="lg"
          mobileCardRenderer={mobileCardRenderer}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No websites found' : 'No websites yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Add your first website to start managing offerings'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Link
              href="/publisher/websites/claim"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Website
            </Link>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {filteredWebsites.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredWebsites.length}</p>
              <p className="text-sm text-gray-600">Total Websites</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredWebsites.filter(w => w.relationship.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-gray-600">Monthly Earnings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600">Active Orders</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}