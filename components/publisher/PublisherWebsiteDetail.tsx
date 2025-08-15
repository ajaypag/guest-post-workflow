'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  ArrowLeft,
  Edit,
  Pause,
  Play,
  MoreVertical,
  Package,
  BarChart3,
  Settings,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ExternalLink
} from 'lucide-react';
import { 
  PublisherPerformanceMetrics, 
  Website, 
  PublisherRelationship,
  PublisherOffering 
} from '@/lib/types/publisher';

interface WebsiteDetailProps {
  website: Website;
  relationship: PublisherRelationship;
  offerings: PublisherOffering[];
  performance: PublisherPerformanceMetrics | null;
}

export default function PublisherWebsiteDetail({ 
  website, 
  relationship, 
  offerings,
  performance 
}: WebsiteDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showActions, setShowActions] = useState(false);

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(numericAmount);
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

  // Get status badge
  const getStatusBadge = () => {
    if (!relationship.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          <Pause className="h-3 w-3 mr-1" />
          Paused
        </span>
      );
    }
    
    if (relationship.verificationStatus === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Pending Verification
      </span>
    );
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'offerings', label: 'Offerings', icon: Package, count: offerings.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Link
              href="/publisher/websites"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{website.domain}</h1>
                {getStatusBadge()}
              </div>
              
              <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                <span>DR: <span className="font-medium text-gray-900">{website.domainRating || 'N/A'}</span></span>
                <span>Traffic: <span className="font-medium text-gray-900">{formatTraffic(website.totalTraffic || null)}/mo</span></span>
                {website.guestPostCost && (
                  <span>Base Price: <span className="font-medium text-gray-900">{formatCurrency(website.guestPostCost)}</span></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {relationship.isActive ? (
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </button>
            ) : (
              <button className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                <Play className="h-4 w-4 mr-2" />
                Activate
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                  <Link
                    href={`/publisher/websites/${website.id}/settings`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                  </Link>
                  <a
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ExternalLink className="h-4 w-4 inline mr-2" />
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-6 py-3 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performance?.totalOrders || 0}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performance?.successfulOrders && performance?.totalOrders
                            ? `${Math.round((performance.successfulOrders / performance.totalOrders) * 100)}%`
                            : '0%'}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Response</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performance?.avgResponseTimeHours 
                            ? `${Math.round(parseFloat(performance.avgResponseTimeHours))}h`
                            : 'N/A'}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {performance?.totalRevenue 
                            ? formatCurrency(parseFloat(performance.totalRevenue))
                            : '$0'}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Website Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Website Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Relationship Type:</span>
                      <p className="font-medium text-gray-900 capitalize">{relationship.relationshipType}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Verification Status:</span>
                      <p className="font-medium text-gray-900 capitalize">{relationship.verificationStatus}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Guest Post Price:</span>
                      <p className="font-medium text-gray-900">
                        {website.guestPostCost ? formatCurrency(website.guestPostCost) : 'Not Set'}
                      </p>
                    </div>
                    {relationship.verifiedAt && (
                      <div>
                        <span className="text-gray-600">Verified On:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(relationship.verifiedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Priority Rank:</span>
                      <p className="font-medium text-gray-900">
                        {relationship.priorityRank || 'Default'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reliability Score */}
              {performance?.reliabilityScore && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Reliability Score</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Overall Score</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {Math.round(parseFloat(performance.reliabilityScore))}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${parseFloat(performance.reliabilityScore)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'offerings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Active Offerings</h3>
                <Link
                  href={`/publisher/websites/${website.id}/offerings/new`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Offering
                </Link>
              </div>

              {offerings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offerings.map((offering) => (
                    <div key={offering.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900">{offering.offeringType}</h4>
                        <Link
                          href={`/publisher/offerings/${offering.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </Link>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base Price:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(offering.basePrice))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Turnaround:</span>
                          <span className="font-medium">{offering.turnaroundDays} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            offering.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {offering.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No offerings yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create your first offering to start accepting orders
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Analytics coming soon</p>
              <p className="text-sm text-gray-400 mt-1">
                Detailed analytics for this website will be available here
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Settings coming soon</p>
              <p className="text-sm text-gray-400 mt-1">
                Manage website-specific settings and preferences
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}