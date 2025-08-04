'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InternalPageWrapper from '@/components/InternalPageWrapper';
import Header from '@/components/Header';
import { 
  Users, 
  Building2, 
  Mail, 
  Calendar,
  ExternalLink,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Key,
  AlertCircle,
  Wand2
} from 'lucide-react';
import AIPermissionsModal from '@/components/AIPermissionsModal';

interface Account {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  primaryClient?: {
    id: string;
    name: string;
    website: string;
  };
  orderCount?: number;
  totalRevenue?: number;
  canUseAiKeywords?: boolean;
  canUseAiDescriptions?: boolean;
  canUseAiContentGeneration?: boolean;
}

function AccountsPageContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'revenue'>('recent');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<Account | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountStatus = async (accountId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadAccounts();
        showNotification('success', `Account status updated to ${newStatus}`);
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating account status:', error);
      showNotification('error', 'Failed to update account status');
    }
  };

  const resetPassword = async (accountId: string, accountEmail: string) => {
    if (!confirm(`Send password reset email to ${accountEmail}?`)) {
      return;
    }

    setResettingPassword(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        showNotification('success', 'Password reset email sent successfully');
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showNotification('error', 'Failed to reset password');
    } finally {
      setResettingPassword(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Filter and sort accounts
  const filteredAccounts = accounts
    .filter(account => {
      const matchesSearch = searchTerm === '' || 
        account.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.companyName.localeCompare(b.companyName);
        case 'revenue':
          return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Notification */}
          {notification && (
            <div className={`mb-4 p-4 rounded-md ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                <span>{notification.message}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-600 mt-1">
              Manage accounts and access their client data
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, company, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Company Name</option>
                  <option value="revenue">Total Revenue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="w-10 h-10 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Accounts</p>
                  <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="w-10 h-10 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {accounts.filter(a => a.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-10 h-10 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {accounts.filter(a => a.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Ban className="w-10 h-10 text-red-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Suspended</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {accounts.filter(a => a.status === 'suspended').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Advertisers Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Features
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {account.contactName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {account.companyName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {account.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.primaryClient ? (
                        <Link
                          href={`/clients/${account.primaryClient.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Building2 className="w-3 h-3 mr-1" />
                          {account.primaryClient.name}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">No client</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(account.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {account.orderCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.totalRevenue ? formatCurrency(account.totalRevenue) : '$0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {(account.canUseAiKeywords || account.canUseAiDescriptions || account.canUseAiContentGeneration) ? (
                          <>
                            {account.canUseAiKeywords && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="AI Keywords">
                                K
                              </span>
                            )}
                            {account.canUseAiDescriptions && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title="AI Descriptions">
                                D
                              </span>
                            )}
                            {account.canUseAiContentGeneration && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="AI Content">
                                C
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {account.lastLoginAt ? (
                          <>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(account.lastLoginAt)}
                          </>
                        ) : (
                          'Never'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {account.primaryClient && (
                          <Link
                            href={`/clients/${account.primaryClient.id}`}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            title="View Client"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {/* Password Reset */}
                        <button
                          onClick={() => resetPassword(account.id, account.email)}
                          disabled={resettingPassword === account.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Reset Password"
                        >
                          {resettingPassword === account.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <Key className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* AI Permissions */}
                        <button
                          onClick={() => setShowPermissionsModal(account)}
                          className="text-purple-600 hover:text-purple-900"
                          title="AI Permissions"
                        >
                          <Wand2 className="w-4 h-4" />
                        </button>
                        
                        {/* Status Actions */}
                        {account.status === 'pending' && (
                          <button
                            onClick={() => updateAccountStatus(account.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {account.status === 'active' && (
                          <button
                            onClick={() => updateAccountStatus(account.id, 'suspended')}
                            className="text-red-600 hover:text-red-900"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        
                        {account.status === 'suspended' && (
                          <button
                            onClick={() => updateAccountStatus(account.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="Reactivate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAccounts.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No accounts found</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Permissions Modal */}
        {showPermissionsModal && (
          <AIPermissionsModal
            account={showPermissionsModal}
            onClose={() => setShowPermissionsModal(null)}
            onUpdate={() => {
              loadAccounts();
              setShowPermissionsModal(null);
            }}
          />
        )}
      </div>
  );
}

export default function AccountsPage() {
  return (
    <InternalPageWrapper requireAdmin={true}>
      <Suspense fallback={<div>Loading...</div>}>
        <AccountsPageContent />
      </Suspense>
    </InternalPageWrapper>
  );
}