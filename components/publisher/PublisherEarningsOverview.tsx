'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Filter,
  ExternalLink,
  CreditCard
} from 'lucide-react';

interface EarningsStats {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  thisMonthEarnings: number;
  totalOrders: number;
  avgOrderValue: number;
}

interface Earning {
  id: string;
  amount: number;
  netAmount: number;
  grossAmount?: number;
  platformFeeAmount?: number;
  platformFeePercent?: string;
  currency: string;
  status: string;
  earningType: string;
  description?: string;
  confirmedAt?: string;
  paidAt?: string;
  orderInfo?: {
    orderId: string;
    clientName: string;
    targetPageUrl?: string;
    anchorText?: string;
    domain?: string;
  };
  paymentInfo?: {
    batchId: string;
    batchNumber: string;
    paidAt?: string;
    batchStatus: string;
  };
  createdAt: string;
}

interface MonthlyEarning {
  month: string;
  earnings: number;
  orders: number;
}

interface EarningsResponse {
  earnings: Earning[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: EarningsStats;
  monthlyEarnings: MonthlyEarning[];
}

export default function PublisherEarningsOverview() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    thisMonthEarnings: 0,
    totalOrders: 0,
    avgOrderValue: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/publisher/earnings?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }

      const data: EarningsResponse = await response.json();
      setEarnings(data.earnings);
      setStats(data.stats);
      setMonthlyData(data.monthlyEarnings);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [statusFilter, page]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: RefreshCw },
      paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const exportEarnings = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/publisher/earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusFilter !== 'all' ? statusFilter : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export earnings');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting earnings:', error);
      setError(error instanceof Error ? error.message : 'Failed to export earnings');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading earnings...</span>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pendingEarnings)}</div>
          <p className="text-sm text-gray-600 mt-1">Available Balance</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.thisMonthEarnings)}</div>
          <p className="text-sm text-gray-600 mt-1">This Month</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</div>
          <p className="text-sm text-gray-600 mt-1">Lifetime Earnings</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paidEarnings)}</div>
          <p className="text-sm text-gray-600 mt-1">Total Paid</p>
        </div>
      </div>

      {/* Monthly Earnings Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Over Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {monthlyData.slice(-6).map((month) => (
              <div key={month.month} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{month.month}</div>
                <div className="text-xl font-bold text-gray-900">{formatCurrency(month.earnings)}</div>
                <div className="text-xs text-gray-500">{month.orders} orders</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Export */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Earnings</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchEarnings}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            
            <button
              onClick={exportEarnings}
              disabled={exporting}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Earnings List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Earnings History</h3>
        </div>
        
        {earnings.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Earnings Found</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' 
                ? `No earnings with status "${statusFilter}" found.`
                : 'No earnings have been recorded yet.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {earnings.map((earning) => (
              <div key={earning.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {earning.description || `${earning.earningType} Earning`}
                      </h4>
                      {getStatusBadge(earning.status)}
                    </div>
                    
                    {earning.orderInfo && (
                      <div className="text-sm text-gray-600 mb-2">
                        <p>
                          <span className="font-medium">Order:</span> #{earning.orderInfo.orderId.slice(-8)} - {earning.orderInfo.clientName}
                        </p>
                        {earning.orderInfo.domain && (
                          <p><span className="font-medium">Domain:</span> {earning.orderInfo.domain}</p>
                        )}
                        {earning.orderInfo.targetPageUrl && (
                          <p>
                            <span className="font-medium">Target:</span>
                            <a 
                              href={earning.orderInfo.targetPageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 ml-1"
                            >
                              View <ExternalLink className="h-3 w-3 inline ml-1" />
                            </a>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      {earning.grossAmount && (
                        <span>Gross: {formatCurrency(earning.grossAmount)}</span>
                      )}
                      {earning.platformFeeAmount && (
                        <span>Fee: {formatCurrency(earning.platformFeeAmount)} ({earning.platformFeePercent}%)</span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Created: {new Date(earning.createdAt).toLocaleDateString()}
                      {earning.paidAt && (
                        <span className="ml-4">
                          Paid: {new Date(earning.paidAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(earning.netAmount)}
                    </div>
                    <div className="text-sm text-gray-500">{earning.currency}</div>
                    {earning.paymentInfo && (
                      <div className="text-xs text-gray-500 mt-1">
                        Batch: {earning.paymentInfo.batchNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Payment Information</h3>
            <p className="text-sm text-blue-700 mt-1">
              Earnings are processed and paid monthly. Pending earnings will be included in the next payment batch.
              Make sure your payment method is set up in your settings.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}