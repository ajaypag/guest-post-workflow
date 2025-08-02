'use client';

import { useState, useEffect } from 'react';
import { User, Search, Loader2 } from 'lucide-react';

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
}

interface UserSelectorProps {
  value?: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserSelector({ 
  value, 
  onChange, 
  placeholder = "Select a user to assign...",
  className = "" 
}: UserSelectorProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/internal-users/assignable');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === value);

  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <User className="h-5 w-5 text-gray-400" />
        <div className="flex-1">
          {loading ? (
            <span className="text-gray-400">Loading users...</span>
          ) : selectedUser ? (
            <span className="text-gray-900">{selectedUser.displayName}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <div className="text-gray-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isOpen && !loading && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="text-gray-500">Unassigned</span>
                  </button>
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onChange(user.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        value === user.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}