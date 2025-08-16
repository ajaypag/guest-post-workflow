'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  Globe,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Settings,
  BarChart3,
  Users
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    totalEarnings: number;
  };
  invoices: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    totalPaid: number;
  };
  websites: {
    total: number;
    verified: number;
  };
}

interface RecentOrder {
  id: string;
  orderId: string;
  clientName: string;
  domain: string;
  anchorText: string;
  publisherStatus: string;
  publisherPrice: number;
  netEarnings: number;
  createdAt: string;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function PublisherDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    orders: { total: 0, pending: 0, inProgress: 0, completed: 0, totalEarnings: 0 },
    invoices: { total: 0, pending: 0, approved: 0, paid: 0, totalPaid: 0 },
    websites: { total: 0, verified: 0 }
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch orders data
        const ordersResponse = await fetch('/api/publisher/orders?limit=5');
        const ordersData = await ordersResponse.json();
        
        // Fetch invoices data
        const invoicesResponse = await fetch('/api/publisher/invoices?limit=5');
        const invoicesData = await invoicesResponse.json();
        
        // Fetch websites data
        const websitesResponse = await fetch('/api/publisher/websites');
        const websitesData = await websitesResponse.json();

        setStats({
          orders: ordersData.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, totalEarnings: 0 },
          invoices: invoicesData.stats || { total: 0, pending: 0, approved: 0, paid: 0, totalPaid: 0 },
          websites: { 
            total: websitesData.websites?.length || 0, 
            verified: websitesData.websites?.filter((w: any) => w.verification_status === 'verified').length || 0 
          }
        });
        
        setRecentOrders(ordersData.orders || []);
        setRecentInvoices(invoicesData.invoices || []);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getOrderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      notified: { label: 'Notified', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
      submitted: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
      completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
      paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Welcome Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Publisher Dashboard</h1>
                <p className="text-gray-600 mt-1">Manage your orders, earnings, and website portfolio</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/publisher/payment-profile"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Payment Settings
                </Link>
                <Link
                  href="/publisher/websites/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Website
                </Link>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Orders Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.orders.total}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span>{stats.orders.pending} pending</span>
                    <span className="mx-1">•</span>
                    <span>{stats.orders.inProgress} active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Earnings</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.orders.totalEarnings)}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    From {stats.orders.completed} completed orders
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Invoices</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.invoices.total}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span>{stats.invoices.pending} pending</span>
                    <span className="mx-1">•</span>
                    <span>{stats.invoices.paid} paid</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Websites Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Globe className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Websites</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.websites.total}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.websites.verified} verified
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  <Link
                    href="/publisher/orders"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    View All
                    <Eye className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No orders yet</p>
                    <p className="text-sm text-gray-400">Orders will appear here when assigned to you</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">
                                Order #{order.orderId.slice(-8)}
                              </h3>
                              {getOrderStatusBadge(order.publisherStatus)}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Client:</strong> {order.clientName}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Domain:</strong> {order.domain}
                            </p>
                            {order.anchorText && (
                              <p className="text-sm text-gray-600">
                                <strong>Anchor:</strong> "{order.anchorText}"
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(order.netEarnings || order.publisherPrice)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/publisher/invoices/new"
                      className="text-sm text-green-600 hover:text-green-700 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create
                    </Link>
                    <Link
                      href="/publisher/invoices"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      View All
                      <Eye className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {recentInvoices.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No invoices yet</p>
                    <Link
                      href="/publisher/invoices/new"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Create your first invoice
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900">
                                {invoice.invoice_number}
                              </h3>
                              {getInvoiceStatusBadge(invoice.status)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(invoice.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.total_amount)}
                            </p>
                            <Link
                              href={`/publisher/invoices/${invoice.id}`}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/publisher/websites/new"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Add Website</h3>
                  <p className="text-sm text-gray-600">Expand your portfolio</p>
                </div>
              </Link>
              
              <Link
                href="/publisher/invoices/new"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Create Invoice</h3>
                  <p className="text-sm text-gray-600">Request payment</p>
                </div>
              </Link>
              
              <Link
                href="/publisher/payment-profile"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Payment Settings</h3>
                  <p className="text-sm text-gray-600">Update payment info</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}