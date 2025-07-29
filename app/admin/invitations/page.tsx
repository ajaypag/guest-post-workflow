'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Plus, Trash2, RotateCcw, Clock, CheckCircle, XCircle, Send, Users } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { type AuthSession } from '@/lib/auth';
import { sessionStorage } from '@/lib/userStorage';
import { format } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  userType: 'internal' | 'advertiser' | 'publisher';
  role: 'user' | 'admin';
  token: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  revokedAt?: string;
  createdByEmail: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export default function InvitationsManagement() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    userType: 'internal' as 'internal' | 'advertiser' | 'publisher',
    role: 'user' as 'user' | 'admin'
  });

  const loadData = useCallback(async () => {
    try {
      const session = sessionStorage.getSession();
      setCurrentSession(session);
      
      // Check if user is admin
      if (!session || session.role !== 'admin') {
        router.push('/');
        return;
      }
      
      // Load all invitations
      const response = await fetch('/api/admin/invitations');
      if (response.ok) {
        const { invitations } = await response.json();
        setInvitations(invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setCreating(true);
    setFeedback({ type: 'info', message: 'Creating invitation and sending email...' });
    
    try {
      console.log('[InvitationUI] Starting invitation creation for:', formData.email);
      
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('[InvitationUI] API Response:', { 
        status: response.status, 
        ok: response.ok, 
        result 
      });

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: result.message || 'Invitation created successfully!',
          details: `Email sent to ${formData.email}. They will receive login instructions.`
        });
        
        await loadData();
        setFormData({ email: '', userType: 'internal', role: 'user' });
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setFeedback(null);
          setShowCreateForm(false);
        }, 5000);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to create invitation',
          details: result.details || 'Please check the server logs for more information.'
        });
      }
    } catch (error) {
      console.error('[InvitationUI] Network error creating invitation:', error);
      setFeedback({
        type: 'error',
        message: 'Network error creating invitation',
        details: 'Please check your connection and try again.'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      console.log('[InvitationUI] Starting invitation resend for ID:', invitationId);
      
      const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      const result = await response.json();
      console.log('[InvitationUI] Resend API Response:', { 
        status: response.status, 
        ok: response.ok, 
        result 
      });

      if (response.ok) {
        await loadData();
        setFeedback({
          type: 'success',
          message: result.message || 'Invitation resent successfully!',
          details: 'The user will receive a new invitation email with updated expiration.'
        });
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to resend invitation',
          details: result.details || 'Please check the server logs for more information.'
        });
      }
    } catch (error) {
      console.error('[InvitationUI] Network error resending invitation:', error);
      setFeedback({
        type: 'error',
        message: 'Network error resending invitation',
        details: 'Please check your connection and try again.'
      });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (confirm('Are you sure you want to revoke this invitation? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/admin/invitations/${invitationId}/revoke`, {
          method: 'POST',
        });

        if (response.ok) {
          await loadData();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to revoke invitation');
        }
      } catch (error) {
        console.error('Error revoking invitation:', error);
        alert('Failed to revoke invitation');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'revoked':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'revoked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'internal':
        return 'bg-blue-100 text-blue-800';
      case 'advertiser':
        return 'bg-green-100 text-green-800';
      case 'publisher':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading invitations...</p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (!currentSession || currentSession.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length;
  const expiredCount = invitations.filter(inv => inv.status === 'expired').length;
  const revokedCount = invitations.filter(inv => inv.status === 'revoked').length;

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Link>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              View Users
            </Link>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl text-white p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <Mail className="w-8 h-8 mr-3" />
                  Invitation Management
                </h1>
                <p className="text-purple-100">Manage user invitations and access control</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{invitations.length}</div>
                <div className="text-purple-100">Total Invitations</div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                  <div className="text-gray-600 text-sm">Pending</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{acceptedCount}</div>
                  <div className="text-gray-600 text-sm">Accepted</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{expiredCount}</div>
                  <div className="text-gray-600 text-sm">Expired</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                  <XCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{revokedCount}</div>
                  <div className="text-gray-600 text-sm">Revoked</div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Invitation Form */}
          {showCreateForm && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Invitation</h2>
              
              {/* Feedback Message */}
              {feedback && (
                <div className={`p-4 rounded-lg border mb-4 ${
                  feedback.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : feedback.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {feedback.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                      {feedback.type === 'info' && <Clock className="w-5 h-5 text-blue-600 animate-spin" />}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">{feedback.message}</h3>
                      {feedback.details && (
                        <p className="mt-1 text-sm opacity-75">{feedback.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                      placeholder="user@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="internal">Internal</option>
                      <option value="advertiser">Advertiser</option>
                      <option value="publisher">Publisher</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <Clock className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ email: '', userType: 'internal', role: 'user' });
                    }}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Invitation Button */}
          {!showCreateForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Invitation
              </button>
            </div>
          )}

          {/* Invitations Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Invitations</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No invitations found. Create your first invitation to get started.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((invitation) => (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(invitation.userType)}`}>
                            {invitation.userType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invitation.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {invitation.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                            {getStatusIcon(invitation.status)}
                            <span className="ml-1">{invitation.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {invitation.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                  title="Resend invitation"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRevokeInvitation(invitation.id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Revoke invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {invitation.status === 'expired' && (
                              <button
                                onClick={() => handleResendInvitation(invitation.id)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Resend invitation"
                              >
                                <RotateCcw className="w-4 h-4" />
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
    </AuthWrapper>
  );
}