'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Mail,
  User,
  Building,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  targetTable: string;
  token: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  createdByEmail: string;
  createdAt: string;
}

export default function AccountInvitationsPage() {
  return (
    <AuthWrapper>
      <Header />
      <AccountInvitationsContent />
    </AuthWrapper>
  );
}

function AccountInvitationsContent() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showNewForm, setShowNewForm] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    contactName: '',
    companyName: '',
    clientId: ''
  });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations?type=accounts');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/invitations/send-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation sent successfully!' });
        setFormData({ email: '', contactName: '', companyName: '', clientId: '' });
        setShowNewForm(false);
        loadInvitations();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send invitation' });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (invitation: Invitation) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/register/account?token=${invitation.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setMessage({ type: 'success', text: 'Invitation link copied to clipboard!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const revokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const response = await fetch(`/api/invitations/${id}/revoke`, {
        method: 'POST'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation revoked' });
        loadInvitations();
      }
    } catch (error) {
      console.error('Error revoking invitation:', error);
      setMessage({ type: 'error', text: 'Failed to revoke invitation' });
    }
  };

  const getInvitationStatus = (invitation: Invitation): { 
    status: string; 
    color: string; 
    icon: React.ReactNode 
  } => {
    if (invitation.usedAt) {
      return { 
        status: 'Used', 
        color: 'text-green-600 bg-green-50',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (invitation.revokedAt) {
      return { 
        status: 'Revoked', 
        color: 'text-red-600 bg-red-50',
        icon: <XCircle className="h-4 w-4" />
      };
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      return { 
        status: 'Expired', 
        color: 'text-gray-600 bg-gray-50',
        icon: <Clock className="h-4 w-4" />
      };
    }
    return { 
      status: 'Pending', 
      color: 'text-blue-600 bg-blue-50',
      icon: <Mail className="h-4 w-4" />
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Invitations</h1>
            <p className="text-gray-600 mt-2">
              Manage invitations for customer accounts
            </p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Send Invitation
          </button>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-start ${
            message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* New Invitation Form */}
        {showNewForm && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Send New Invitation</h2>
            <form onSubmit={sendInvitation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="customer@example.com"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="John Smith"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Acme Corporation"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invitations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Invitations</h2>
            <button
              onClick={loadInvitations}
              className="text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invitations sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => {
                    const status = getInvitationStatus(invitation);
                    return (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invitation.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                Sent {formatDistanceToNow(new Date(invitation.createdAt))} ago
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon}
                            <span className="ml-1">{status.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invitation.createdByEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {status.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => copyInviteLink(invitation)}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Copy invitation link"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => revokeInvitation(invitation.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Revoke invitation"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {status.status === 'Used' && (
                              <a
                                href={`/accounts/${invitation.email}`}
                                className="text-gray-600 hover:text-gray-700"
                                title="View account"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}