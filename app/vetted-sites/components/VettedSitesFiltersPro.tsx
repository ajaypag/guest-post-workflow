'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarSolidIcon 
} from '@heroicons/react/24/solid';

interface Client {
  id: string;
  name: string;
  accountId?: string;
}

interface Account {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  clientId: string;
}

interface VettedSitesFiltersProps {
  availableClients: Client[];
  availableAccounts: Account[];
  availableProjects: Project[];
  currentFilters: any;
  userType: string;
}

// Quality level configuration
const QUALITY_LEVELS = [
  { value: 'high_quality', label: 'High', color: 'green', emoji: '🏆' },
  { value: 'good_quality', label: 'Good', color: 'blue', emoji: '✓' },
  { value: 'marginal', label: 'Marginal', color: 'yellow', emoji: '⚠️' },
  { value: 'disqualified', label: 'Disqualified', color: 'red', emoji: '✗' },
];

// View modes configuration
const VIEW_MODES = [
  { value: 'all', label: 'All', icon: null },
  { value: 'bookmarked', label: 'Starred', icon: StarSolidIcon },
  { value: 'hidden', label: 'Hidden', icon: null },
];

export default function VettedSitesFiltersPro({ 
  availableClients, 
  availableAccounts,
  availableProjects, 
  currentFilters,
  userType 
}: VettedSitesFiltersProps) {
  const router = useRouter();
  const filters = currentFilters || {};
  
  // Core filter state
  const [search, setSearch] = useState(filters.search || '');
  const [selectedClients, setSelectedClients] = useState<string[]>(
    filters.clientId ? filters.clientId.split(',') : []
  );
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    filters.accountId ? filters.accountId.split(',') : []
  );
  const [selectedProject, setSelectedProject] = useState(filters.projectId || '');
  const [qualificationStatus, setQualificationStatus] = useState<string[]>(
    filters.status ? filters.status.split(',') : ['high_quality', 'good_quality']
  );
  const [view, setView] = useState(filters.view || 'all');
  const [availableOnly, setAvailableOnly] = useState(filters.available === 'true');
  
  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minDR, setMinDR] = useState(filters.minDR || '');
  const [maxDR, setMaxDR] = useState(filters.maxDR || '');
  const [minTraffic, setMinTraffic] = useState(filters.minTraffic || '');
  const [maxTraffic, setMaxTraffic] = useState(filters.maxTraffic || '');
  const [minPrice, setMinPrice] = useState(filters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice || '');

  // UI state
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent accounts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-accounts');
    if (stored) {
      setRecentAccounts(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Group clients by account
  const clientsByAccount = useMemo(() => {
    const grouped = new Map<string, Client[]>();
    availableClients.forEach(client => {
      const accountId = client.accountId || 'no-account';
      if (!grouped.has(accountId)) {
        grouped.set(accountId, []);
      }
      grouped.get(accountId)!.push(client);
    });
    return grouped;
  }, [availableClients]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery) {
      // Show recent accounts first, then others
      const recentAccountObjs = availableAccounts.filter(a => recentAccounts.includes(a.id));
      const otherAccounts = availableAccounts.filter(a => !recentAccounts.includes(a.id)).slice(0, 10);
      return [...recentAccountObjs, ...otherAccounts];
    }
    
    const query = accountSearchQuery.toLowerCase();
    return availableAccounts.filter(account => 
      account.name.toLowerCase().includes(query) ||
      account.email.toLowerCase().includes(query)
    ).slice(0, 20); // Limit results
  }, [accountSearchQuery, availableAccounts, recentAccounts]);

  // Filter projects based on selected clients
  const filteredProjects = useMemo(() => {
    return selectedClients.length > 0
      ? availableProjects.filter(project => selectedClients.includes(project.clientId))
      : availableProjects;
  }, [selectedClients, availableProjects]);

  // Count active filters
  const activeFilterCount = [
    search ? 1 : 0,
    selectedClients.length > 0 ? 1 : 0,
    selectedAccounts.length > 0 ? 1 : 0,
    selectedProject ? 1 : 0,
    qualificationStatus.join(',') !== 'high_quality,good_quality' ? 1 : 0,
    view !== 'all' ? 1 : 0,
    availableOnly ? 1 : 0,
    (minDR || maxDR || minTraffic || maxTraffic || minPrice || maxPrice) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Update URL with current filters
  const updateFilters = () => {
    const params = new URLSearchParams();
    
    if (search) params.set('search', search);
    if (selectedClients.length > 0) params.set('clientId', selectedClients.join(','));
    if (selectedAccounts.length > 0) params.set('accountId', selectedAccounts.join(','));
    if (selectedProject) params.set('projectId', selectedProject);
    if (qualificationStatus.length > 0 && 
        qualificationStatus.join(',') !== 'high_quality,good_quality') {
      params.set('status', qualificationStatus.join(','));
    }
    if (view !== 'all') params.set('view', view);
    if (availableOnly) params.set('available', 'true');
    
    // Advanced filters
    if (minDR) params.set('minDR', minDR);
    if (maxDR) params.set('maxDR', maxDR);
    if (minTraffic) params.set('minTraffic', minTraffic);
    if (maxTraffic) params.set('maxTraffic', maxTraffic);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    params.set('page', '1');
    router.push(`/vetted-sites?${params.toString()}`, { scroll: false });
  };

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    const account = availableAccounts.find(a => a.id === accountId);
    if (!account) return;

    // Update recent accounts
    const newRecent = [accountId, ...recentAccounts.filter(id => id !== accountId)].slice(0, 5);
    setRecentAccounts(newRecent);
    localStorage.setItem('recent-accounts', JSON.stringify(newRecent));

    // Toggle account selection
    if (selectedAccounts.includes(accountId)) {
      // Deselect account and its clients
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
      const accountClients = clientsByAccount.get(accountId) || [];
      const clientIds = accountClients.map(c => c.id);
      setSelectedClients(prev => prev.filter(id => !clientIds.includes(id)));
    } else {
      // Select account and its clients
      setSelectedAccounts(prev => [...prev, accountId]);
      const accountClients = clientsByAccount.get(accountId) || [];
      const clientIds = accountClients.map(c => c.id);
      setSelectedClients(prev => {
        const newSelection = [...prev];
        clientIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
    
    setShowAccountDropdown(false);
    setAccountSearchQuery('');
  };

  // Toggle quality status
  const handleQualityToggle = (status: string) => {
    setQualificationStatus(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearch('');
    setSelectedClients([]);
    setSelectedAccounts([]);
    setSelectedProject('');
    setQualificationStatus(['high_quality', 'good_quality']);
    setView('all');
    setAvailableOnly(false);
    setMinDR('');
    setMaxDR('');
    setMinTraffic('');
    setMaxTraffic('');
    setMinPrice('');
    setMaxPrice('');
    router.push('/vetted-sites');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state with URL
  useEffect(() => {
    setSearch(filters.search || '');
    setSelectedAccounts(filters.accountId ? filters.accountId.split(',') : []);
    setSelectedClients(filters.clientId ? filters.clientId.split(',') : []);
    setSelectedProject(filters.projectId || '');
    setQualificationStatus(filters.status ? filters.status.split(',') : ['high_quality', 'good_quality']);
    setView(filters.view || 'all');
    setAvailableOnly(filters.available === 'true');
    setMinDR(filters.minDR || '');
    setMaxDR(filters.maxDR || '');
    setMinTraffic(filters.minTraffic || '');
    setMaxTraffic(filters.maxTraffic || '');
    setMinPrice(filters.minPrice || '');
    setMaxPrice(filters.maxPrice || '');
  }, [filters]);

  // Get selected account names for display
  const selectedAccountNames = selectedAccounts
    .map(id => availableAccounts.find(a => a.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </h3>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <XMarkIcon className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* PRIMARY FILTERS GROUP */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domains..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quality Status Pills */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Quality
            </label>
            <div className="flex flex-wrap gap-2">
              {QUALITY_LEVELS.map((level) => {
                const isSelected = qualificationStatus.includes(level.value);
                return (
                  <button
                    key={level.value}
                    onClick={() => handleQualityToggle(level.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1
                      ${isSelected 
                        ? level.color === 'green' ? 'bg-green-100 text-green-800 ring-1 ring-green-600'
                        : level.color === 'blue' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600'
                        : level.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600'
                        : 'bg-red-100 text-red-800 ring-1 ring-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span>{level.emoji}</span>
                    {level.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* View Mode Pills */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              View
            </label>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setView(mode.value)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                    ${view === mode.value 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {mode.icon && <mode.icon className="h-3.5 w-3.5" />}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-gray-100"></div>

        {/* SELECTION FILTERS GROUP */}
        <div className="space-y-4">
          {/* Account/Client Selector (Internal Users) */}
          {userType === 'internal' && (
            <div ref={dropdownRef}>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Accounts & Clients
              </label>
              
              {/* Selected Accounts Display */}
              {selectedAccounts.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedAccountNames.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {name}
                      <button
                        onClick={() => {
                          const account = availableAccounts.find(a => a.name === name);
                          if (account) handleAccountSelect(account.id);
                        }}
                        className="hover:text-blue-900"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedAccounts.length > 2 && (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{selectedAccounts.length - 2} more
                    </span>
                  )}
                </div>
              )}
              
              {/* Searchable Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <span className="text-gray-600">
                    {selectedAccounts.length === 0 
                      ? 'Select accounts...' 
                      : `${selectedAccounts.length} selected`}
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Panel */}
                {showAccountDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        placeholder="Search accounts..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    {/* Quick Actions */}
                    {!accountSearchQuery && (
                      <div className="px-2 py-1 border-b border-gray-100">
                        <button
                          onClick={() => {
                            if (selectedAccounts.length === availableAccounts.length) {
                              setSelectedAccounts([]);
                              setSelectedClients([]);
                            } else {
                              setSelectedAccounts(availableAccounts.map(a => a.id));
                              setSelectedClients(availableClients.map(c => c.id));
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {selectedAccounts.length === availableAccounts.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                    )}
                    
                    {/* Recent/Filtered Accounts */}
                    <div className="max-h-60 overflow-y-auto">
                      {!accountSearchQuery && recentAccounts.length > 0 && (
                        <>
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                            <ClockIcon className="inline h-3 w-3 mr-1" />
                            Recent
                          </div>
                          {recentAccounts.slice(0, 3).map(accountId => {
                            const account = availableAccounts.find(a => a.id === accountId);
                            if (!account) return null;
                            const isSelected = selectedAccounts.includes(accountId);
                            const clientCount = clientsByAccount.get(accountId)?.length || 0;
                            
                            return (
                              <button
                                key={accountId}
                                onClick={() => handleAccountSelect(accountId)}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                    <div className="text-xs text-gray-500">{clientCount} clients</div>
                                  </div>
                                </div>
                                {isSelected && <CheckIcon className="h-4 w-4 text-blue-600" />}
                              </button>
                            );
                          })}
                          <div className="border-t border-gray-100 my-1"></div>
                        </>
                      )}
                      
                      {/* All/Filtered Accounts */}
                      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                        {accountSearchQuery ? 'Search Results' : 'All Accounts'}
                      </div>
                      {filteredAccounts.map(account => {
                        const isSelected = selectedAccounts.includes(account.id);
                        const clientCount = clientsByAccount.get(account.id)?.length || 0;
                        
                        return (
                          <button
                            key={account.id}
                            onClick={() => handleAccountSelect(account.id)}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserGroupIcon className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                <div className="text-xs text-gray-500">{clientCount} clients • {account.email}</div>
                              </div>
                            </div>
                            {isSelected && <CheckIcon className="h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })}
                      
                      {filteredAccounts.length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                          No accounts found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simple Client List (External Users) */}
          {userType !== 'internal' && availableClients.length > 1 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Clients
              </label>
              <div className="space-y-1">
                {availableClients.slice(0, 5).map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => {
                        if (selectedClients.includes(client.id)) {
                          setSelectedClients(prev => prev.filter(id => id !== client.id));
                        } else {
                          setSelectedClients(prev => [...prev, client.id]);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{client.name}</span>
                  </label>
                ))}
                {availableClients.length > 5 && (
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium pl-6">
                    Show {availableClients.length - 5} more...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Project Dropdown */}
          {filteredProjects.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Availability Toggle */}
          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Available only</span>
          </label>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-gray-100"></div>

        {/* Advanced Filters */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              Advanced Filters
            </div>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Domain Rating</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minDR}
                    onChange={(e) => setMinDR(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxDR}
                    onChange={(e) => setMaxDR(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Traffic</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minTraffic}
                    onChange={(e) => setMinTraffic(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxTraffic}
                    onChange={(e) => setMaxTraffic(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Price ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Button - Sticky at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={updateFilters}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}