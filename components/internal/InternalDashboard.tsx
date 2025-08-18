'use client';

import Link from 'next/link';
import { 
  Globe, 
  Users, 
  Link2, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Database,
  Package,
  DollarSign,
  BarChart3,
  Shield
} from 'lucide-react';

interface DashboardStats {
  websiteStats: {
    total: number;
    withPublishers: number;
    highQuality: number;
    qualityScored: number;
  };
  publisherStats: {
    total: number;
    active: number;
    verified: number;
  };
  relationshipStats: {
    total: number;
    verified: number;
    withOfferings: number;
  };
  recentWebsites: Array<{
    id: string;
    domain: string;
    domainRating: number | null;
    totalTraffic: number | null;
    createdAt: Date;
  }>;
  recentPublishers: Array<{
    id: string;
    companyName: string | null;
    email: string;
    status: string | null;
    createdAt: Date;
  }>;
}

export default function InternalDashboard({
  websiteStats,
  publisherStats,
  relationshipStats,
  recentWebsites,
  recentPublishers
}: DashboardStats) {
  // Calculate percentages
  const websiteCoverage = websiteStats.total > 0 
    ? Math.round((websiteStats.withPublishers / websiteStats.total) * 100) 
    : 0;
  
  const publisherActiveRate = publisherStats.total > 0
    ? Math.round((publisherStats.active / publisherStats.total) * 100)
    : 0;

  const relationshipVerificationRate = relationshipStats.total > 0
    ? Math.round((relationshipStats.verified / relationshipStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Internal Portal Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage websites, publishers, and marketplace relationships
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/internal/websites/new"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Globe className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Website</span>
          </Link>
          
          <Link
            href="/internal/import"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Database className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Bulk Import</span>
          </Link>
          
          <Link
            href="/internal/relationships/assign"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Link2 className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Assign Publishers</span>
          </Link>
          
          <Link
            href="/internal/quality"
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <CheckCircle className="h-8 w-8 text-yellow-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Quality Review</span>
          </Link>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Websites Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Websites</h3>
            <Globe className="h-6 w-6 text-blue-600" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-gray-900">{websiteStats.total}</span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">With Publishers</span>
                <span className="font-medium">{websiteStats.withPublishers} ({websiteCoverage}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High Quality (DR≥50)</span>
                <span className="font-medium">{websiteStats.highQuality}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quality Scored</span>
                <span className="font-medium">{websiteStats.qualityScored}</span>
              </div>
            </div>
            
            <Link
              href="/internal/websites"
              className="flex items-center justify-center mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Publishers Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Publishers</h3>
            <Users className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-gray-900">{publisherStats.total}</span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active</span>
                <span className="font-medium">{publisherStats.active} ({publisherActiveRate}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verified</span>
                <span className="font-medium">{publisherStats.verified}</span>
              </div>
            </div>
            
            <Link
              href="/internal/publishers"
              className="flex items-center justify-center mt-4 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Relationships Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Relationships</h3>
            <Link2 className="h-6 w-6 text-purple-600" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-gray-900">{relationshipStats.total}</span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verified</span>
                <span className="font-medium">{relationshipStats.verified} ({relationshipVerificationRate}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">With Offerings</span>
                <span className="font-medium">{relationshipStats.withOfferings}</span>
              </div>
            </div>
            
            <Link
              href="/internal/relationships"
              className="flex items-center justify-center mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Websites */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Websites</h3>
            <Link
              href="/internal/websites"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentWebsites.length > 0 ? (
              recentWebsites.map((website) => (
                <Link
                  key={website.id}
                  href={`/internal/websites/${website.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{website.domain}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        DR: {website.domainRating || 'N/A'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Traffic: {website.totalTraffic ? `${(website.totalTraffic / 1000).toFixed(0)}K` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No websites yet</p>
            )}
          </div>
        </div>

        {/* Recent Publishers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Publishers</h3>
            <Link
              href="/internal/publishers"
              className="text-sm text-green-600 hover:text-green-700"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentPublishers.length > 0 ? (
              recentPublishers.map((publisher) => (
                <Link
                  key={publisher.id}
                  href={`/internal/publishers/${publisher.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {publisher.companyName || publisher.email}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {publisher.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {publisher.status || 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No publishers yet</p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Database</p>
            <p className="text-xs text-gray-500">Healthy</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Security</p>
            <p className="text-xs text-gray-500">Secure</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Coverage</p>
            <p className="text-xs text-gray-500">{websiteCoverage}% assigned</p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Performance</p>
            <p className="text-xs text-gray-500">Optimal</p>
          </div>
        </div>
      </div>
    </div>
  );
}