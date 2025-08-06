'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  ArrowLeft, User, Package, Mail, Calendar, 
  DollarSign, CheckCircle, AlertCircle, Loader2,
  ExternalLink, UserPlus, Trash2
} from 'lucide-react';

interface ProvisionalAccount {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  orderCount: number;
  totalOrderValue: number;
  createdAt: string;
  metadata: {
    createdBy?: string;
    createdByEmail?: string;
    createdAt?: string;
    provisionalNotes?: string;
    originalEmail?: string | null;
    claimable?: boolean;
  };
  isClaimable: boolean;
}

export default function ProvisionalAccountsPage() {
  const router = useRouter();
  const session = AuthService.getSession();
  
  const [accounts, setAccounts] = useState<ProvisionalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<ProvisionalAccount | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);
  
  // Conversion form state
  const [convertEmail, setConvertEmail] = useState('');
  const [convertName, setConvertName] = useState('');
  const [convertCompany, setConvertCompany] = useState('');
  const [convertPassword, setConvertPassword] = useState('');

  useEffect(() => {
    if (!session || session.userType !== 'internal') {
      router.push('/');
      return;
    }
    
    loadProvisionalAccounts();
  }, [session, router]);

  const loadProvisionalAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounts/provisional', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load provisional accounts');
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error: any) {
      console.error('Error loading provisional accounts:', error);
      setError(error.message || 'Failed to load provisional accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = (account: ProvisionalAccount) => {
    setSelectedAccount(account);
    setConvertEmail(account.metadata.originalEmail || '');
    setConvertName(account.contactName);
    setConvertCompany(account.companyName);
    setConvertPassword('');
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async () => {
    if (!selectedAccount) return;
    
    try {
      setConverting(true);
      
      const response = await fetch('/api/accounts/provisional/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provisionalAccountId: selectedAccount.id,
          email: convertEmail,
          password: convertPassword,
          contactName: convertName,
          companyName: convertCompany
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to convert account');
      }
      
      const result = await response.json();
      
      // Refresh the list
      await loadProvisionalAccounts();
      setShowConvertModal(false);
      setSelectedAccount(null);
      
      // Show success message
      setError('');
      alert(`Account successfully converted! ${result.ordersTransferred} order(s) transferred.`);
      
    } catch (error: any) {
      console.error('Error converting account:', error);
      setError(error.message || 'Failed to convert account');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this provisional account? Any associated orders will be orphaned.')) {
      return;
    }
    
    // Note: Delete endpoint not implemented yet
    alert('Delete functionality not yet implemented');
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Provisional Accounts</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage accounts created before client signup
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{accounts.length} provisional accounts</span>
                <span>•</span>
                <span>
                  {formatCurrency(accounts.reduce((sum, acc) => sum + acc.totalOrderValue, 0))} total value
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Provisional Accounts</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Created automatically when internal users create orders without selecting an account</li>
                <li>• Can be claimed by clients during signup if email/company matches</li>
                <li>• Multiple orders can be associated with a single provisional account</li>
                <li>• Convert to active accounts when client details are known</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Provisional Accounts</h3>
              <p className="text-gray-600">
                Provisional accounts will appear here when orders are created without assigned accounts.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accounts.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{account.companyName}</p>
                          <p className="text-sm text-gray-600">{account.contactName}</p>
                          {account.metadata.originalEmail && (
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              {account.metadata.originalEmail}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{account.orderCount} orders</p>
                          <p className="text-sm text-gray-600">{formatCurrency(account.totalOrderValue)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(account.createdAt).toLocaleDateString()}
                          </p>
                          {account.metadata.createdByEmail && (
                            <p className="text-xs text-gray-500">
                              by {account.metadata.createdByEmail}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {account.isClaimable ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Claimable
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Pending Info
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="View account"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleConvert(account)}
                            className="text-green-600 hover:text-green-800"
                            title="Convert to active account"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Convert Modal */}
        {showConvertModal && selectedAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Convert to Active Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={convertEmail}
                    onChange={(e) => setConvertEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="client@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={convertName}
                    onChange={(e) => setConvertName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={convertCompany}
                    onChange={(e) => setConvertCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={convertPassword}
                    onChange={(e) => setConvertPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Set initial password"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The client will use this password to log in
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>This will:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Convert this to an active account</li>
                  <li>• Transfer {selectedAccount.orderCount} order(s) to the account</li>
                  <li>• Allow the client to log in with the provided credentials</li>
                </ul>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConvertModal(false)}
                  disabled={converting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertSubmit}
                  disabled={converting || !convertEmail || !convertPassword || !convertName || !convertCompany}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {converting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Convert Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}