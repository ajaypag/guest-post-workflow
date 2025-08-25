'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, X, Building2, Globe, Users, Filter, Calendar } from 'lucide-react';
import { Client } from '@/types/user';

interface ClientSelectorProps {
  clients: Client[];
  selectedClient: Client | null;
  onChange: (client: Client | null) => void;
  placeholder?: string;
  className?: string;
}

interface EnhancedClient extends Client {
  accountName?: string;
  lastOrderDate?: string;
  targetPageCount?: number;
}

export default function ClientSelector({
  clients,
  selectedClient,
  onChange,
  placeholder = 'Select a client',
  className = ''
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'prospect'>('all');
  const [enhancedClients, setEnhancedClients] = useState<EnhancedClient[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load account names and enhance client data
  useEffect(() => {
    const loadEnhancedData = async () => {
      // Get unique account IDs
      const accountIds = [...new Set(clients
        .filter(c => (c as any).accountId)
        .map(c => (c as any).accountId)
      )];

      // Load account names
      if (accountIds.length > 0) {
        try {
          const response = await fetch('/api/accounts?ids=' + accountIds.join(','));
          if (response.ok) {
            const data = await response.json();
            const accountList = data.accounts?.map((a: any) => ({
              id: a.id,
              name: a.companyName || a.contactName || a.email
            })) || [];
            setAccounts(accountList);

            // Enhance clients with account names
            const enhanced = clients.map(client => {
              const account = accountList.find((a: any) => a.id === (client as any).accountId);
              return {
                ...client,
                accountName: account?.name,
                targetPageCount: (client as any).targetPages?.length || 0,
                lastOrderDate: (client as any).orderStats?.recentOrderDate
              } as EnhancedClient;
            });
            setEnhancedClients(enhanced);
          }
        } catch (error) {
          console.error('Error loading account data:', error);
          setEnhancedClients(clients as EnhancedClient[]);
        }
      } else {
        setEnhancedClients(clients as EnhancedClient[]);
      }
    };

    loadEnhancedData();
  }, [clients]);

  // Filter and sort clients
  const filteredClients = enhancedClients.filter(client => {
    // Search filter
    const matchesSearch = !searchTerm || 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.accountName?.toLowerCase().includes(searchTerm.toLowerCase());

    // Account filter
    const matchesAccount = accountFilter === 'all' || 
      (client as any).accountId === accountFilter;

    // Type filter
    const matchesType = typeFilter === 'all' ||
      (client as any).clientType === typeFilter;

    return matchesSearch && matchesAccount && matchesType;
  }).sort((a, b) => {
    // Sort by: 1) Has target pages, 2) Recent activity, 3) Name
    const aScore = (a.targetPageCount || 0) * 1000 + (a.lastOrderDate ? 100 : 0);
    const bScore = (b.targetPageCount || 0) * 1000 + (b.lastOrderDate ? 100 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
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

  const selectClient = (client: EnhancedClient | null) => {
    onChange(client);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = () => {
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          {selectedClient ? (
            <div className="flex items-center min-w-0">
              <Building2 className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {selectedClient.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {selectedClient.website}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <div className="flex items-center ml-2">
            {selectedClient && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="mr-1 p-0.5 hover:bg-gray-200 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </div>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-w-2xl">
          {/* Search and Filters */}
          <div className="p-3 border-b border-gray-200 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, website, or account..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Filter row */}
            <div className="flex gap-2">
              {/* Account filter */}
              {accounts.length > 0 && (
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="all">All Types</option>
                <option value="client">Clients</option>
                <option value="prospect">Prospects</option>
              </select>

              {/* Manual entry option */}
              <button
                type="button"
                onClick={() => {
                  selectClient(null);
                }}
                className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Manual Entry
              </button>
            </div>
          </div>

          {/* Client list */}
          <div className="max-h-96 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No clients match your search' : 'No clients available'}
                </p>
                <button
                  type="button"
                  onClick={() => selectClient(null)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Use manual entry instead
                </button>
              </div>
            ) : (
              <div className="py-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-start text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                              {client.name}
                            </span>
                            {(client as any).clientType === 'prospect' && (
                              <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                Prospect
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <a
                              href={client.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3 h-3 mr-1" />
                              {client.website?.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                            </a>
                            {client.accountName && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {client.accountName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end text-xs text-gray-500">
                          {client.targetPageCount && client.targetPageCount > 0 && (
                            <span className="whitespace-nowrap">
                              {client.targetPageCount} target page{client.targetPageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {client.lastOrderDate && (
                            <span className="whitespace-nowrap flex items-center mt-1">
                              <Calendar className="w-3 h-3 mr-1" />
                              Last: {new Date(client.lastOrderDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              Showing {filteredClients.length} of {enhancedClients.length} clients
            </div>
          </div>
        </div>
      )}
    </div>
  );
}