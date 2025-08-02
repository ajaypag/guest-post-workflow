'use client';

import React from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface PaymentStatusProps {
  status: 'pending' | 'paid' | 'overdue' | 'refunded' | 'partial';
  paidAt?: Date | string | null;
  amount?: number;
  showAmount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PaymentStatus({ 
  status, 
  paidAt, 
  amount,
  showAmount = false,
  size = 'md' 
}: PaymentStatusProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200',
          iconClassName: 'text-green-600'
        };
      case 'pending':
        return {
          label: 'Payment Pending',
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          iconClassName: 'text-yellow-600'
        };
      case 'overdue':
        return {
          label: 'Overdue',
          icon: AlertCircle,
          className: 'bg-red-100 text-red-800 border-red-200',
          iconClassName: 'text-red-600'
        };
      case 'refunded':
        return {
          label: 'Refunded',
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          iconClassName: 'text-gray-600'
        };
      case 'partial':
        return {
          label: 'Partial Payment',
          icon: DollarSign,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          iconClassName: 'text-orange-600'
        };
      default:
        return {
          label: 'Unknown',
          icon: AlertCircle,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          iconClassName: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${config.className} ${sizeClasses[size]}`}>
      <Icon className={`${iconSizes[size]} ${config.iconClassName}`} />
      <span className="font-medium">{config.label}</span>
      {paidAt && status === 'paid' && (
        <span className="text-opacity-75">
          • {formatDate(paidAt)}
        </span>
      )}
      {showAmount && amount !== undefined && (
        <span className="text-opacity-75">
          • ${formatCurrency(amount)}
        </span>
      )}
    </div>
  );
}

// Convenience component for large payment status display
export function PaymentStatusCard({ order }: { order: any }) {
  const getPaymentStatus = () => {
    if (order.paidAt) {
      return 'paid';
    }
    if (order.state === 'partial_payment') {
      return 'partial';
    }
    if (order.invoicedAt && 
        new Date(order.invoicedAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
      return 'overdue';
    }
    return 'pending';
  };

  const status = getPaymentStatus();
  const isPaid = status === 'paid';
  const isPartial = status === 'partial';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-gray-600" />
        Payment Information
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <PaymentStatus 
            status={status} 
            paidAt={order.paidAt}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount:</span>
          <span className="font-semibold text-lg">
            ${formatCurrency(order.totalRetail)}
          </span>
        </div>
        
        {isPartial && order.amountPaid && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="text-green-600 font-medium">
              ${formatCurrency(order.amountPaid)}
            </span>
          </div>
        )}
        
        {isPartial && order.amountRemaining && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Remaining:</span>
            <span className="text-orange-600 font-medium">
              ${formatCurrency(order.amountRemaining)}
            </span>
          </div>
        )}
        
        {order.invoicedAt && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Invoiced:</span>
            <span className="text-gray-800">
              {new Date(order.invoicedAt).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {order.paidAt && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Paid On:</span>
            <span className="text-gray-800">
              {new Date(order.paidAt).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {!isPaid && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {isPartial 
                ? 'Additional payment required before workflows can be generated.'
                : 'Payment must be recorded before workflows can be generated.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}