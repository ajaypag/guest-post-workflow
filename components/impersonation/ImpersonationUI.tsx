/**
 * Impersonation UI Component
 * 
 * Main interface for admin users to search and impersonate users.
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Shield, Search, User, Building2, Clock, ChevronLeft, ChevronRight, 
  AlertTriangle, LogIn, History, CheckCircle, XCircle 
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  status: string;
  last_login?: Date | null;
  created_at: Date;
  userType: 'account' | 'publisher';
}

interface ImpersonationLog {
  id: string;
  target_name: string;
  target_email: string;
  target_user_type: string;
  started_at: Date;
  ended_at?: Date;
  reason: string;
  status: string;
  actions_count: number;
}

interface Props {
  users: User[];
  recentLogs: ImpersonationLog[];
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  userType: string;
  adminSession: any;
}

export default function ImpersonationUI({
  users,
  recentLogs,
  currentPage,
  totalPages,
  searchQuery,
  userType,
  adminSession,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    const params = new URLSearchParams(searchParams);
    params.set('search', search);
    params.set('page', '1');
    router.push(`/admin/impersonate?${params.toString()}`);
  };

  const handleTypeChange = (newType: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('type', newType);
    params.set('page', '1');
    router.push(`/admin/impersonate?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/admin/impersonate?${params.toString()}`);
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser || !reason.trim() || reason.trim().length < 10) {
      setError('Please select a user and provide a detailed reason (min 10 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          targetUserType: selectedUser.userType,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to home page to start impersonation
        window.location.href = '/';
      } else {
        setError(data.error || 'Failed to start impersonation');
        setLoading(false);
      }
    } catch (err) {
      setError('An error occurred while starting impersonation');
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Impersonation</h1>
              <p className="text-sm text-gray-500">
                Logged in as: {adminSession.currentUser.name} ({adminSession.currentUser.email})
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important Security Notice</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All impersonation sessions are logged for security purposes</li>
                  <li>You cannot access billing, change passwords, or delete accounts while impersonating</li>
                  <li>Sessions automatically expire after 2 hours</li>
                  <li>Only use for legitimate support and debugging purposes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* User Type Selector */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => handleTypeChange('account')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                userType === 'account'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building2 className="w-4 h-4 inline-block mr-2" />
              Account Users
            </button>
            <button
              onClick={() => handleTypeChange('publisher')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                userType === 'publisher'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="w-4 h-4 inline-block mr-2" />
              Publishers
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder={`Search ${userType === 'account' ? 'account users' : 'publishers'} by name or email...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Select User to Impersonate
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No users found matching your search criteria
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.company_name && (
                            <p className="text-sm text-gray-500">{user.company_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {user.userType}
                        </span>
                      </div>
                      {user.last_login && (
                        <p className="text-gray-500 mt-1">
                          Last login: {formatDate(user.last_login)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Impersonation Form */}
        {selectedUser && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Start Impersonation
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected User:</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <p className="text-sm text-gray-500">Type: {selectedUser.userType}</p>
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Impersonation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a detailed reason for this impersonation (e.g., 'Customer support ticket #12345 - User reporting issue with order creation')"
                  minLength={10}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 characters (minimum 10)
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleStartImpersonation}
                disabled={loading || !reason.trim() || reason.trim().length < 10}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting Impersonation...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Start Impersonation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Recent Impersonation History */}
        {recentLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Your Recent Impersonations</span>
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recentLogs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {log.target_name} ({log.target_email})
                      </p>
                      <p className="text-sm text-gray-500">
                        Type: {log.target_user_type} • Reason: {log.reason.substring(0, 100)}
                        {log.reason.length > 100 ? '...' : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        Started: {formatDate(log.started_at)}
                        {log.ended_at && ` • Ended: ${formatDate(log.ended_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                        log.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : log.status === 'ended'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'active' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{log.status}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {log.actions_count} actions
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}