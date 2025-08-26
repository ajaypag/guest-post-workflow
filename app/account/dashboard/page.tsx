'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountAuthWrapper from '@/components/AccountAuthWrapper';
import Header from '@/components/Header';
import AccountLayout from '@/components/AccountLayout';
import QuickVettedSitesRequest from '@/components/dashboard/QuickVettedSitesRequest';
import NewMetricsCards from '@/components/dashboard/NewMetricsCards';
import { formatCurrency } from '@/lib/utils/formatting';
import { getStateDisplay } from '@/components/orders/OrderProgressSteps';
import { useNotifications } from '@/lib/contexts/NotificationContext';
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
  Plus,
  Sparkles,
  ArrowRight,
  Zap,
  Users,
  ChevronRight,
  Database,
  ChevronDown
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  state?: string;
  totalRetail: number;
  createdAt: string;
  itemCount: number;
  completedCount: number;
  clientNames?: string[];
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
          <ConditionalAccountLayout user={authUser} />
        </>
      )}
    </AccountAuthWrapper>
  );
}

function SidebarNotifications() {
  const router = useRouter();
  const { notifications } = useNotifications();

  if (!notifications || notifications.actionRequiredCount === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1 bg-red-500 rounded-full">
          <AlertCircle className="h-3 w-3 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-900">Action Required</h3>
          <p className="text-xs text-red-700">{notifications.actionRequiredCount} orders</p>
        </div>
      </div>
      
      {/* Order List with Rich Data */}
      <div className="space-y-1.5 mb-3">
        {notifications.urgentOrders.slice(0, 3).map((order) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="bg-white/80 hover:bg-white border border-red-200/50 rounded-md p-2 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-900 truncate">
                  {order.accountName}
                </p>
                <p className="text-xs text-red-600 mb-1">
                  {order.message}
                </p>
                {/* Rich data line */}
                <div className="flex items-center gap-2 text-xs text-red-800/70">
                  <span>{order.lineItemCount} link{order.lineItemCount !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{formatCurrency(order.totalRetail)}</span>
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-red-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-1" />
            </div>
          </div>
        ))}
        {notifications.urgentOrders.length > 3 && (
          <p className="text-xs text-red-600 text-center py-1">
            +{notifications.urgentOrders.length - 3} more
          </p>
        )}
      </div>
      
      {/* View All Button */}
      <button
        onClick={() => router.push('/orders')}
        className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
      >
        View All
      </button>
    </div>
  );
}

