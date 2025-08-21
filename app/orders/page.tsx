'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, DollarSign, Clock, CheckCircle2, Activity, X } from 'lucide-react';
import { OrdersTableMultiClient } from '@/components/OrdersTableMultiClient';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import Link from 'next/link';

interface Account {
  id: string;
  email: string;
  contactName?: string;
  companyName?: string;
}

interface Order {
  id: string;
  clientId: string;
  accountId?: string;
  account?: Account;
  status: string;
  state?: string;
  totalLinks?: number;
  subtotalRetail: number;
  discountPercent: string;
  discountAmount: number;
  totalRetail: number;
  totalWholesale: number;
  profitMargin: number;
  includesClientReview: boolean;
  clientReviewFee: number;
  rushDelivery: boolean;
  rushFee: number;
  shareToken?: string;
  shareExpiresAt?: string;
  approvedAt?: string;
  invoicedAt?: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdBy: string;
  assignedTo?: string;
  internalNotes?: string;
  accountNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  orderGroups?: any[];
  clientNames?: string[]; // New field for client/brand names from line items
}

function OrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [userType, setUserType] = useState<string>('');
  const { refreshNotifications } = useNotifications();

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_confirmation', label: 'Pending Confirmation' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'approved', label: 'Approved' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'paid', label: 'Paid' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
  ];

  useEffect(() => {
    const initAuth = async () => {
      const session = AuthService.getSession();
      setUserType(session?.userType || '');
    };
    initAuth();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      // Refresh notifications when orders are fetched
      refreshNotifications();
    }
  };

  useEffect(() => {
    if (userType) {
      fetchOrders();
    }
  }, [userType, statusFilter]);

  // Apply date range filter
  const getFilteredByDate = (orders: Order[]) => {
    if (dateRange === 'all') return orders;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      
      switch (dateRange) {
        case 'today':
          return orderDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;
        case 'quarter':
          const quarterAgo = new Date(today);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          return orderDate >= quarterAgo;
        default:
          return true;
      }
    });
  };

  const filteredOrders = getFilteredByDate(orders).filter(order => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const accountName = order.account?.contactName || order.account?.companyName || '';
      const accountEmail = order.account?.email || '';
      const accountCompany = order.account?.companyName || '';
      
      return (
        accountName.toLowerCase().includes(searchLower) ||
        accountEmail.toLowerCase().includes(searchLower) ||
        accountCompany.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_confirmation': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-indigo-100 text-indigo-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const orderStats = {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    pendingConfirmation: orders.filter(o => o.status === 'pending_confirmation').length,
    pending: orders.filter(o => o.status === 'pending_approval').length,
    active: orders.filter(o => ['confirmed', 'approved', 'paid', 'in_progress'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, order) => sum + order.totalRetail, 0),
  };

  if (!userType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userType === 'account' ? 'My Orders' : 'Orders'}
            </h1>
            <p className="text-gray-600 mt-1">
              {userType === 'account' 
                ? 'Track your guest post campaigns and monitor progress'
                : 'Manage guest post orders and track their progress'}
            </p>
          </div>
          {userType === 'internal' ? (
            <Link href="/orders/new">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium">
                <Plus className="h-4 w-4" />
                New Order
              </button>
            </Link>
          ) : (
            // For account users: Use quick-start only if they have no orders yet
            <Link href={orderStats.total === 0 ? "/get-started" : "/orders/new"}>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium">
                <Plus className="h-4 w-4" />
                {orderStats.total === 0 ? 'Get Started' : 'Create Order'}
              </button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group cursor-pointer ${
              statusFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-blue-100' : 'bg-blue-50 group-hover:bg-blue-100'
              }`}>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{orderStats.total}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setStatusFilter('draft')}
            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group cursor-pointer ${
              statusFilter === 'draft' ? 'border-gray-500 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg transition-colors ${
                statusFilter === 'draft' ? 'bg-gray-100' : 'bg-gray-50 group-hover:bg-gray-100'
              }`}>
                <FileText className="h-5 w-5 text-gray-500" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Draft</p>
                <p className="text-xl font-bold text-gray-900">{orderStats.draft}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setStatusFilter('pending_confirmation')}
            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group cursor-pointer ${
              statusFilter === 'pending_confirmation' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg transition-colors ${
                statusFilter === 'pending_confirmation' ? 'bg-yellow-100' : 'bg-yellow-50 group-hover:bg-yellow-100'
              }`}>
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-gray-900">{orderStats.pending}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setStatusFilter('in_progress')}
            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group cursor-pointer ${
              statusFilter === 'in_progress' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg transition-colors ${
                statusFilter === 'in_progress' ? 'bg-orange-100' : 'bg-orange-50 group-hover:bg-orange-100'
              }`}>
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Active</p>
                <p className="text-xl font-bold text-gray-900">{orderStats.active}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setStatusFilter('completed')}
            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all p-4 text-left group cursor-pointer ${
              statusFilter === 'completed' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg transition-colors ${
                statusFilter === 'completed' ? 'bg-green-100' : 'bg-green-50 group-hover:bg-green-100'
              }`}>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Completed</p>
                <p className="text-xl font-bold text-gray-900">{orderStats.completed}</p>
              </div>
            </div>
          </button>

        </div>

        {/* Active Filters Display */}
        {(searchTerm || statusFilter !== 'all' || dateRange !== 'all') && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1.5 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Status: {statusOptions.find(o => o.value === statusFilter)?.label}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="ml-1.5 hover:text-purple-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {dateRange !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Date: {dateRangeOptions.find(o => o.value === dateRange)?.label}
                <button
                  onClick={() => setDateRange('all')}
                  className="ml-1.5 hover:text-green-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateRange('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 lg:max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by account name, email, company, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {filteredOrders.length !== orders.length && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      )}

      {/* Orders Table */}
      <OrdersTableMultiClient
        orders={filteredOrders}
        loading={loading}
        onRefresh={fetchOrders}
        getStatusColor={getStatusColor}
        formatCurrency={formatCurrency}
        isInternal={userType === 'internal'}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthWrapper>
      <Header />
      <OrdersPageContent />
    </AuthWrapper>
  );
}