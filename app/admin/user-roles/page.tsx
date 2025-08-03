'use client';

import { useState, useEffect } from 'react';
import { Shield, User, AlertTriangle } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  userType: string;
  createdAt: string;
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/user-roles');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/user-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Error updating role');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">User Roles Management</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold">Admin Delete Orders Issue</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Internal users need <code>role: 'admin'</code> to delete non-draft orders. 
          Check if your internal users have the correct role.
        </p>

        <button 
          onClick={fetchUsers} 
          disabled={loading}
          className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Users'}
        </button>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Can Delete Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        user.userType === 'internal' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.userType === 'internal' && user.role === 'admin' ? (
                        <span className="text-green-600 font-medium">✅ Yes (All orders)</span>
                      ) : user.userType === 'internal' ? (
                        <span className="text-amber-600 font-medium">⚠️ Drafts only</span>
                      ) : (
                        <span className="text-gray-500">Draft orders only</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.userType === 'internal' && (
                        <div className="flex gap-2">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => updateUserRole(user.id, 'admin')}
                              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Make Admin
                            </button>
                          )}
                          {user.role === 'admin' && (
                            <button
                              onClick={() => updateUserRole(user.id, 'user')}
                              className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                            >
                              Remove Admin
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}