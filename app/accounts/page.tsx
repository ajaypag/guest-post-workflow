'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InternalPageWrapper from '../../components/InternalPageWrapper';
import Header from '../../components/Header';
import { UserCheck, Eye, Key, Wand2, CheckCircle, Ban, ExternalLink, Building2 } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  status: 'active' | 'pending' | 'suspended';
  orderCount?: number;
  totalRevenue?: number;
  primaryClient?: {
    id: string;
    name: string;
    website: string;
  };
  canUseAiKeywords?: boolean;
  canUseAiDescriptions?: boolean;
  canUseAiContentGeneration?: boolean;
}

export default function WorkingAccountsPage() {
  console.log('🔍 WorkingAccountsPage - Component is rendering!');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch('/api/accounts', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Accounts loaded:', data);
          setAccounts(data.accounts || []);
        } else {
          console.error('❌ Failed to load accounts:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const startImpersonation = async (account: Account) => {
    try {
      console.log('🎭 Starting impersonation for:', account.email);
      
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: account.id,
          targetUserType: 'account',
          reason: `Admin assistance requested for ${account.companyName}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Impersonation started:', result);
        alert(`Successfully started impersonating ${account.email}. Redirecting to account dashboard...`);
        
        // Dispatch custom event to trigger session state refetch
        window.dispatchEvent(new CustomEvent('impersonationStart'));
        
        // Redirect to account dashboard after short delay
        setTimeout(() => {
          router.push('/account/dashboard');
        }, 2000);
      } else {
        const error = await response.json();
        console.error('❌ Impersonation failed:', error);
        alert(`Failed to start impersonation: ${error.error}`);
      }
    } catch (error) {
      console.error('❌ Error during impersonation:', error);
      alert('Error starting impersonation. Please try again.');
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
        setAccounts(accounts.map(acc => 
          acc.id === accountId ? { ...acc, status: newStatus as 'active' | 'pending' | 'suspended' } : acc
        ));
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

  return (
    <InternalPageWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <Ban className="w-5 h-5 mr-2" />
                )}
                <span>{notification.message}</span>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Management</h1>
            <p className="text-lg text-gray-600">Manage external accounts and impersonation</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading accounts...</span>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {account.contactName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.companyName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.primaryClient ? (
                          <a
                            href={`/clients/${account.primaryClient.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Building2 className="w-3 h-3 mr-1" />
                            {account.primaryClient.name}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">No client</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          account.status === 'active' ? 'bg-green-100 text-green-800' :
                          account.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.orderCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${((account.totalRevenue || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          {account.primaryClient && (
                            <a
                              href={`/clients/${account.primaryClient.id}`}
                              className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              title="View Client"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
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
                            onClick={() => alert('AI Permissions modal not implemented yet')}
                            className="text-purple-600 hover:text-purple-900"
                            title="AI Permissions"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          
                          {/* Impersonation */}
                          <button
                            onClick={() => startImpersonation(account)}
                            className="text-green-600 hover:text-green-900"
                            title="Impersonate User"
                          >
                            <UserCheck className="w-4 h-4" />
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
              
              {accounts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No accounts found.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </InternalPageWrapper>
  );
}