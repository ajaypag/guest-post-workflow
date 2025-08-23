'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Client {
  id: string;
  name: string;
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

export default function VettedSitesFilters({ 
  availableClients, 
  availableAccounts,
  availableProjects, 
  currentFilters,
  userType 
}: VettedSitesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Ensure currentFilters is an object
  const filters = currentFilters || {};
  
  // Filter state
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

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    clients: true,
    accounts: true,
    quality: true,
    availability: true,
    metrics: false,
    view: true,
  });

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

    // Reset to page 1 when filters change
    params.set('page', '1');
    
    // Use router.push for smooth navigation without full page reload
    router.push(`/vetted-sites?${params.toString()}`, { scroll: false });
  };

  // Debounced search - removed to prevent infinite loops
  // The search will be applied when user clicks "Apply Filters"

  // Sync state with URL parameters when they change
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

  const handleClientToggle = (clientId: string) => {
    const newSelected = selectedClients.includes(clientId)
      ? selectedClients.filter(id => id !== clientId)
      : [...selectedClients, clientId];
    
    setSelectedClients(newSelected);
    
    // Clear project selection if not all clients are selected
    if (newSelected.length !== availableClients.length) {
      setSelectedProject('');
    }
  };

  const handleAccountToggle = (accountId: string) => {
    const newSelected = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];
    
    setSelectedAccounts(newSelected);
  };

  const handleQualityToggle = (status: string) => {
    const newSelected = qualificationStatus.includes(status)
      ? qualificationStatus.filter(s => s !== status)
      : [...qualificationStatus, status];
    
    setQualificationStatus(newSelected);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const hasActiveFilters = search || 
    selectedClients.length > 0 || 
    selectedAccounts.length > 0 ||
    selectedProject || 
    qualificationStatus.join(',') !== 'high_quality,good_quality' ||
    view !== 'all' ||
    availableOnly ||
    minDR || maxDR || minTraffic || maxTraffic || minPrice || maxPrice;

  // Filter projects based on selected clients
  const filteredProjects = selectedClients.length > 0
    ? availableProjects.filter(project => selectedClients.includes(project.clientId))
    : availableProjects;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Domains
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter domain name..."
              className="w-full pl-10 pr-3 py-2 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-200 hover:shadow-sm"
            />
          </div>
        </div>

        {/* View Filter */}
        <div>
          <button
            onClick={() => toggleSection('view')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="block text-sm font-medium text-gray-700">View</span>
            {expandedSections.view ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.view && (
            <div className="mt-2 space-y-2">
              {[
                { value: 'all', label: 'All (except hidden)' },
                { value: 'bookmarked', label: 'Bookmarked only' },
                { value: 'hidden', label: 'Hidden only' },
              ].map((option) => (
                <label key={option.value} className="flex items-center text-sm">
                  <input
                    type="radio"
                    value={option.value}
                    checked={view === option.value}
                    onChange={(e) => setView(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Client Filter - only show for internal users or multi-client accounts */}
        {(userType === 'internal' || availableClients.length > 1) && (
          <div>
            <button
              onClick={() => toggleSection('clients')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="block text-sm font-medium text-gray-700">
                Clients {selectedClients.length > 0 && `(${selectedClients.length})`}
              </span>
              {expandedSections.clients ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.clients && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {availableClients.map((client) => (
                  <label key={client.id} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-gray-700">{client.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Filter - only show for internal users */}
        {userType === 'internal' && availableAccounts.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('accounts')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="block text-sm font-medium text-gray-700">
                Accounts {selectedAccounts.length > 0 && `(${selectedAccounts.length})`}
              </span>
              {expandedSections.accounts ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.accounts && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {availableAccounts.map((account) => (
                  <label key={account.id} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleAccountToggle(account.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-2">
                      <div className="text-gray-700 font-medium">{account.name}</div>
                      <div className="text-xs text-gray-500">{account.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Filter - only show if projects are available */}
        {filteredProjects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
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

        {/* Qualification Status */}
        <div>
          <button
            onClick={() => toggleSection('quality')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="block text-sm font-medium text-gray-700">
              Quality {qualificationStatus.length > 0 && `(${qualificationStatus.length})`}
            </span>
            {expandedSections.quality ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.quality && (
            <div className="mt-2 space-y-2">
              {[
                { value: 'high_quality', label: 'High Quality' },
                { value: 'good_quality', label: 'Good Quality' },
                { value: 'marginal_quality', label: 'Marginal' },
                { value: 'disqualified', label: 'Disqualified' },
                { value: 'pending', label: 'Pending' },
              ].map((status) => (
                <label key={status.value} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={qualificationStatus.includes(status.value)}
                    onChange={() => handleQualityToggle(status.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <button
            onClick={() => toggleSection('availability')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="block text-sm font-medium text-gray-700">Availability</span>
            {expandedSections.availability ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.availability && (
            <div className="mt-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-700">Available only</span>
              </label>
            </div>
          )}
        </div>

        {/* Advanced Metrics */}
        <div>
          <button
            onClick={() => toggleSection('metrics')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="block text-sm font-medium text-gray-700">Metrics</span>
            {expandedSections.metrics ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.metrics && (
            <div className="mt-2 space-y-4">
              {/* Domain Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Domain Rating
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={minDR}
                    onChange={(e) => setMinDR(e.target.value)}
                    placeholder="Min"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="number"
                    value={maxDR}
                    onChange={(e) => setMaxDR(e.target.value)}
                    placeholder="Max"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Traffic */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Monthly Traffic
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={minTraffic}
                    onChange={(e) => setMinTraffic(e.target.value)}
                    placeholder="Min"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="number"
                    value={maxTraffic}
                    onChange={(e) => setMaxTraffic(e.target.value)}
                    placeholder="Max"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Guest Post Price ($)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 hover:shadow-sm"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Apply Filters Button */}
        <button
          onClick={updateFilters}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 hover:shadow-md transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}