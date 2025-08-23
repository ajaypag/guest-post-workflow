'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  FunnelIcon,
  BookmarkIcon,
  EyeSlashIcon,
  CheckIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolidIcon,
  EyeSlashIcon as EyeSlashSolidIcon,
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
  { value: 'hidden', label: 'Hidden', icon: EyeSlashSolidIcon },
];

export default function VettedSitesFiltersNew({ 
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
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  // Group clients by account for internal users
  const clientsByAccount = useMemo(() => {
    if (userType !== 'internal') return null;
    
    const grouped = new Map<string, Client[]>();
    
    // Group clients by accountId
    availableClients.forEach(client => {
      const accountId = client.accountId || 'no-account';
      if (!grouped.has(accountId)) {
        grouped.set(accountId, []);
      }
      grouped.get(accountId)!.push(client);
    });
    
    return grouped;
  }, [availableClients, userType]);

  // Filter projects based on selected clients
  const filteredProjects = useMemo(() => {
    return selectedClients.length > 0
      ? availableProjects.filter(project => selectedClients.includes(project.clientId))
      : availableProjects;
  }, [selectedClients, availableProjects]);

  // Check if we have active filters
  const hasActiveFilters = search || 
    selectedClients.length > 0 || 
    selectedAccounts.length > 0 ||
    selectedProject || 
    qualificationStatus.join(',') !== 'high_quality,good_quality' ||
    view !== 'all' ||
    availableOnly ||
    minDR || maxDR || minTraffic || maxTraffic || minPrice || maxPrice;

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

  // Handle account selection (internal users)
  const handleAccountToggle = (accountId: string) => {
    const account = availableAccounts.find(a => a.id === accountId);
    if (!account) return;

    const accountClients = availableClients.filter(c => c.accountId === accountId);
    const accountClientIds = accountClients.map(c => c.id);

    if (selectedAccounts.includes(accountId)) {
      // Deselect account and all its clients
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
      setSelectedClients(prev => prev.filter(id => !accountClientIds.includes(id)));
    } else {
      // Select account and all its clients
      setSelectedAccounts(prev => [...prev, accountId]);
      setSelectedClients(prev => {
        const newSelection = [...prev];
        accountClientIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // Handle client selection
  const handleClientToggle = (clientId: string) => {
    const client = availableClients.find(c => c.id === clientId);
    
    if (selectedClients.includes(clientId)) {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
      
      // If deselecting a client, also deselect its account if all siblings are deselected
      if (client?.accountId) {
        const siblings = availableClients.filter(c => c.accountId === client.accountId);
        const selectedSiblings = siblings.filter(c => 
          c.id !== clientId && selectedClients.includes(c.id)
        );
        if (selectedSiblings.length === 0) {
          setSelectedAccounts(prev => prev.filter(id => id !== client.accountId));
        }
      }
    } else {
      setSelectedClients(prev => [...prev, clientId]);
      
      // If selecting a client, check if all siblings are selected to auto-select account
      if (client?.accountId) {
        const siblings = availableClients.filter(c => c.accountId === client.accountId);
        const allSiblingsSelected = siblings.every(c => 
          c.id === clientId || selectedClients.includes(c.id)
        );
        if (allSiblingsSelected && client.accountId && !selectedAccounts.includes(client.accountId)) {
          setSelectedAccounts(prev => [...prev, client.accountId].filter((id): id is string => id !== undefined));
        }
      }
    }
    
    // Clear project if needed
    setSelectedProject('');
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
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
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
            >
              <XMarkIcon className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
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

        {/* View Mode Pills */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
            View Mode
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

        {/* Quality Status Pills */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
            Quality Level
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
                  {isSelected && <CheckIcon className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account/Client Hierarchy (Internal Users) */}
        {userType === 'internal' && clientsByAccount && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
              Accounts & Clients
            </label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {availableAccounts.map((account) => {
                const accountClients = clientsByAccount.get(account.id) || [];
                const isExpanded = expandedAccounts.includes(account.id);
                const isAccountSelected = selectedAccounts.includes(account.id);
                const selectedCount = accountClients.filter(c => selectedClients.includes(c.id)).length;
                
                return (
                  <div key={account.id}>
                    {/* Account Header */}
                    <div className="flex items-center gap-2 p-2 hover:bg-gray-50">
                      <button
                        onClick={() => setExpandedAccounts(prev => 
                          isExpanded 
                            ? prev.filter(id => id !== account.id)
                            : [...prev, account.id]
                        )}
                        className="p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      
                      <input
                        type="checkbox"
                        checked={isAccountSelected}
                        onChange={() => handleAccountToggle(account.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {account.name}
                          </span>
                          {selectedCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {selectedCount}/{accountClients.length}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{account.email}</div>
                      </div>
                    </div>
                    
                    {/* Clients List */}
                    {isExpanded && accountClients.length > 0 && (
                      <div className="pl-7 pb-2 space-y-1">
                        {accountClients.map((client) => (
                          <label
                            key={client.id}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedClients.includes(client.id)}
                              onChange={() => handleClientToggle(client.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{client.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Clients without accounts */}
              {clientsByAccount.has('no-account') && (
                <div>
                  <div className="p-2 bg-gray-50">
                    <span className="text-xs font-medium text-gray-500">No Account</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {clientsByAccount.get('no-account')!.map((client) => (
                      <label
                        key={client.id}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleClientToggle(client.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{client.name}</span>
                      </label>
                    ))}
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
              {availableClients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => handleClientToggle(client.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm text-gray-700">{client.name}</span>
                </label>
              ))}
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
        <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Available only</span>
          <span className="text-xs text-gray-500">(not in use)</span>
        </label>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Advanced Filters
          </div>
          {showAdvanced ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            {/* DR Range */}
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

            {/* Traffic Range */}
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

            {/* Price Range */}
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

        {/* Apply Button */}
        <button
          onClick={updateFilters}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Apply Filters
        </button>
      </div>
    </div>
  );
}