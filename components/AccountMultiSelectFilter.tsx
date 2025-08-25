'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, X, Users, Building2 } from 'lucide-react';

interface Account {
  id: string;
  name?: string;
  companyName?: string;
  contactName?: string;
  email: string;
  clientCount?: number;
}

interface AccountMultiSelectFilterProps {
  accounts: Account[];
  selectedAccountIds: string[];
  onChange: (accountIds: string[]) => void;
  className?: string;
}

export default function AccountMultiSelectFilter({
  accounts,
  selectedAccountIds,
  onChange,
  className = ''
}: AccountMultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort accounts by client count (descending)
  const sortedAccounts = [...accounts].sort((a, b) => {
    const countA = a.clientCount || 0;
    const countB = b.clientCount || 0;
    return countB - countA;
  });

  // Filter accounts based on search
  const filteredAccounts = sortedAccounts.filter(account => {
    const displayName = account.companyName || account.name || account.contactName || '';
    return (
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter(id => id !== accountId));
    } else {
      onChange([...selectedAccountIds, accountId]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearchTerm('');
  };

  const selectAll = () => {
    onChange(accounts.map(a => a.id));
  };

  const selectedCount = selectedAccountIds.length;
  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between min-w-[200px] px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-2 text-gray-500" />
          <span>
            {selectedCount === 0
              ? 'All Accounts'
              : selectedCount === 1
              ? selectedAccounts[0]?.companyName || selectedAccounts[0]?.name || 'Account'
              : `${selectedCount} Accounts`}
          </span>
        </div>
        <div className="flex items-center ml-2">
          {selectedCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-3 py-2 border-b border-gray-200 flex justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectAll();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Account list */}
          <div className="max-h-80 overflow-y-auto">
            {filteredAccounts.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No accounts found
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAccount(account.id);
                  }}
                  className="w-full px-3 py-2 hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div
                      className={`w-4 h-4 mr-3 border rounded flex items-center justify-center ${
                        selectedAccountIds.includes(account.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedAccountIds.includes(account.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {account.companyName || account.name || account.contactName || 'Unnamed Account'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {account.email}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center text-xs text-gray-500">
                    <Building2 className="w-3 h-3 mr-1" />
                    <span>{account.clientCount || 0}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Summary footer */}
          {selectedCount > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600">
                {selectedCount} account{selectedCount !== 1 ? 's' : ''} selected
                {selectedAccounts.length > 0 && (
                  <span className="ml-1">
                    ({selectedAccounts.reduce((sum, a) => sum + (a.clientCount || 0), 0)} total clients)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}