function AccountDashboardContent({ user }: AccountDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vettedSitesRequests, setVettedSitesRequests] = useState<any[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalBrands: 0,
  });
  const { notifications } = useNotifications();

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
        const activeOrders = orderData.filter((o: any) => ['draft', 'approved', 'in_progress'].includes(o.status)).length;
        const completedOrders = orderData.filter((o: any) => o.status === 'completed').length;
        
        setStats(prev => ({
          ...prev,
          totalOrders: orderData.length,
          activeOrders,
          completedOrders,
        }));
      }
      
      // Load account brands
      const clientResponse = await fetch('/api/accounts/client', {
        credentials: 'include',
      });
      
      if (clientResponse.ok) {
        const { clients: clientData, totalBrands } = await clientResponse.json();
        setClients(clientData || []);
        
        // Fetch vetted sites requests
        const requestsResponse = await fetch('/api/vetted-sites/requests', {
          credentials: 'include'
        });
        if (requestsResponse.ok) {
          const { requests: requestData } = await requestsResponse.json();
          setVettedSitesRequests(requestData || []);
        }
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

  const refreshVettedSitesRequests = async () => {
    try {
      const requestsResponse = await fetch('/api/vetted-sites/requests', {
        credentials: 'include',
      });
      
      if (requestsResponse.ok) {
        const { requests: requestData } = await requestsResponse.json();
        setVettedSitesRequests(requestData || []);
      }
    } catch (error) {
      console.error('Error refreshing vetted sites requests:', error);
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
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg p-6 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  // Check if this is a brand new user (no orders, no brands, no vetted sites requests)
  const isNewUser = orders.length === 0 && clients.length === 0 && vettedSitesRequests.length === 0;

  // Show special onboarding for new users
  if (isNewUser) {
    return (
      <div className="space-y-8">
        {/* Main Request Form */}
        <QuickVettedSitesRequest />

        {/* Alternative Options */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Other ways to get started:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/clients/new')}
              className="bg-white rounded-lg p-4 text-left hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">Add Brand First</span>
              </div>
              <p className="text-sm text-gray-600">
                Set up your brand details and target pages first
              </p>
            </button>

            <button
              onClick={() => router.push('/orders/new')}
              className="bg-white rounded-lg p-4 text-left hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">Create Order</span>
              </div>
              <p className="text-sm text-gray-600">
                Jump straight to placing a guest post order
              </p>
            </button>
          </div>
        </div>

        {/* Empty Stats - Keep minimal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Building, label: 'Active Brands', value: 0, color: 'purple' },
            { icon: Package, label: 'Total Orders', value: 0, color: 'blue' },
            { icon: Clock, label: 'In Progress', value: 0, color: 'yellow' },
            { icon: CheckCircle, label: 'Completed', value: 0, color: 'green' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 bg-gray-100 rounded-lg`}>
                  <stat.icon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-400">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (<div className="space-y-8">
      {/* Show Vetted Sites Request Onboarding for users with brands but no requests */}
      {clients.length > 0 && vettedSitesRequests.length === 0 && (
        <QuickVettedSitesRequest 
          onSuccess={() => {
            refreshVettedSitesRequests();
          }}
          hideWhatYouReceive={true}
        />
      )}

      {/* New Consolidated Metrics */}
      <NewMetricsCards 
        stats={stats}
        clients={clients}
        vettedSitesRequests={vettedSitesRequests}
        notifications={notifications}
        router={router}
      />

      {/* Brand Summary */}
      {clients.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
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
      )}

      {/* Vetted Sites Requests Section */}
      {vettedSitesRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Vetted Sites Requests</h2>
              <p className="text-sm text-gray-600">
                You have {vettedSitesRequests.length} vetted sites {vettedSitesRequests.length === 1 ? 'request' : 'requests'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request More Sites
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showRequestForm ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => router.push('/vetted-sites/requests')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                View All Requests
                <ExternalLink className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vettedSitesRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'reviewing' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status === 'submitted' ? 'Pending Review' :
                     request.status === 'reviewing' ? 'Under Review' :
                     request.status === 'approved' ? 'Approved' :
                     request.status === 'in_progress' ? 'In Progress' :
                     request.status === 'fulfilled' ? 'Fulfilled' :
                     'Rejected'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {Array.isArray(request.target_urls || request.targetUrls) ? (request.target_urls || request.targetUrls).length : ((request.target_urls || request.targetUrls) ? 1 : 0)} target {Array.isArray(request.target_urls || request.targetUrls) && (request.target_urls || request.targetUrls).length === 1 ? 'URL' : 'URLs'}
                </p>
                <p className="text-xs text-gray-400">
                  Created {(request.created_at || request.createdAt) ? new Date(request.created_at || request.createdAt).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            ))}
            {vettedSitesRequests.length > 3 && (
              <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                <p className="text-sm text-gray-600">
                  +{vettedSitesRequests.length - 3} more {vettedSitesRequests.length - 3 === 1 ? 'request' : 'requests'}
                </p>
              </div>
            )}
          </div>
          
          {/* Collapsible Request Form */}
          {showRequestForm && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <QuickVettedSitesRequest 
                onSuccess={() => {
                  setShowRequestForm(false);
                  refreshVettedSitesRequests();
                }}
                compact={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        <button
          onClick={() => router.push('/vetted-sites')}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
        >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Database className="h-6 w-6 text-indigo-600" />
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Vetted Sites</h3>
              <p className="text-sm text-gray-600">
                {vettedSitesRequests.length > 0 
                  ? 'Browse qualified sites and manage requests' 
                  : 'Discover high-quality guest post opportunities'}
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
                      Brands
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Links
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {order.clientNames && order.clientNames.length > 0 ? (
                            <div>
                              <span className="font-medium">
                                {order.clientNames.length === 1 ? (
                                  order.clientNames[0]
                                ) : order.clientNames.length === 2 ? (
                                  `${order.clientNames[0]}, ${order.clientNames[1]}`
                                ) : (
                                  `${order.clientNames[0]}, ${order.clientNames[1]} +${order.clientNames.length - 2} ${order.clientNames.length - 2 === 1 ? 'brand' : 'brands'}`
                                )}
                              </span>
                              <div className="text-xs text-gray-500">
                                {order.clientNames.length} {order.clientNames.length === 1 ? 'brand' : 'brands'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No brands</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const stateDisplay = getStateDisplay(order.status, order.state);
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateDisplay.color}`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1">{stateDisplay.label}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {(() => {
                            if (order.status === 'pending_confirmation' || order.status === 'draft') {
                              return <span className="text-gray-500 italic">Pending setup</span>;
                            }
                            if (order.itemCount > 0) {
                              return `${order.itemCount} link${order.itemCount > 1 ? 's' : ''}`;
                            }
                            return <span className="text-gray-500 italic">Configuring</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${(order.completedCount || 0) / (order.itemCount || 1) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {Math.round((order.completedCount || 0) / (order.itemCount || 1) * 100)}%
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {order.completedCount || 0} of {order.itemCount || 0} completed
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(order.totalRetail)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {/* Smart primary action based on status */}
                            {(() => {
                              const stateDisplay = getStateDisplay(order.status, order.state);
                              
                              // Awaiting Payment - show Pay Now button
                              if (order.state === 'payment_pending' || stateDisplay.label === 'Awaiting Payment') {
                                return (
                                  <>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}/invoice`)}
                                      className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      Pay Now
                                    </button>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                      className="text-gray-600 hover:text-gray-800 text-xs"
                                    >
                                      View
                                    </button>
                                  </>
                                );
                              }
                              
                              // Ready for Review - show Review Sites button
                              if (order.state === 'ready_for_review' || stateDisplay.label === 'Ready for Review') {
                                return (
                                  <>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}/review`)}
                                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Review Sites
                                    </button>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                      className="text-gray-600 hover:text-gray-800 text-xs"
                                    >
                                      View
                                    </button>
                                  </>
                                );
                              }
                              
                              // Has invoice - show View Invoice button
                              if (order.state === 'payment_pending' || order.state === 'payment_received') {
                                return (
                                  <>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}/invoice`)}
                                      className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      View Invoice
                                    </button>
                                    <button
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                      className="text-gray-600 hover:text-gray-800 text-xs"
                                    >
                                      Details
                                    </button>
                                  </>
                                );
                              }
                              
                              // Default - show View Order button
                              return (
                                <>
                                  <button
                                    onClick={() => router.push(`/orders/${order.id}`)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
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
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
          </table>
        </div>
      </div>
    </div>);
}

function ConditionalAccountLayout({ user }: { user: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vettedSitesRequests, setVettedSitesRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBasicData();
    }
  }, [user]);

  const loadBasicData = async () => {
    try {
      setLoading(true);
      
      // Load just enough data to check if user is new
      const ordersResponse = await fetch('/api/orders', {
        credentials: 'include',
      });
      
      if (ordersResponse.ok) {
        const { orders: orderData } = await ordersResponse.json();
        setOrders(orderData || []);
      }
      
      const clientResponse = await fetch('/api/accounts/client', {
        credentials: 'include',
      });
      
      if (clientResponse.ok) {
        const { clients: clientData } = await clientResponse.json();
        setClients(clientData || []);
      }
      
      // Load vetted sites requests
      const requestsResponse = await fetch('/api/vetted-sites/requests', {
        credentials: 'include',
      });
      
      if (requestsResponse.ok) {
        const { requests: requestData } = await requestsResponse.json();
        setVettedSitesRequests(requestData || []);
      }
      
    } catch (error) {
      console.error('Error loading basic data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if this is a brand new user (no orders, no brands, no vetted sites requests)
  const isNewUser = orders.length === 0 && clients.length === 0 && vettedSitesRequests.length === 0;

  return (
    <AccountLayout 
      title={`Welcome back, ${user?.name}`}
      subtitle="Get cited by AI and ranked by Google with strategic guest posts"
      showBreadcrumbs={false}
      sidebarContent={!isNewUser ? <SidebarNotifications /> : undefined}
      hideSidebar={isNewUser}
    >
      <AccountDashboardContent user={user} />
    </AccountLayout>
  );
}