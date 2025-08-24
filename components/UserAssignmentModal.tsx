'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Check, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string) => void;
  title?: string;
  loading?: boolean;
}

export function UserAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  title = "Assign Workflows To User",
  loading = false
}: UserAssignmentModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to load users');
      
      const data = await response.json();
      console.log('API response:', data); // Debug log
      // Handle API response format - data might be { users: [...] } or directly [...]
      const usersArray = data.users || data;
      // Filter to only show active internal users
      const internalUsers = usersArray.filter((user: User) => 
        user.role !== 'inactive' && user.email && user.name
      );
      setUsers(internalUsers);
      
      // Pre-select first user if available
      if (internalUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(internalUsers[0].id);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssign = () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }
    onAssign(selectedUserId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users available for assignment
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a user to assign all workflows to:
              </label>
              <div className="max-h-96 overflow-y-auto space-y-1 border rounded-lg p-2">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-blue-50 border-blue-500 border'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={user.id}
                      checked={selectedUserId === user.id}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          selectedUserId === user.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <User className={`h-4 w-4 ${
                            selectedUserId === user.id ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      {selectedUserId === user.id && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || loadingUsers || !selectedUserId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Workflows'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}