'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function PaymentReconciliationPage() {
  const [loading, setLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [checkStripe, setCheckStripe] = useState(false);

  const fetchReconciliation = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        checkStripe: checkStripe.toString()
      });

      const response = await fetch(`/api/admin/payment-reconciliation?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation data');
      }

      const data = await response.json();
      setReconciliation(data.reconciliation);
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      alert('Failed to fetch reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const syncFromStripe = async (paymentIntentId: string, orderId: string) => {
    if (!confirm('Sync this payment from Stripe? This will update the database to match Stripe.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/payment-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync_from_stripe',
          paymentIntentId,
          orderId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync from Stripe');
      }

      alert('Successfully synced from Stripe');
      fetchReconciliation();
    } catch (error) {
      console.error('Error syncing from Stripe:', error);
      alert('Failed to sync from Stripe');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Reconciliation</h1>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={checkStripe}
                    onChange={(e) => setCheckStripe(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Verify with Stripe</span>
                </label>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchReconciliation}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconcile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          {reconciliation && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Payment Intents</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reconciliation.summary.totalPaymentIntents}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Expected Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reconciliation.summary.totalExpectedRevenue)}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Recorded Revenue</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(reconciliation.summary.totalRecordedRevenue)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Discrepancies</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reconciliation.summary.discrepancies.length}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                </div>
              </div>

              {/* Discrepancies */}
              {reconciliation.summary.discrepancies.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Discrepancies Found</h3>
                  <div className="space-y-2">
                    {reconciliation.summary.discrepancies.map((disc: any, idx: number) => (
                      <div key={idx} className="text-sm text-red-700">
                        {disc.paymentIntentId ? (
                          <div>
                            <strong>Payment Intent {disc.paymentIntentId.substring(0, 20)}...</strong>
                            <ul className="ml-4 mt-1">
                              {disc.issues.map((issue: string, i: number) => (
                                <li key={i}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div>
                            <strong>{disc.type}</strong>: {disc.count} items, Total: {formatCurrency(disc.totalAmount || 0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Intents Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Intents</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Payment Intent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          DB Status
                        </th>
                        {checkStripe && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Stripe Status
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Issues
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reconciliation.paymentIntents.map((pi: any) => (
                        <tr key={pi.paymentIntentId} className={pi.issues.length > 0 ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {pi.paymentIntentId.substring(0, 20)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(pi.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pi.dbStatus === 'succeeded' ? 'bg-green-100 text-green-800' :
                              pi.dbStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              pi.dbStatus === 'canceled' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {pi.dbStatus}
                            </span>
                          </td>
                          {checkStripe && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {pi.stripeStatus ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  pi.stripeStatus === 'succeeded' ? 'bg-green-100 text-green-800' :
                                  pi.stripeStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {pi.stripeStatus}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pi.orderId ? (
                              <a
                                href={`/orders/${pi.orderId}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {pi.orderId.substring(0, 8)}...
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-red-600">
                            {pi.issues.length > 0 ? (
                              <ul className="space-y-1">
                                {pi.issues.map((issue: string, idx: number) => (
                                  <li key={idx} className="text-xs">{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {pi.issues.length > 0 && (
                              <button
                                onClick={() => syncFromStripe(pi.paymentIntentId, pi.orderId)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Sync from Stripe
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}