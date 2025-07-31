'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Plus, Trash2, Edit, Shield, User, Mail, Calendar, Activity } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { User as UserType } from '@/types/user';
import { type AuthSession } from '@/lib/auth';
import { userStorage, sessionStorage } from '@/lib/userStorage';
import { storage } from '@/lib/storage';
import { format } from 'date-fns';

export default function UsersManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>([]);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowCounts, setWorkflowCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newUserData = {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role,
        isActive: true
      };

      await userStorage.createUser(newUserData);
      await loadData();
      setShowAddUser(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: Partial<UserType> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        ...(formData.password && { password: formData.password })
      };

      await userStorage.updateUser(editingUser.id, updateData);
      await loadData();
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'user' });
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

  const getUserWorkflowCount = (userId: string) => {
    return workflowCounts[userId] || 0;
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowAddUser(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowAddUser(false);
    setFormData({ name: '', email: '', password: '', role: 'user' });
  };

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
                <p className="text-blue-100">Manage system users and permissions</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-blue-100">Total Users</div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.filter(u => u.isActive).length}</div>
                  <div className="text-gray-600 text-sm">Active Users</div>
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
                  <div className="text-gray-600 text-sm">Inactive Users</div>
                </div>
              </div>
            </div>
          </div>

          {/* Add/Edit User Form */}
          {(showAddUser || editingUser) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              
              <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={!editingUser}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
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
                    {editingUser ? 'Update User' : 'Add User'}
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

          {/* Add User Button */}
          {!showAddUser && !editingUser && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddUser(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New User
              </button>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            </div>
            
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
                  {users.map((user) => (
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
                          (user as any).userType === 'account' ? 'bg-green-100 text-green-800' :
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
                        {getUserWorkflowCount(user.id)} workflows
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}