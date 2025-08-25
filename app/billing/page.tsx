'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountAuthWrapper from '@/components/AccountAuthWrapper';
import Header from '@/components/Header';
import AccountLayout from '@/components/AccountLayout';
import { 
  CreditCard, 
  FileText, 
  Download, 
  RefreshCw, 
  DollarSign,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'invoice';
  date: string;
  amount: number;
  status: string;
  description: string;
  orderId?: string;
  invoiceUrl?: string;
  paymentMethod?: string;
  receiptAvailable?: boolean;
}

export default function BillingHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'payments' | 'refunds' | 'invoices'>('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalRefunded: 0,
    netAmount: 0,
    transactionCount: 0
  });

  useEffect(() => {
    fetchBillingHistory();
  }, [filter, dateRange]);

  const fetchBillingHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/billing/history?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || {
        totalPaid: 0,
        totalRefunded: 0,
        netAmount: 0,
        transactionCount: 0
      });
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (transaction: Transaction) => {
    try {
      // For invoice transactions, the orderId is what we need
      if (!transaction.orderId) {
        alert('Order ID not available for this invoice');
        return;
      }

      const response = await fetch(`/api/orders/${transaction.orderId}/invoice/download`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 400) {
          // Invoice might not be generated yet, try to generate it first
          const generateResponse = await fetch(`/api/orders/${transaction.orderId}/invoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'generate_invoice' })
          });

          if (generateResponse.ok) {
            // Try downloading again
            const retryResponse = await fetch(`/api/orders/${transaction.orderId}/invoice/download`, {
              credentials: 'include'
            });
            
            if (retryResponse.ok) {
              const blob = await retryResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `invoice-${transaction.orderId.substring(0, 8)}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              return;
            }
          }
        }
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${transaction.orderId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. The invoice may need to be generated first.');
    }
  };

  const viewReceipt = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/billing/receipt/${transactionId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipt');
      }

      const data = await response.json();
      
      if (data.receiptUrl) {
        // Open Stripe receipt in new tab
        window.open(data.receiptUrl, '_blank');
      } else {
        alert(data.message || 'Receipt not available');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      alert('Failed to fetch receipt');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <TrendingDown className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'refund':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'invoice':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <AccountAuthWrapper>
      <>
        <Header />
        <AccountLayout>
          <div className="space-y-8">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totalPaid)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Refunded</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totalRefunded)}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.netAmount)}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.transactionCount}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="payments">Payments Only</option>
                  <option value="refunds">Refunds Only</option>
                  <option value="invoices">Invoices Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={fetchBillingHistory}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading billing history...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No transactions found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.description}
                          {transaction.orderId && (
                            <span className="block text-xs text-gray-500">
                              Order: {transaction.orderId.substring(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transaction.status)}
                            <span className="text-sm text-gray-900 capitalize">
                              {transaction.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.type === 'refund' ? 'text-red-600' : 'text-gray-900'}>
                            {transaction.type === 'refund' ? '-' : ''}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {transaction.orderId && (
                              <button
                                onClick={() => router.push(`/orders/${transaction.orderId}`)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View Order
                              </button>
                            )}
                            {transaction.type === 'payment' && transaction.receiptAvailable && (
                              <button
                                onClick={() => viewReceipt(transaction.id)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Receipt className="w-4 h-4" />
                                Receipt
                              </button>
                            )}
                            {transaction.invoiceUrl && (
                              <button
                                onClick={() => downloadInvoice(transaction)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" />
                                Invoice
                              </button>
                            )}
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
        </AccountLayout>
      </>
    </AccountAuthWrapper>
  );
}