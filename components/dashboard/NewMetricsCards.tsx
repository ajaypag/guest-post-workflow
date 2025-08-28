'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Globe, 
  Package, 
  Bell, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search,
  FileText,
  Clock
} from 'lucide-react';

interface NewMetricsCardsProps {
  stats: {
    totalBrands: number;
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    qualifiedSites?: number;
  };
  clients: Array<{
    id: string;
    name: string;
    targetPages?: Array<any>;
  }>;
  vettedSitesRequests: Array<{
    id: string;
    status: string;
    domainCount?: number;
    qualifiedDomainCount?: number;
  }>;
  notifications: any;
  router: any;
}

export default function NewMetricsCards({ 
  stats, 
  clients, 
  vettedSitesRequests, 
  notifications,
  router 
}: NewMetricsCardsProps) {
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);

  // Calculate metrics
  const totalTargetPages = clients.reduce((sum, client) => 
    sum + (client.targetPages?.length || 0), 0
  );

  const vettedStats = {
    total: vettedSitesRequests.length,
    pending: vettedSitesRequests.filter(r => r.status === 'submitted').length,
    analyzing: vettedSitesRequests.filter(r => 
      ['reviewing', 'approved', 'in_progress'].includes(r.status)
    ).length,
    fulfilled: vettedSitesRequests.filter(r => r.status === 'fulfilled').length,
    totalSites: vettedSitesRequests.reduce((sum, r) => 
      sum + (r.domainCount || 0), 0
    ),
    qualifiedSites: vettedSitesRequests.reduce((sum, r) => 
      sum + (r.qualifiedDomainCount || 0), 0
    )
  };

  // Debug log
  console.log('🔍 NewMetricsCards Debug:', {
    requestsCount: vettedSitesRequests.length,
    vettedStats,
    sampleRequest: vettedSitesRequests[0]
  });

  // Prepare notification display
  const urgentOrders = notifications?.urgentOrders || [];
  const currentNotification = urgentOrders[currentNotificationIndex];
  
  const nextNotification = () => {
    if (urgentOrders.length > 0) {
      setCurrentNotificationIndex((prev) => 
        (prev + 1) % urgentOrders.length
      );
    }
  };

  const prevNotification = () => {
    if (urgentOrders.length > 0) {
      setCurrentNotificationIndex((prev) => 
        prev === 0 ? urgentOrders.length - 1 : prev - 1
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Brands Card */}
      <button 
        onClick={() => router.push('/clients')}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all text-left group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
            <Building className="h-5 w-5 text-purple-600" />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
            {stats.totalBrands}
          </div>
          <p className="text-sm font-medium text-gray-700">
            {stats.totalBrands === 1 ? 'Brand' : 'Brands'}
          </p>
          {totalTargetPages > 0 && (
            <p className="text-xs text-gray-500">
              {totalTargetPages} target {totalTargetPages === 1 ? 'page' : 'pages'}
            </p>
          )}
        </div>
      </button>

      {/* 2. Vetted Sites Card */}
      <button 
        onClick={() => router.push('/vetted-sites')}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all text-left group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
            <Search className="h-5 w-5 text-green-600" />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
            {vettedStats.total}
          </div>
          <p className="text-sm font-medium text-gray-700">
            Vetted {vettedStats.total === 1 ? 'Request' : 'Requests'}
          </p>
          
          {/* Show vetted sites count subtly like other sub-items */}
          {typeof stats.qualifiedSites === 'number' && stats.qualifiedSites > 0 && (
            <p className="text-xs text-gray-500">
              {stats.qualifiedSites} available to use
            </p>
          )}
          
          <div className="text-xs text-gray-500 space-y-0.5">
            {vettedStats.pending > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                {vettedStats.pending} pending
              </div>
            )}
            {vettedStats.analyzing > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                {vettedStats.analyzing} analyzing
              </div>
            )}
            {vettedStats.totalSites > 0 && vettedStats.qualifiedSites === 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                {vettedStats.totalSites} sites analyzed
              </div>
            )}
          </div>
        </div>
      </button>

      {/* 3. Orders Card */}
      <button 
        onClick={() => router.push('/orders')}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all text-left group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {stats.totalOrders}
          </div>
          <p className="text-sm font-medium text-gray-700">
            {stats.totalOrders === 1 ? 'Order' : 'Orders'}
          </p>
          {stats.totalOrders > 0 && (
            <div className="text-xs text-gray-500 space-y-0.5">
              {stats.activeOrders > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  {stats.activeOrders} active
                </div>
              )}
              {stats.completedOrders > 0 && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  {stats.completedOrders} completed
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* 4. Notifications Card */}
      {notifications && (notifications.actionRequiredCount > 0 || notifications.recentUpdatesCount > 0) ? (
        <div className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-lg ${
              notifications.actionRequiredCount > 0 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <Bell className={`h-5 w-5 ${
                notifications.actionRequiredCount > 0 ? 'text-red-600' : 'text-gray-600'
              }`} />
            </div>
            {notifications.actionRequiredCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                {notifications.actionRequiredCount}
              </span>
            )}
          </div>

          {currentNotification ? (
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/orders/${currentNotification.id}`)}
                className="text-left w-full group"
              >
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {currentNotification.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Order #{currentNotification.shortId}
                </p>
              </button>
              
              {urgentOrders.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      prevNotification();
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {currentNotificationIndex + 1} of {urgentOrders.length}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      nextNotification();
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {notifications.recentUpdatesCount}
              </div>
              <p className="text-sm font-medium text-gray-700">
                Recent Updates
              </p>
              <p className="text-xs text-gray-500">
                Last 7 days
              </p>
            </div>
          )}
        </div>
      ) : (
        <button 
          onClick={() => router.push('/orders')}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all text-left group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
              <Bell className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-400">
              0
            </div>
            <p className="text-sm font-medium text-gray-700">
              Notifications
            </p>
            <p className="text-xs text-gray-500">
              All caught up!
            </p>
          </div>
        </button>
      )}
    </div>
  );
}