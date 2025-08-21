'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, AlertCircle, Clock, ChevronRight, RefreshCw, Users, Building, Package, DollarSign } from 'lucide-react';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import { formatCurrency } from '@/lib/utils/formatting';

export default function NotificationBell() {
  const { notifications, loading, refreshNotifications } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  if (loading || !notifications) {
    return (
      <div className="relative">
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 disabled:opacity-50">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const hasActionRequired = notifications.actionRequiredCount > 0;
  const hasRecentUpdates = notifications.recentUpdatesCount > 0;
  const hasMoreSuggestionsNeeded = (notifications.moreSuggestionsCount || 0) > 0;
  const totalNotifications = notifications.actionRequiredCount;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) {
            refreshNotifications(); // Refresh when opening
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Bell className={`h-5 w-5 ${hasActionRequired ? 'text-red-600' : ''}`} />
        
        {/* Badge for action required items */}
        {totalNotifications > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full text-xs font-medium flex items-center justify-center animate-pulse">
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </span>
        )}
        
        {/* Dot for recent updates without action required */}
        {!hasActionRequired && hasRecentUpdates && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <Link 
                href="/orders"
                onClick={() => setShowDropdown(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {/* More Suggestions Needed Section - High Priority */}
            {hasMoreSuggestionsNeeded && (
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">
                    {notifications.moreSuggestionsCount} client{notifications.moreSuggestionsCount !== 1 ? 's' : ''} need{notifications.moreSuggestionsCount === 1 ? 's' : ''} more sites
                  </span>
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">
                    HIGH PRIORITY
                  </span>
                </div>
                
                <div className="space-y-2">
                  {notifications.urgentOrders
                    .filter(order => order.message.includes('more sit') || order.message.includes('suggestions'))
                    .map(order => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}/internal`}
                      onClick={() => setShowDropdown(false)}
                      className="block p-4 bg-purple-100 hover:bg-purple-200 rounded-lg border border-purple-300 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-purple-900 text-sm">
                              {order.accountName}
                            </span>
                            <span className="text-purple-700 text-xs">
                              #{order.shortId}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-purple-600" />
                              <span className="text-xs text-purple-800">
                                {order.lineItemCount} links
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-purple-600" />
                              <span className="text-xs text-purple-800">
                                {formatCurrency(order.totalRetail)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-purple-800 text-xs">
                            {order.message}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-purple-700 group-hover:translate-x-1 transition-transform mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Action Required Section */}
            {hasActionRequired && (notifications.actionRequiredCount - (notifications.moreSuggestionsCount || 0)) > 0 && (
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-900">
                    {notifications.actionRequiredCount - (notifications.moreSuggestionsCount || 0)} other order{(notifications.actionRequiredCount - (notifications.moreSuggestionsCount || 0)) !== 1 ? 's' : ''} need{(notifications.actionRequiredCount - (notifications.moreSuggestionsCount || 0)) === 1 ? 's' : ''} attention
                  </span>
                </div>
                
                <div className="space-y-2">
                  {notifications.urgentOrders
                    .filter(order => !(order.message.includes('more sit') || order.message.includes('suggestions')))
                    .map(order => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      onClick={() => setShowDropdown(false)}
                      className="block p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-red-600" />
                            <span className="font-semibold text-red-900 text-sm">
                              {order.accountName}
                            </span>
                            <span className="text-red-700 text-xs">
                              #{order.shortId}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-red-800">
                                {order.lineItemCount} links
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-red-800">
                                {formatCurrency(order.totalRetail)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-red-700 text-xs">
                            {order.message}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-red-600 group-hover:translate-x-1 transition-transform mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Updates Section */}
            {hasRecentUpdates && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {notifications.recentUpdatesCount} recent update{notifications.recentUpdatesCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Orders have been updated in the last 7 days
                </p>
              </div>
            )}

            {/* Empty State */}
            {!hasActionRequired && !hasRecentUpdates && !hasMoreSuggestionsNeeded && (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No new notifications</p>
                <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{notifications.totalOrders} total orders</span>
              <button 
                onClick={() => {
                  refreshNotifications();
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}