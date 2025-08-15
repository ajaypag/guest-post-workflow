'use client';

import { 
  Globe, 
  Package, 
  DollarSign, 
  Clock, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import PublisherStatCard from './PublisherStatCard';
import { PublisherDashboardStats } from '@/lib/types/publisher';

interface PublisherDashboardProps {
  stats: PublisherDashboardStats;
}

export default function PublisherDashboard({ stats }: PublisherDashboardProps) {
  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format response time
  const formatResponseTime = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's an overview of your publisher account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PublisherStatCard
          title="Total Websites"
          value={stats.totalWebsites.toString()}
          icon={Globe}
          trend={{ value: 0, isPositive: true }}
          color="blue"
        />
        <PublisherStatCard
          title="Active Offerings"
          value={stats.activeOfferings.toString()}
          icon={Package}
          color="purple"
        />
        <PublisherStatCard
          title="This Month"
          value={formatCurrency(stats.monthlyEarnings * 100)}
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
          color="green"
        />
        <PublisherStatCard
          title="Avg Response"
          value={formatResponseTime(stats.avgResponseTime)}
          icon={Clock}
          color="yellow"
        />
        <PublisherStatCard
          title="Reliability"
          value={`${Math.round(stats.reliabilityScore)}%`}
          icon={TrendingUp}
          trend={{ value: 2, isPositive: true }}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/publisher/orders" className="text-sm text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {stats.recentOrders.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOrders.map((order, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{order.title}</p>
                      <p className="text-xs text-gray-500">{order.client}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent orders</p>
                <p className="text-sm text-gray-400 mt-1">
                  Orders will appear here once clients place them
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Websites */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Top Performing Websites</h2>
              <Link href="/publisher/websites" className="text-sm text-blue-600 hover:text-blue-700">
                Manage →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {stats.topWebsites.length > 0 ? (
              <div className="space-y-4">
                {stats.topWebsites.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.website.domain}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-gray-500">
                          DR: {item.website.domainRating || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Traffic: {item.website.totalTraffic ? `${(item.website.totalTraffic / 1000).toFixed(1)}K` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {item.performance?.totalRevenue ? formatCurrency(item.performance.totalRevenue) : '$0'}
                        </p>
                        <p className="text-xs text-gray-500">lifetime</p>
                      </div>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No websites yet</p>
                <Link href="/publisher/websites/claim" className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
                  Claim your first website →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/publisher/websites/claim"
            className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <Globe className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm text-gray-700">Claim Website</span>
          </Link>
          <Link
            href="/publisher/offerings/new"
            className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <Package className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm text-gray-700">Add Offering</span>
          </Link>
          <Link
            href="/publisher/orders"
            className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm text-gray-700">View Orders</span>
          </Link>
          <Link
            href="/publisher/settings/payments"
            className="flex flex-col items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <DollarSign className="h-8 w-8 text-emerald-600 mb-2" />
            <span className="text-sm text-gray-700">Payment Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}