'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Users, Plus, Trash2, Edit, Shield, User, Mail, Calendar, 
  Activity, Send, RotateCcw, Clock, CheckCircle, XCircle, ChevronRight,
  AlertCircle
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { User as UserType } from '@/types/user';
import { type AuthSession } from '@/lib/auth';
import { userStorage, sessionStorage } from '@/lib/userStorage';
import { storage } from '@/lib/storage';
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

export default function UsersManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowCounts, setWorkflowCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);
  
  const [inviteData, setInviteData] = useState({
    email: '',
    userType: 'internal' as 'internal' | 'advertiser' | 'publisher',
    role: 'user' as 'user' | 'admin'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
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
      
      // Load all users
      const allUsers = await userStorage.getAllUsers();
      setUsers(allUsers);
      
      // Load workflow counts for each user
      const workflows = await storage.getAllWorkflows();
      const counts: Record<string, number> = {};
      allUsers.forEach(user => {
        counts[user.id] = workflows.filter(w => w.createdByEmail === user.email).length;
      });
      setWorkflowCounts(counts);
      
      // Load invitations
      try {
        const response = await fetch('/api/admin/invitations');
        if (response.ok) {
          const { invitations } = await response.json();
          setInvitations(invitations);
        }
      } catch (error) {
        console.error('Error loading invitations:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setInviting(true);
    setFeedback({ type: 'info', message: 'Sending invitation...' });
    
    try {
      console.log('[UsersPage] Creating invitation for:', inviteData.email);
      
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      });

      const result = await response.json();
      console.log('[UsersPage] API Response:', { 
        status: response.status, 
        ok: response.ok, 
        result 
      });

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: result.message || 'Invitation sent successfully!',
          details: `Email sent to ${inviteData.email}. They will receive login instructions.`
        });
        
        await loadData();
        setInviteData({ email: '', userType: 'internal', role: 'user' });
        
        // Auto-hide success message and close form after 3 seconds
        setTimeout(() => {
          setFeedback(null);
          setShowInviteForm(false);
        }, 3000);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to send invitation',
          details: result.details || 'Please check the server logs for more information.'
        });
      }
    } catch (error) {
      console.error('[UsersPage] Network error creating invitation:', error);
      setFeedback({
        type: 'error',
        message: 'Network error sending invitation',
        details: 'Please check your connection and try again.'
      });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: 'Invitation resent successfully!',
          details: 'The user will receive a new invitation email.'
        });
        await loadData();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to resend invitation',
        });
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      setFeedback({
        type: 'error',
        message: 'Failed to resend invitation',
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

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: Partial<UserType> = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
      };

      await userStorage.updateUser(editingUser.id, updateData);
      await loadData();
      setEditingUser(null);
      setEditFormData({ name: '', email: '', role: 'user' });
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentSession?.userId) {
      alert('You cannot delete your own account');
      return;
    }
    
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await userStorage.deleteUser(userId);
        await loadData();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const toggleUserStatus = async (userId: string) => {
    if (userId === currentSession?.userId) {
      alert('You cannot deactivate your own account');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      try {
        await userStorage.updateUser(userId, { isActive: !user.isActive });
        await loadData();
      } catch (error) {
        console.error('Error updating user status:', error);
        alert('Failed to update user status');
      }
    }
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setShowInviteForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowInviteForm(false);
    setEditFormData({ name: '', email: '', role: 'user' });
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const activeUsers = users.filter(u => u.isActive);

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (!currentSession || currentSession.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Activity className="w-4 h-4 mr-2" />
              View Analytics
            </Link>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <Users className="w-8 h-8 mr-3" />
                  User Management
                </h1>
                <p className="text-blue-100">Manage system users and invitations</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{users.length + pendingInvitations.length}</div>
                <div className="text-blue-100">Total Users & Invitations</div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{activeUsers.length}</div>
                  <div className="text-gray-600 text-sm">Active Users</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{pendingInvitations.length}</div>
                  <div className="text-gray-600 text-sm">Pending Invites</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="text-gray-600 text-sm">Administrators</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{Object.values(workflowCounts).reduce((a, b) => a + b, 0)}</div>
                  <div className="text-gray-600 text-sm">Total Workflows</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                  <User className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.filter(u => !u.isActive).length}</div>
                  <div className="text-gray-600 text-sm">Inactive</div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`mb-6 p-4 rounded-lg border ${
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

          {/* Invite User Form */}
          {showInviteForm && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Invite New User
              </h2>
              
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                      placeholder="user@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select
                      value={inviteData.userType}
                      onChange={(e) => setInviteData({ ...inviteData, userType: e.target.value as any })}
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
                      value={inviteData.role}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
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
                    disabled={inviting}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <>
                        <Clock className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 inline-block mr-2" />
                        Send Invitation
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit User Form */}
          {editingUser && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Edit User
              </h2>
              
              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'user' | 'admin' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Invite User Button */}
          {!showInviteForm && !editingUser && (
            <div className="mb-6">
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-colors"
              >
                <Mail className="w-5 h-5 mr-2" />
                Invite User
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active Users ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'pending'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pending Invitations ({pendingInvitations.length})
                </button>
              </nav>
            </div>

            {/* Active Users Tab */}
            {activeTab === 'active' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No users yet. Send invitations to add users.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (user as any).userType === 'internal' ? 'bg-blue-100 text-blue-800' :
                              (user as any).userType === 'advertiser' ? 'bg-green-100 text-green-800' :
                              (user as any).userType === 'publisher' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {(user as any).userType || 'internal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {user.role === 'admin' ? 'Administrator' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {workflowCounts[user.id] || 0} workflows
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(user.createdAt), 'MMM d, yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user.id)}
                                disabled={user.id === currentSession?.userId}
                                className={`p-1 rounded ${
                                  user.id === currentSession?.userId 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : user.isActive 
                                    ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' 
                                    : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                }`}
                                title={user.isActive ? 'Deactivate user' : 'Activate user'}
                              >
                                <User className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentSession?.userId}
                                className={`p-1 rounded ${
                                  user.id === currentSession?.userId 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                }`}
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pending Invitations Tab */}
            {activeTab === 'pending' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingInvitations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No pending invitations. Click "Invite User" to send an invitation.
                        </td>
                      </tr>
                    ) : (
                      pendingInvitations.map((invitation) => (
                        <tr key={invitation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invitation.userType === 'internal' ? 'bg-blue-100 text-blue-800' :
                              invitation.userType === 'advertiser' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
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
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}