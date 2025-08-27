'use client';

import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface VettedSitesTaskAssignmentProps {
  requestId: string;
  currentAssignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  onAssignmentChange?: (assignee: User | null) => void;
  compact?: boolean;
}

export default function VettedSitesTaskAssignment({ 
  requestId, 
  currentAssignee, 
  onAssignmentChange,
  compact = false 
}: VettedSitesTaskAssignmentProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (showAssignDialog && users.length === 0) {
      fetchUsers();
    }
  }, [showAssignDialog]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignment = async (userId: string | null) => {
    try {
      setAssigning(true);
      
      const response = await fetch('/api/internal/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'vetted_sites_request',
          entityId: requestId,
          assignedTo: userId,
          notes: notes || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign task');
      }

      const assignedUser = userId ? users.find(u => u.id === userId) || null : null;
      onAssignmentChange?.(assignedUser);
      setShowAssignDialog(false);
      setNotes('');
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Failed to assign task');
    } finally {
      setAssigning(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {currentAssignee ? (
          <>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <UserCheck className="h-4 w-4" />
              <span>{currentAssignee.name}</span>
            </div>
            <button
              onClick={() => setShowAssignDialog(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Reassign
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAssignDialog(true)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-indigo-600"
          >
            <UserX className="h-4 w-4" />
            <span>Unassigned</span>
          </button>
        )}

        {/* Assignment Dialog */}
        {showAssignDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Vetted Sites Request
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to:
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      <button
                        onClick={() => handleAssignment(null)}
                        disabled={assigning}
                        className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100"
                      >
                        <UserX className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Unassigned</span>
                      </button>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAssignment(user.id)}
                          disabled={assigning}
                          className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
                        >
                          <Users className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional):
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Add any assignment notes..."
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignDialog(false)}
                  disabled={assigning}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full assignment panel for detail pages
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Task Assignment</h3>
        <button
          onClick={() => setShowAssignDialog(true)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm"
        >
          <Users className="h-4 w-4" />
          <span>{currentAssignee ? 'Reassign' : 'Assign'}</span>
        </button>
      </div>

      {currentAssignee ? (
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <UserCheck className="h-5 w-5 text-green-600" />
          <div>
            <div className="font-medium text-green-900">{currentAssignee.name}</div>
            <div className="text-sm text-green-700">{currentAssignee.email}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <UserX className="h-5 w-5 text-gray-400" />
          <div className="text-gray-600">
            <div className="font-medium">Unassigned</div>
            <div className="text-sm">No team member assigned to this request</div>
          </div>
        </div>
      )}

      {/* Assignment Dialog - Same as compact version */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Vetted Sites Request
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to:
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleAssignment(null)}
                      disabled={assigning}
                      className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100"
                    >
                      <UserX className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Unassigned</span>
                    </button>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAssignment(user.id)}
                        disabled={assigning}
                        className="w-full p-3 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
                      >
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional):
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Add any assignment notes..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignDialog(false)}
                disabled={assigning}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}