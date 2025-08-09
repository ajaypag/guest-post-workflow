'use client';

import React from 'react';
import { ShoppingBag, Calendar, Package, DollarSign, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrderInfo {
  orderId: string;
  orderName: string;
  orderGroupId: string;
  orderGroupName: string;
  createdAt: string;
  state?: string;
  totalPrice?: number;
  linkCount?: number;
  color?: string; // Assign a color to each order for visual distinction
}

interface OrderBadgeDisplayProps {
  orders: OrderInfo[];
  currentOrderId?: string; // Highlight the current context
  onOrderClick?: (order: OrderInfo) => void;
  compact?: boolean;
}

export function OrderBadgeDisplay({ 
  orders, 
  currentOrderId,
  onOrderClick,
  compact = false 
}: OrderBadgeDisplayProps) {
  
  // Assign consistent colors to orders
  const orderColors = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', icon: 'text-blue-600' },
    { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', icon: 'text-green-600' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', icon: 'text-purple-600' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', icon: 'text-amber-600' },
    { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', icon: 'text-pink-600' },
  ];

  const getOrderColor = (index: number) => orderColors[index % orderColors.length];

  const getStateLabel = (state?: string) => {
    switch(state) {
      case 'configuring': return 'Configuring';
      case 'analyzing': return 'Analyzing';
      case 'sites_ready': return 'Sites Ready';
      case 'client_reviewing': return 'Under Review';
      case 'payment_pending': return 'Payment Pending';
      case 'payment_received': return 'Paid';
      case 'workflows_generated': return 'Workflows Ready';
      case 'in_progress': return 'In Progress';
      default: return state || 'Active';
    }
  };

  if (compact) {
    // Compact view for limited space
    return (
      <div className="flex flex-wrap gap-2">
        {orders.map((order, idx) => {
          const colors = getOrderColor(idx);
          const isActive = order.orderId === currentOrderId;
          
          return (
            <button
              key={`${order.orderId}-${order.orderGroupId}`}
              onClick={() => onOrderClick?.(order)}
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                transition-all duration-200 ${colors.bg} ${colors.border} ${colors.text}
                border-2 ${isActive ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md' : 'hover:shadow-sm'}
              `}
            >
              <Hash className={`w-3 h-3 mr-1 ${colors.icon}`} />
              {order.orderName.substring(0, 20)}
              {order.orderName.length > 20 && '...'}
              {order.linkCount && (
                <span className="ml-2 text-xs opacity-75">
                  ({order.linkCount} links)
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Full view with detailed information
  return (
    <div className="space-y-3">
      {orders.map((order, idx) => {
        const colors = getOrderColor(idx);
        const isActive = order.orderId === currentOrderId;
        
        return (
          <div
            key={`${order.orderId}-${order.orderGroupId}`}
            onClick={() => onOrderClick?.(order)}
            className={`
              ${colors.bg} ${colors.border} border-2 rounded-lg p-4
              ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
              ${onOrderClick ? 'cursor-pointer' : ''}
              transition-all duration-200
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className={`w-5 h-5 ${colors.icon}`} />
                  <h4 className={`font-semibold ${colors.text}`}>
                    {order.orderName}
                  </h4>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      Current
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className={`w-4 h-4 ${colors.icon} opacity-60`} />
                    <span className={`${colors.text} opacity-80`}>
                      Group: {order.orderGroupName}
                    </span>
                  </div>
                  
                  {order.linkCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <Hash className={`w-4 h-4 ${colors.icon} opacity-60`} />
                      <span className={`${colors.text} opacity-80`}>
                        {order.linkCount} link{order.linkCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className={`w-4 h-4 ${colors.icon} opacity-60`} />
                    <span className={`${colors.text} opacity-80`}>
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {order.totalPrice !== undefined && (
                    <div className="flex items-center gap-1">
                      <DollarSign className={`w-4 h-4 ${colors.icon} opacity-60`} />
                      <span className={`${colors.text} opacity-80`}>
                        ${(order.totalPrice / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                <span className={`
                  inline-block px-3 py-1 rounded-full text-xs font-medium
                  ${colors.bg} ${colors.text} border ${colors.border}
                `}>
                  {getStateLabel(order.state)}
                </span>
              </div>
            </div>
            
            {/* Order ID for reference */}
            <div className={`mt-2 pt-2 border-t ${colors.border} opacity-50`}>
              <span className={`text-xs ${colors.text}`}>
                Order #{order.orderId.substring(0, 8)}... | Group #{order.orderGroupId.substring(0, 8)}...
              </span>
            </div>
          </div>
        );
      })}
      
      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No orders associated with this project</p>
        </div>
      )}
    </div>
  );
}