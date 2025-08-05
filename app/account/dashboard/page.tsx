'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountAuthWrapper from '@/components/AccountAuthWrapper';
import Header from '@/components/Header';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  Package,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  ShoppingCart,
  TrendingUp,
  Calendar,
  DollarSign,
  Trash2,
  ExternalLink,
  Settings,
  Plus
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  totalRetail: number;
  createdAt: string;
  itemCount: number;
  completedCount: number;
}


interface Client {
  id: string;
  name: string;
  website: string;
  targetPages: Array<{
    id: string;
    url: string;
  }>;
}

interface AccountDashboardProps {
  user: any;
}

export default function AccountDashboard() {
  const [user, setUser] = useState<any>(null);

  return (
    <AccountAuthWrapper>
      {(authUser: any) => (
        <>
          <Header />
          <AccountDashboardContent user={authUser} />
        </>
      )}
    </AccountAuthWrapper>
  );
}

function AccountDashboardContent({ user }: AccountDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    totalBrands: 0,
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load orders
      const ordersResponse = await fetch('/api/orders', {
        credentials: 'include',
      });
      
      if (ordersResponse.ok) {
        const { orders: orderData } = await ordersResponse.json();
        setOrders(orderData);
        
        // Calculate stats
        const totalSpent = orderData.reduce((sum: number, order: any) => sum + (order.totalRetail || 0), 0);
        const activeOrders = orderData.filter((o: any) => ['draft', 'approved', 'in_progress'].includes(o.status)).length;
        const completedOrders = orderData.filter((o: any) => o.status === 'completed').length;
        
        setStats(prev => ({
          ...prev,
          totalOrders: orderData.length,
          activeOrders,
          completedOrders,
          totalSpent,
        }));
      }
      
      // Load account brands
      const clientResponse = await fetch('/api/accounts/client', {
        credentials: 'include',
      });
      
      if (clientResponse.ok) {
        const { clients: clientData, totalBrands } = await clientResponse.json();
        setClients(clientData || []);
        setStats(prev => ({
          ...prev,
          totalBrands: totalBrands || 0,
        }));
      }
      
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'approved':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6 h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name}
              </h1>
              <p className="mt-1 text-gray-600">
                Manage your guest post orders and track your campaigns
              </p>
            </div>
            <button
              onClick={() => router.push('/account/settings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
          </div>


          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalBrands}</div>
              <p className="text-sm text-gray-600">Active Brands</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeOrders}</div>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.completedOrders}</div>
              <p className="text-sm text-gray-600">Completed</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalSpent)}
              </div>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>

          {/* Brand Summary */}
          {clients.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Brands</h2>
                  <p className="text-sm text-gray-600">
                    You have {stats.totalBrands} active {stats.totalBrands === 1 ? 'brand' : 'brands'} registered
                  </p>
                </div>
                <button
                  onClick={() => router.push('/clients')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Manage All Brands
                  <ExternalLink className="h-4 w-4 ml-2" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.slice(0, 3).map((client) => (
                  <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-1">{client.name}</h3>
                    <a 
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {client.website}
                    </a>
                    <p className="text-xs text-gray-500 mt-2">
                      {client.targetPages?.length || 0} target pages
                    </p>
                  </div>
                ))}
                {clients.length > 3 && (
                  <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                    <p className="text-sm text-gray-600">
                      +{clients.length - 3} more {clients.length - 3 === 1 ? 'brand' : 'brands'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">No Brands Found</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to add at least one brand before creating orders.
                  </p>
                  <button
                    onClick={() => router.push('/clients/new')}
                    className="mt-3 inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Your First Brand
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => router.push('/clients')}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building className="h-6 w-6 text-purple-600" />
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {clients.length > 0 ? 'Manage Brands' : 'Add First Brand'}
              </h3>
              <p className="text-sm text-gray-600">
                {clients.length > 0 
                  ? 'View and manage all your brands' 
                  : 'Get started by adding your first brand'}
              </p>
            </button>

            <button
              onClick={() => router.push(clients.length > 0 ? '/orders/new' : '/clients/new')}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
              disabled={clients.length === 0}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${clients.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Plus className={`h-6 w-6 ${clients.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${clients.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                New Order
              </h3>
              <p className="text-sm text-gray-600">
                {clients.length > 0 
                  ? 'Start a new guest post campaign' 
                  : 'Add a brand first to create orders'}
              </p>
            </button>

            <button
              onClick={() => router.push('/orders')}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">View Orders</h3>
              <p className="text-sm text-gray-600">
                {orders.length > 0 
                  ? 'Track all your guest post orders' 
                  : 'Your order history will appear here'}
              </p>
            </button>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-gray-600" />
                Recent Orders
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domains
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No orders found. Create your first order to get started.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.itemCount || 0} domains
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(order.completedCount || 0) / (order.itemCount || 1) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {order.completedCount || 0}/{order.itemCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(order.totalRetail)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View Order
                            </button>
                            {order.status === 'draft' && (
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this draft order? This action cannot be undone.')) {
                                    try {
                                      const response = await fetch(`/api/orders/${order.id}`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' }
                                      });
                                      
                                      if (response.ok) {
                                        // Refresh the orders list
                                        window.location.reload();
                                      } else {
                                        const data = await response.json();
                                        alert(data.error || 'Failed to delete order');
                                      }
                                    } catch (error) {
                                      console.error('Error deleting order:', error);
                                      alert('Error deleting order');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Delete draft order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
}