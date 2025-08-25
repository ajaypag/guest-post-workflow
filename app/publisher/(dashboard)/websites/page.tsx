'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
// PublisherHeader and PublisherAuthWrapper are now handled by layout.tsx

interface Website {
  id: string;
  domain: string;
  name?: string;
  category?: string;
  verificationStatus: string;
  createdAt: string;
  monthlyTraffic?: number;
  domainAuthority?: number;
  publisherOfferings?: any[];
}

export default function PublisherWebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/publisher/websites');
      
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      
      const data = await response.json();
      setWebsites(data.websites || []);
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      verified: { label: 'Verified', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      claimed: { label: 'Pending Verification', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading websites...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
                <p className="text-gray-600 mt-1">Manage your website portfolio and offerings</p>
              </div>
              <Link
                href="/publisher/websites/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Website
              </Link>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Websites List */}
          {websites.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No websites yet</h2>
              <p className="text-gray-600 mb-6">Add your first website to start receiving orders</p>
              <Link
                href="/publisher/websites/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Website
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metrics
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Offerings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {websites.map((website) => (
                    <tr key={website.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{website.domain}</div>
                          {website.name && (
                            <div className="text-sm text-gray-500">{website.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{website.category || 'Uncategorized'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(website.verificationStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {website.domainAuthority && (
                          <div>DA: {website.domainAuthority}</div>
                        )}
                        {website.monthlyTraffic && (
                          <div>{website.monthlyTraffic.toLocaleString()} visits/mo</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {website.publisherOfferings?.length || 0} active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/publisher/websites/${website.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/publisher/websites/${website.id}/edit`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}