'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  DollarSign, AlertCircle, CheckCircle, XCircle, 
  Clock, TrendingDown, Search, RefreshCw, Download
} from 'lucide-react';

interface RefundRequest {
  orderId: string;
  orderNumber: string;
  accountName: string;
  originalAmount: number;
  refundAmount: number;
  reason: string;
  notes: string;
}

interface RefundHistory {
  id: string;
  orderId: string;
  stripeRefundId: string;
  amount: number;
  status: string;
  reason: string;
  notes: string;
  initiatedBy: string;
  processedAt: string;
}

export default function RefundsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [refundNotes, setRefundNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refundHistory, setRefundHistory] = useState<RefundHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refundCalculation, setRefundCalculation] = useState<any>(null);
  const [loadingCalculation, setLoadingCalculation] = useState(false);

  const searchOrder = async () => {
    if (!searchTerm) return;

    setError('');
    setSuccess('');
    setSelectedOrder(null);
    
    try {
      // Search for order
      const response = await fetch(`/api/orders/${searchTerm}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found');
        } else {
          setError('Failed to fetch order');
        }
        return;
      }

      const order = await response.json();
      
      // Check if order is eligible for refund
      if (!['payment_received', 'in_progress', 'completed', 'partially_refunded'].includes(order.state)) {
        setError(`Order cannot be refunded in current state: ${order.state}`);
        return;
      }

      setSelectedOrder(order);
      setRefundAmount((order.totalRetail / 100).toString());
      
      // Load refund history
      loadRefundHistory(order.id);
      
      // Load refund calculation
      loadRefundCalculation(order.id);
    } catch (err) {
      console.error('Error searching order:', err);
      setError('Failed to search order');
    }
  };

  const loadRefundHistory = async (orderId: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/refund`);
      if (response.ok) {
        const data = await response.json();
        setRefundHistory(data.refunds || []);
      }
    } catch (err) {
      console.error('Error loading refund history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadRefundCalculation = async (orderId: string) => {
    setLoadingCalculation(true);
    setRefundCalculation(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/refund-calculation`);
      if (response.ok) {
        const data = await response.json();
        setRefundCalculation(data);
        
        // Auto-set suggested amount if no refunds have been processed
        if (refundHistory.length === 0 && data.calculation?.suggestedAmount) {
          setRefundAmount((data.calculation.suggestedAmount / 100).toString());
        }
      }
    } catch (err) {
      console.error('Error loading refund calculation:', err);
    } finally {
      setLoadingCalculation(false);
    }
  };

  const processRefund = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid refund amount');
      return;
    }

    if (amount > selectedOrder.totalRetail / 100) {
      setError('Refund amount exceeds order total');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          reason: refundReason,
          notes: refundNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process refund');
        return;
      }

      setSuccess(data.message || 'Refund processed successfully');
      
      // Reload order and refund history
      searchOrder();
      
      // Clear form
      setRefundNotes('');
    } catch (err) {
      console.error('Error processing refund:', err);
      setError('Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'canceled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'canceled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Process Refunds</h1>
            <p className="mt-2 text-gray-600">Search for orders and process full or partial refunds</p>
          </div>

          {/* Search Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Order ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
                    placeholder="Enter order ID..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={searchOrder}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <span className="text-red-800">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <span className="text-green-800">{success}</span>
            </div>
          )}

          {/* Order Details & Refund Form */}
          {selectedOrder && (
            <>
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Order Details</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <span className="text-sm text-gray-500">Order ID</span>
                    <p className="font-mono text-sm">{selectedOrder.id.substring(0, 8)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Account</span>
                    <p className="font-medium">{selectedOrder.accountName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Amount</span>
                    <p className="font-medium text-lg">{formatCurrency(selectedOrder.totalRetail)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status</span>
                    <p className="font-medium">{selectedOrder.state}</p>
                  </div>
                </div>

                {/* Previous Refunds Summary */}
                {refundHistory.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Previous Refunds:</strong> {refundHistory.length} refund(s) totaling{' '}
                      {formatCurrency(refundHistory.reduce((sum, r) => sum + r.amount, 0))}
                    </p>
                  </div>
                )}

                {/* Refund Calculation */}
                {refundCalculation && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Suggested Refund Calculation</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-blue-800">
                        <strong>Completion:</strong> {refundCalculation.calculation.completedItems} of {refundCalculation.calculation.totalItems} items completed ({refundCalculation.calculation.completionPercentage}%)
                      </p>
                      <p className="text-blue-800">
                        <strong>Suggested Amount:</strong> {formatCurrency(refundCalculation.calculation.suggestedAmount)}
                      </p>
                      <p className="text-blue-700 text-xs">
                        {refundCalculation.calculation.reason}
                      </p>
                      {refundCalculation.calculation.policyDetails && (
                        <p className="text-blue-600 text-xs italic">
                          {refundCalculation.calculation.policyDetails}
                        </p>
                      )}
                      <button
                        onClick={() => setRefundAmount((refundCalculation.calculation.suggestedAmount / 100).toString())}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Use Suggested Amount
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refund Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum: {formatCurrency(selectedOrder.totalRetail)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refund Reason
                      </label>
                      <select
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="requested_by_customer">Requested by Customer</option>
                        <option value="duplicate">Duplicate Payment</option>
                        <option value="fraudulent">Fraudulent</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any additional notes about this refund..."
                    />
                  </div>
                  
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setRefundHistory([]);
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processRefund}
                      disabled={processing}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {processing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          Process Refund
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Refund History */}
              {refundHistory.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Refund History</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {refundHistory.map((refund) => (
                          <tr key={refund.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(refund.processedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(refund.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(refund.status)}`}>
                                {getStatusIcon(refund.status)}
                                {refund.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {refund.reason?.replace(/_/g, ' ') || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                              {refund.stripeRefundId.substring(0, 20)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}