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
  ChevronRightIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  Squares2X2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  StarIcon as StarSolidIcon,
  EyeSlashIcon as EyeSlashSolidIcon 
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

interface TargetUrl {
  url: string;
  type: 'original' | 'ai_suggested' | 'analyzed';
  clientId: string;
  clientName: string;
  usageCount: number;
  hasMatchData: boolean;
}

interface VettedSitesFiltersProps {
  availableClients: Client[];
  availableAccounts: Account[];
  availableProjects: Project[];
  currentFilters: any;
  userType: string;
}

// Quality level configuration - more compact
const QUALITY_LEVELS = [
  { value: 'high_quality', label: 'High', short: 'H', color: 'emerald' },
  { value: 'good_quality', label: 'Good', short: 'G', color: 'blue' },
  { value: 'marginal', label: 'Marginal', short: 'M', color: 'amber' },
  { value: 'disqualified', label: 'Disqualified', short: 'D', color: 'red' },
];

export default function VettedSitesFiltersCompact({ 
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
  // Removed - now using selectedProjects array above
  const [qualificationStatus, setQualificationStatus] = useState<string[]>(
    filters.status ? filters.status.split(',') : ['high_quality', 'good_quality']
  );
  const [view, setView] = useState(filters.view || 'all');
  const [availableOnly, setAvailableOnly] = useState(filters.available === 'false' ? false : true);
  
  // Metric filters
  const [minDR, setMinDR] = useState(filters.minDR || '');
  const [maxDR, setMaxDR] = useState(filters.maxDR || '');
  const [minTraffic, setMinTraffic] = useState(filters.minTraffic || '');
  const [maxTraffic, setMaxTraffic] = useState(filters.maxTraffic || '');
  const [minPrice, setMinPrice] = useState(filters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice || '');
  
  // Target URL filtering state
  const [availableTargetUrls, setAvailableTargetUrls] = useState<TargetUrl[]>([]);
  const [selectedTargetUrls, setSelectedTargetUrls] = useState<string[]>(
    filters.targetUrls ? filters.targetUrls.split(',') : []
  );
  const [targetUrlsLoading, setTargetUrlsLoading] = useState(false);
  const [onlyMatchDataUrls, setOnlyMatchDataUrls] = useState(false);
  const [hasMatchDataCount, setHasMatchDataCount] = useState(0);
  
  // Dropdown states for metric filters
  const [showDRFilter, setShowDRFilter] = useState(false);
  const [showTrafficFilter, setShowTrafficFilter] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [showTargetUrlsFilter, setShowTargetUrlsFilter] = useState(false);

  // UI state
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    filters.projectId ? [filters.projectId] : []
  );
  const [recentAccounts, setRecentAccounts] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Load recent accounts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-accounts');
    if (stored) {
      setRecentAccounts(JSON.parse(stored).slice(0, 3));
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
    const query = accountSearchQuery.toLowerCase();
    
    if (!accountSearchQuery) {
      // When not searching, optionally hide accounts with 0 clients
      const recentAccountObjs = availableAccounts.filter(a => recentAccounts.includes(a.id));
      const otherAccounts = availableAccounts.filter(a => {
        if (recentAccounts.includes(a.id)) return false; // Already in recent
        if (showInactiveAccounts) return true; // Show all if toggle is on
        const clientCount = clientsByAccount.get(a.id)?.length || 0;
        return clientCount > 0; // Only show accounts with clients
      });
      return [...recentAccountObjs, ...otherAccounts];
    }
    
    // When searching, show ALL matching results (including 0-client accounts)
    return availableAccounts.filter(account => 
      account.name.toLowerCase().includes(query) ||
      account.email.toLowerCase().includes(query)
    );
  }, [accountSearchQuery, availableAccounts, recentAccounts, clientsByAccount, showInactiveAccounts]);

  // Filter clients based on search and selected accounts
  const filteredClients = useMemo(() => {
    let clients = availableClients;
    
    // If accounts are selected, only show clients from those accounts
    if (selectedAccounts.length > 0) {
      clients = clients.filter(client => 
        selectedAccounts.includes(client.accountId || '')
      );
    }
    
    // Apply search filter
    if (clientSearchQuery) {
      const query = clientSearchQuery.toLowerCase();
      clients = clients.filter(client => 
        client.name.toLowerCase().includes(query)
      );
    }
    
    return clients;
  }, [availableClients, selectedAccounts, clientSearchQuery]);

  // Filter projects based on selected clients and search
  const filteredProjects = useMemo(() => {
    let projects = availableProjects;
    
    // Filter by selected clients
    if (selectedClients.length > 0) {
      projects = projects.filter(project => selectedClients.includes(project.clientId));
    }
    
    // Apply search filter
    if (projectSearchQuery) {
      const query = projectSearchQuery.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(query)
      );
    }
    
    return projects;
  }, [availableProjects, selectedClients, projectSearchQuery]);

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    search ? 1 : 0,
    selectedAccounts.length > 0 ? 1 : 0,
    selectedClients.length > 0 ? 1 : 0,
    selectedProjects.length > 0 ? 1 : 0,
    qualificationStatus.join(',') !== 'high_quality,good_quality' ? 1 : 0,
    view !== 'all' ? 1 : 0,
    !availableOnly ? 1 : 0,  // Count when NOT available (since true is the default)
    (minDR || maxDR || minTraffic || maxTraffic || minPrice || maxPrice) ? 1 : 0,
    selectedTargetUrls.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Fetch available target URLs with smart logic
  useEffect(() => {
    const fetchTargetUrls = async () => {
      // For external users, always fetch (they have limited data)
      if (userType !== 'internal') {
        setTargetUrlsLoading(true);
        try {
          const params = new URLSearchParams();
          if (onlyMatchDataUrls) params.set('onlyWithMatchData', 'true');
          const response = await fetch(`/api/vetted-sites/target-urls?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableTargetUrls(data.targetUrls || []);
            setHasMatchDataCount(data.hasMatchDataCount || 0);
          } else {
            setAvailableTargetUrls([]);
          }
        } catch (error) {
          console.error('Error fetching target URLs:', error);
          setAvailableTargetUrls([]);
        } finally {
          setTargetUrlsLoading(false);
        }
        return;
      }

      // Internal users: Smart logic based on client selection
      if (selectedClients.length === 0) {
        // No clients selected - fetch all URLs to check count for 100+ rule
        setTargetUrlsLoading(true);
        try {
          const params = new URLSearchParams();
          if (onlyMatchDataUrls) params.set('onlyWithMatchData', 'true');
          const response = await fetch(`/api/vetted-sites/target-urls?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            const allUrls = data.targetUrls || [];
            setHasMatchDataCount(data.hasMatchDataCount || 0);
            
            // If >100 URLs and multiple clients available, force client selection
            if (allUrls.length > 100 && availableClients.length > 1) {
              setAvailableTargetUrls([]); // Don't show URLs, force client selection
            } else {
              setAvailableTargetUrls(allUrls); // Show all URLs
            }
          } else {
            setAvailableTargetUrls([]);
          }
        } catch (error) {
          console.error('Error fetching target URLs:', error);
          setAvailableTargetUrls([]);
        } finally {
          setTargetUrlsLoading(false);
        }
      } else {
        // Clients selected - fetch URLs for those clients
        setTargetUrlsLoading(true);
        try {
          const params = new URLSearchParams();
          params.set('clientId', selectedClients.join(','));
          if (onlyMatchDataUrls) params.set('onlyWithMatchData', 'true');
          const response = await fetch(`/api/vetted-sites/target-urls?${params.toString()}`);
          
          if (response.ok) {
            const data = await response.json();
            setAvailableTargetUrls(data.targetUrls || []);
            setHasMatchDataCount(data.hasMatchDataCount || 0);
          } else {
            console.error('Failed to fetch target URLs');
            setAvailableTargetUrls([]);
          }
        } catch (error) {
          console.error('Error fetching target URLs:', error);
          setAvailableTargetUrls([]);
        } finally {
          setTargetUrlsLoading(false);
        }
      }
    };

    fetchTargetUrls();
  }, [selectedClients, userType, availableClients.length, onlyMatchDataUrls]);


  // Update URL with current filters
  const updateFilters = () => {
    setIsApplying(true);
    
    const params = new URLSearchParams();
    
    if (search) params.set('search', search);
    if (selectedClients.length > 0) params.set('clientId', selectedClients.join(','));
    if (selectedAccounts.length > 0) params.set('accountId', selectedAccounts.join(','));
    if (selectedProjects.length > 0) params.set('projectId', selectedProjects.join(','));
    if (qualificationStatus.length > 0 && 
        qualificationStatus.join(',') !== 'high_quality,good_quality') {
      params.set('status', qualificationStatus.join(','));
    }
    if (view !== 'all') params.set('view', view);
    if (!availableOnly) params.set('available', 'false');  // Only set when NOT available (since true is default)
    
    // Advanced filters
    if (minDR) params.set('minDR', minDR);
    if (maxDR) params.set('maxDR', maxDR);
    if (selectedTargetUrls.length > 0) params.set('targetUrls', selectedTargetUrls.join(','));
    if (minTraffic) params.set('minTraffic', minTraffic);
    if (maxTraffic) params.set('maxTraffic', maxTraffic);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    params.set('page', '1');
    router.push(`/vetted-sites?${params.toString()}`, { scroll: false });
    
    // Reset loading state after a reasonable time
    // This accounts for the server-side data fetching
    setTimeout(() => {
      setIsApplying(false);
    }, 2000);
  };

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    const account = availableAccounts.find(a => a.id === accountId);
    if (!account) return;

    // Update recent accounts
    const newRecent = [accountId, ...recentAccounts.filter(id => id !== accountId)].slice(0, 3);
    setRecentAccounts(newRecent);
    localStorage.setItem('recent-accounts', JSON.stringify(newRecent));

    // Toggle account selection
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
      // Don't auto-deselect clients - let user control that separately
    } else {
      setSelectedAccounts(prev => [...prev, accountId]);
      // Don't auto-select clients - let user control that separately
    }
    
    setShowAccountDropdown(false);
    setAccountSearchQuery('');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearch('');
    setSelectedClients([]);
    setSelectedAccounts([]);
    setClientSearchQuery('');
    setSelectedProjects([]);
    setProjectSearchQuery('');
    setQualificationStatus(['high_quality', 'good_quality']);
    setView('all');
    setAvailableOnly(true);
    setMinDR('');
    setMaxDR('');
    setMinTraffic('');
    setMaxTraffic('');
    setMinPrice('');
    setMaxPrice('');
    router.push('/vetted-sites');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
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
    setSelectedProjects(filters.projectId ? [filters.projectId] : []);
    setQualificationStatus(filters.status ? filters.status.split(',') : ['high_quality', 'good_quality']);
    setView(filters.view || 'all');
    setAvailableOnly(filters.available === 'false' ? false : true);
    setMinDR(filters.minDR || '');
    setMaxDR(filters.maxDR || '');
    setMinTraffic(filters.minTraffic || '');
    setMaxTraffic(filters.maxTraffic || '');
    setMinPrice(filters.minPrice || '');
    setMaxPrice(filters.maxPrice || '');
    setSelectedTargetUrls(filters.targetUrls ? filters.targetUrls.split(',') : []);
  }, [filters]);

  // Get selected account names for display
  const selectedAccountNames = selectedAccounts
    .map(id => availableAccounts.find(a => a.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header - Compact */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </span>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content - Natural flow */}
      <div className="px-3 py-2">
        {/* Search - Primary focus */}
        <div className="mb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domains..."
              className="w-full pl-8 pr-2.5 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* View Mode - Icons with wrappable Available checkbox */}
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-gray-200 overflow-hidden bg-white flex-shrink-0">
              <button
                onClick={() => setView('all')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === 'all' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title="All"
              >
                <Squares2X2Icon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('bookmarked')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                  view === 'bookmarked' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title="Starred"
              >
                <StarIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('hidden')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                  view === 'hidden' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title="Hidden"
              >
                <EyeSlashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <label className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="h-3.5 w-3.5 text-blue-600 rounded border-gray-300"
              />
              <span className="text-xs text-gray-700">Available</span>
            </label>
          </div>
        </div>

        {/* Quality Pills - 2x2 Grid */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1.5">Quality</div>
          <div className="grid grid-cols-2 gap-1">
            {QUALITY_LEVELS.map((level) => {
              const isSelected = qualificationStatus.includes(level.value);
              return (
                <button
                  key={level.value}
                  onClick={() => setQualificationStatus(prev => 
                    prev.includes(level.value) 
                      ? prev.filter(s => s !== level.value)
                      : [...prev, level.value]
                  )}
                  className={`
                    px-2 py-1.5 rounded text-xs font-medium transition-all
                    ${isSelected 
                      ? level.color === 'emerald' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500'
                      : level.color === 'blue' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-500'
                      : level.color === 'amber' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-500'
                      : 'bg-red-100 text-red-800 ring-1 ring-red-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account/Client Selector (Internal Users) - Compact */}
        {userType === 'internal' && (
          <div ref={dropdownRef} className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5">Accounts</div>
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:border-gray-300 bg-white"
              >
                <span className="text-gray-700 truncate">
                  {selectedAccounts.length === 0 
                    ? 'All accounts' 
                    : selectedAccounts.length === 1
                    ? selectedAccountNames[0]
                    : `${selectedAccounts.length} selected`}
                </span>
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                  showAccountDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Dropdown Panel - Compact */}
              {showAccountDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-hidden">
                  {/* Search */}
                  <div className="p-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="px-2 py-1 border-b border-gray-100">
                    <div className="flex justify-between items-center">
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
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        {selectedAccounts.length === availableAccounts.length ? 'Clear' : 'All'}
                      </button>
                      <span className="text-xs text-gray-500">
                        {!accountSearchQuery ? (
                          <>
                            {filteredAccounts.length} shown
                            {!showInactiveAccounts && filteredAccounts.length < availableAccounts.length && 
                              ` (${availableAccounts.length} total)`
                            }
                          </>
                        ) : (
                          `${filteredAccounts.length} results`
                        )}
                      </span>
                    </div>
                    {!accountSearchQuery && (
                      <button
                        onClick={() => setShowInactiveAccounts(!showInactiveAccounts)}
                        className="w-full mt-1 text-xs text-gray-600 hover:text-gray-800 text-left flex items-center gap-1"
                      >
                        <span className={`transition-transform ${
                          showInactiveAccounts ? 'rotate-90' : ''
                        }`}>▶</span>
                        {showInactiveAccounts ? 'Hide' : 'Show'} inactive accounts
                      </button>
                    )}
                  </div>
                  
                  {/* Account List - Compact */}
                  <div className="max-h-72 overflow-y-auto">
                    {filteredAccounts.map((account, index) => {
                      const isSelected = selectedAccounts.includes(account.id);
                      const clientCount = clientsByAccount.get(account.id)?.length || 0;
                      const isRecent = recentAccounts.includes(account.id);
                      const showDivider = !accountSearchQuery && isRecent && 
                        index === recentAccounts.filter(id => availableAccounts.some(a => a.id === id)).length - 1;
                      
                      return (
                        <div key={account.id}>
                          <button
                            onClick={() => handleAccountSelect(account.id)}
                            className={`w-full px-2 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {account.name}
                                {isRecent && !accountSearchQuery && (
                                  <span className="ml-1 text-xs text-gray-400">(recent)</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{account.email}</div>
                              <div className="text-xs text-gray-400">{clientCount} client{clientCount !== 1 ? 's' : ''}</div>
                            </div>
                            {isSelected && <CheckIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                          </button>
                          {showDivider && (
                            <div className="border-t border-gray-100 my-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients/Brands Dropdown - For all users */}
        {availableClients.length > 0 && (
          <div ref={clientDropdownRef} className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5">
              {userType === 'internal' ? 'Clients' : 'Brands'}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:border-gray-300 bg-white"
              >
                <span className="text-gray-700 truncate">
                  {selectedClients.length === 0 
                    ? userType === 'internal' ? 'All clients' : 'All brands'
                    : selectedClients.length === 1
                    ? availableClients.find(c => c.id === selectedClients[0])?.name
                    : `${selectedClients.length} selected`}
                </span>
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                  showClientDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Dropdown Panel */}
              {showClientDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
                  {/* Search */}
                  <div className="p-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder={userType === 'internal' ? "Search clients..." : "Search brands..."}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="px-2 py-1 border-b border-gray-100 flex justify-between">
                    <button
                      onClick={() => {
                        if (selectedClients.length === filteredClients.length) {
                          setSelectedClients([]);
                        } else {
                          setSelectedClients(filteredClients.map(c => c.id));
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {selectedClients.length === filteredClients.length ? 'Clear' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {filteredClients.length} {userType === 'internal' 
                        ? `client${filteredClients.length !== 1 ? 's' : ''}` 
                        : `brand${filteredClients.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  
                  {/* Client List */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredClients.map(client => {
                      const isSelected = selectedClients.includes(client.id);
                      const account = userType === 'internal' && client.accountId 
                        ? availableAccounts.find(a => a.id === client.accountId)
                        : null;
                      
                      return (
                        <button
                          key={client.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClients(prev => prev.filter(id => id !== client.id));
                            } else {
                              setSelectedClients(prev => [...prev, client.id]);
                            }
                          }}
                          className={`w-full px-2 py-1.5 text-left hover:bg-gray-50 flex items-center justify-between ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate">{client.name}</div>
                            {account && (
                              <div className="text-xs text-gray-500 truncate">{account.name}</div>
                            )}
                          </div>
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Target URLs Filter - Always visible, smart about what to show */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1.5">Target URLs</div>
            <div>
              <button
                onClick={() => setShowTargetUrlsFilter(!showTargetUrlsFilter)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs border rounded-md hover:border-gray-300 transition-colors ${
                  selectedTargetUrls.length > 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <span className={`${selectedTargetUrls.length > 0 ? 'text-blue-700' : 'text-gray-700'} truncate`}>
                  {selectedTargetUrls.length === 0 
                    ? 'All target URLs' 
                    : selectedTargetUrls.length === 1
                    ? 'One URL selected'
                    : `${selectedTargetUrls.length} URLs selected`}
                </span>
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                  showTargetUrlsFilter ? 'rotate-180' : ''
                }`} />
              </button>
              {showTargetUrlsFilter && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded bg-white">
                  {targetUrlsLoading ? (
                    <div className="p-3 text-center">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <div className="text-xs text-gray-500 mt-1">Loading target URLs...</div>
                    </div>
                  ) : availableTargetUrls.length > 0 ? (
                    <div>
                      {/* Toggle for match data filtering */}
                      {hasMatchDataCount > 0 && (
                        <div className="p-2 border-b border-gray-100">
                          <button
                            onClick={() => setOnlyMatchDataUrls(!onlyMatchDataUrls)}
                            className="flex items-center justify-between w-full text-xs hover:bg-gray-50 rounded px-1 py-1"
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                onlyMatchDataUrls ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                              }`}>
                                {onlyMatchDataUrls && (
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-gray-700">Only URLs with analysis data</span>
                            </div>
                            <span className="text-gray-500">({hasMatchDataCount})</span>
                          </button>
                        </div>
                      )}
                      <div className="p-1 space-y-1">
                      {availableTargetUrls.map((targetUrl) => {
                        const isSelected = selectedTargetUrls.includes(targetUrl.url);
                        const domain = (() => {
                          try {
                            return new URL(targetUrl.url).hostname.replace('www.', '');
                          } catch {
                            return targetUrl.url;
                          }
                        })();
                        
                        return (
                          <button
                            key={targetUrl.url}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTargetUrls(prev => prev.filter(url => url !== targetUrl.url));
                              } else {
                                setSelectedTargetUrls(prev => [...prev, targetUrl.url]);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900 truncate" title={targetUrl.url}>
                                {domain}
                              </div>
                              <div className="text-xs text-gray-500 truncate" title={targetUrl.url}>
                                {new URL(targetUrl.url).pathname || '/'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {targetUrl.usageCount} domain{targetUrl.usageCount !== 1 ? 's' : ''} • {targetUrl.type === 'original' ? 'Original' : targetUrl.type === 'analyzed' ? 'Analyzed' : 'AI suggested'}
                                {targetUrl.hasMatchData && <span className="text-blue-500 ml-1">• Analysis data</span>}
                              </div>
                            </div>
                            {isSelected && <CheckIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  ) : selectedClients.length === 0 && userType === 'internal' && availableClients.length > 1 ? (
                    <div className="p-3 text-center text-xs text-gray-500">
                      Select a client first to see their target URLs
                      <div className="text-xs text-gray-400 mt-1">Too many URLs to show all at once</div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500">
                      No target URLs found
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Projects Dropdown - Sophisticated multi-select */}
        {availableProjects.length > 0 && (
          <div ref={projectDropdownRef} className="mb-3">
            <div className="text-xs font-medium text-gray-500 mb-1.5">Projects</div>
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:border-gray-300 bg-white"
              >
                <span className="text-gray-700 truncate">
                  {selectedProjects.length === 0 
                    ? 'All projects' 
                    : selectedProjects.length === 1
                    ? availableProjects.find(p => p.id === selectedProjects[0])?.name
                    : `${selectedProjects.length} selected`}
                </span>
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                  showProjectDropdown ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Dropdown Panel */}
              {showProjectDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
                  {/* Search */}
                  <div className="p-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="px-2 py-1 border-b border-gray-100 flex justify-between">
                    <button
                      onClick={() => {
                        if (selectedProjects.length === filteredProjects.length) {
                          setSelectedProjects([]);
                        } else {
                          setSelectedProjects(filteredProjects.map(p => p.id));
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {selectedProjects.length === filteredProjects.length ? 'Clear' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Project List */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredProjects.map(project => {
                      const isSelected = selectedProjects.includes(project.id);
                      const client = availableClients.find(c => c.id === project.clientId);
                      
                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProjects(prev => prev.filter(id => id !== project.id));
                            } else {
                              setSelectedProjects(prev => [...prev, project.id]);
                            }
                          }}
                          className={`w-full px-2 py-1.5 text-left hover:bg-gray-50 flex items-center justify-between ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-900 truncate">{project.name}</div>
                            {client && (
                              <div className="text-xs text-gray-500 truncate">
                                {userType === 'internal' ? client.name : `${client.name} brand`}
                              </div>
                            )}
                          </div>
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metric Filters - Ahrefs Style with Dropdowns */}
        <div className="space-y-2">
          {/* DR Filter */}
          <div>
            <button
              onClick={() => setShowDRFilter(!showDRFilter)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs border rounded-md hover:border-gray-300 transition-colors ${
                (minDR || maxDR) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <span className={`${(minDR || maxDR) ? 'text-blue-700' : 'text-gray-700'} truncate`}>
                DR {(minDR || maxDR) && `(${minDR || '0'}-${maxDR || '100'})`}
              </span>
              <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                showDRFilter ? 'rotate-180' : ''
              }`} />
            </button>
            {showDRFilter && (
              <div className="mt-1 flex gap-1">
                <input
                  type="number"
                  placeholder="From"
                  value={minDR}
                  onChange={(e) => setMinDR(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
                <input
                  type="number"
                  placeholder="To"
                  value={maxDR}
                  onChange={(e) => setMaxDR(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
              </div>
            )}
          </div>

          {/* Traffic Filter */}
          <div>
            <button
              onClick={() => setShowTrafficFilter(!showTrafficFilter)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs border rounded-md hover:border-gray-300 transition-colors ${
                (minTraffic || maxTraffic) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <span className={`${(minTraffic || maxTraffic) ? 'text-blue-700' : 'text-gray-700'} truncate`}>
                Traffic {(minTraffic || maxTraffic) && `(${minTraffic || '0'}-${maxTraffic || '∞'})`}
              </span>
              <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                showTrafficFilter ? 'rotate-180' : ''
              }`} />
            </button>
            {showTrafficFilter && (
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  placeholder="From"
                  value={minTraffic}
                  onChange={(e) => setMinTraffic(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
                <input
                  type="text"
                  placeholder="To"
                  value={maxTraffic}
                  onChange={(e) => setMaxTraffic(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
              </div>
            )}
          </div>

          {/* Price Filter */}
          <div>
            <button
              onClick={() => setShowPriceFilter(!showPriceFilter)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs border rounded-md hover:border-gray-300 transition-colors ${
                (minPrice || maxPrice) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <span className={`${(minPrice || maxPrice) ? 'text-blue-700' : 'text-gray-700'} truncate`}>
                Price ($) {(minPrice || maxPrice) && `(${minPrice || '0'}-${maxPrice || '∞'})`}
              </span>
              <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                showPriceFilter ? 'rotate-180' : ''
              }`} />
            </button>
            {showPriceFilter && (
              <div className="mt-1 flex gap-1">
                <input
                  type="number"
                  placeholder="From"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
                <input
                  type="number"
                  placeholder="To"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 min-w-0 px-1.5 py-1 text-xs border border-gray-200 rounded bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Apply Button - Follows content naturally */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={updateFilters}
            disabled={isApplying}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              'Apply Filters'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}