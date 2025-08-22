'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  status: string;
}

interface SearchableAccountDropdownProps {
  accounts: Account[];
  selectedAccountId: string | null;
  onSelect: (account: Account) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function SearchableAccountDropdown({
  accounts,
  selectedAccountId,
  onSelect,
  placeholder = "Choose an account...",
  required = false,
  className = ""
}: SearchableAccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Filter accounts based on search
  const filteredAccounts = accounts.filter(account => {
    if (account.id === 'all') return true; // Always show "All Accounts" option
    const search = searchTerm.toLowerCase();
    return (
      account.email.toLowerCase().includes(search) ||
      account.contactName.toLowerCase().includes(search) ||
      (account.companyName && account.companyName.toLowerCase().includes(search))
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (account: Account) => {
    onSelect(account);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getDisplayText = (account: Account) => {
    if (account.id === 'all') {
      return 'All Accounts';
    }
    if (account.companyName) {
      return `${account.companyName} - ${account.contactName}`;
    }
    return `${account.contactName}`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 text-left text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span className={selectedAccount ? 'text-gray-900' : 'text-gray-500'}>
            {selectedAccount ? getDisplayText(selectedAccount) : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Account List */}
          <div className="max-h-60 overflow-auto">
            {filteredAccounts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No accounts found matching "{searchTerm}"
              </div>
            ) : (
              <ul className="py-1" role="listbox">
                {filteredAccounts.map((account) => (
                  <li
                    key={account.id}
                    onClick={() => handleSelect(account)}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                      account.id === selectedAccountId ? 'bg-blue-50' : ''
                    }`}
                    role="option"
                    aria-selected={account.id === selectedAccountId}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {account.id === 'all' ? 'All Accounts' : (account.companyName || account.contactName)}
                        </div>
                        {account.id !== 'all' && (
                          <div className="text-xs text-gray-500">
                            {account.contactName} • {account.email}
                          </div>
                        )}
                      </div>
                      {account.id === selectedAccountId && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Results count */}
          {searchTerm && (
            <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-200">
              Showing {filteredAccounts.length} of {accounts.length} accounts
            </div>
          )}
        </div>
      )}
    </div>
  );
}