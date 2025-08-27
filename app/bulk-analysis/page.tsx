'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client } from '@/types/user';
import { 
  Building2, 
  Users, 
  FolderOpen, 
  Search, 
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Filter,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  BarChart2,
  Package,
  Calendar,
  X,
  Check
} from 'lucide-react';

interface ExtendedClient extends Client {
  clientType?: 'prospect' | 'client';
  convertedFromProspectAt?: Date;
  projectCount?: number;
  domainCount?: number;
  workflowCount?: number;
  lastActivityAt?: Date;
}

interface BulkAnalysisProject {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: string;
  domainCount: number;
  qualifiedCount: number;
  workflowCount: number;
  lastActivityAt?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    website: string;
  };
}

export default function BulkAnalysisDashboard() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllClients, setShowAllClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [session, setSession] = useState<any>(null);
  const [accounts, setAccounts] = useState<Array<{
    id: string, 
    email: string, 
    contactName: string, 
    companyName: string,
    orderCount?: number,
    totalRevenue?: number,
    createdAt?: string,
    status?: string
  }>>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [showConversionModal, setShowConversionModal] = useState<string | null>(null);
  const [conversionNotes, setConversionNotes] = useState('');
  const [stats, setStats] = useState({
    totalProspects: 0,
    activeClients: 0,
    activeProjects: 0,
    domainsAnalyzed: 0
  });

  useEffect(() => {
    loadData();
  }, [showAllClients]);
  
  useEffect(() => {
    if (session?.userType === 'internal') {
      loadAccounts();
    }
  }, [session]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
        setAccountSearchQuery('');
      }
    };
    
    if (showAccountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountDropdown]);
  
  const loadAccounts = async () => {
    try {
      // Get the full account data with stats
      const response = await fetch('/api/accounts', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded accounts:', data);
        // Extract accounts from the response
        const accountsList = data.accounts || [];
        // Transform the data to include the fields we need
        const transformedAccounts = accountsList.map((account: any) => ({
          id: account.id,
          email: account.email,
          contactName: account.contactName || account.name,  // Handle both field names
          companyName: account.companyName || account.company,  // Handle both field names
          orderCount: account.orderCount || 0,
          totalRevenue: account.totalRevenue || 0,
          createdAt: account.createdAt,
          status: account.status
        }));
        setAccounts(transformedAccounts);
      } else {
        console.error('Failed to load accounts:', response.status);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const currentSession = AuthService.getSession();
      if (!currentSession) return;
      
      setSession(currentSession);

      // Load clients based on filter
      let loadedClients: ExtendedClient[] = [];
      if (!showAllClients) {
        loadedClients = await clientStorage.getUserClients(currentSession.userId);
      } else {
        loadedClients = await clientStorage.getAllClients();
      }

      // Enrich with actual stats from database
      const enrichedClients = await Promise.all(
        loadedClients.map(async (client) => {
          try {
            // Fetch actual project data from the API
            const projectResponse = await fetch(`/api/clients/${client.id}/projects`, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            let projectCount = 0;
            let domainCount = 0;
            let workflowCount = 0;
            let lastActivityAt = null;
            
            if (projectResponse.ok) {
              const { projects } = await projectResponse.json();
              projectCount = projects.length;
              
              // Sum up domains and workflows across all projects
              for (const project of projects) {
                domainCount += project.domainCount || 0;
                workflowCount += project.workflowCount || 0;
                if (project.lastActivityAt && (!lastActivityAt || new Date(project.lastActivityAt) > new Date(lastActivityAt))) {
                  lastActivityAt = project.lastActivityAt;
                }
              }
            }
            
            return {
              ...client,
              clientType: (client as any).clientType || 'client',
              projectCount,
              domainCount,
              workflowCount,
              lastActivityAt: lastActivityAt ? new Date(lastActivityAt) : undefined
            };
          } catch (error) {
            console.error(`Error fetching stats for client ${client.id}:`, error);
            // Return client with zero counts on error
            return {
              ...client,
              clientType: (client as any).clientType || 'client',
              projectCount: 0,
              domainCount: 0,
              workflowCount: 0,
              lastActivityAt: undefined
            };
          }
        })
      );

      setClients(enrichedClients);

      // Calculate stats
      const prospects = enrichedClients.filter(c => c.clientType === 'prospect');
      const activeClients = enrichedClients.filter(c => c.clientType === 'client');
      
      setStats({
        totalProspects: prospects.length,
        activeClients: activeClients.length,
        activeProjects: enrichedClients.reduce((sum, c) => sum + (c.projectCount || 0), 0),
        domainsAnalyzed: enrichedClients.reduce((sum, c) => sum + (c.domainCount || 0), 0)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToClient = async (prospectId: string) => {
    try {
      // Update client type
      await clientStorage.updateClient(prospectId, {
        clientType: 'client',
        convertedFromProspectAt: new Date(),
        conversionNotes
      } as any);
      
      // Reload data
      await loadData();
      setShowConversionModal(null);
      setConversionNotes('');
    } catch (error) {
      console.error('Error converting prospect to client:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    // Search filter
    if (searchQuery && !client.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !client.website.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Account filter (for internal users)
    if (selectedAccountId && session?.userType === 'internal') {
      // Filter by selected account ID
      const clientAccountId = (client as any).accountId;
      if (clientAccountId !== selectedAccountId) return false;
    }
    
    return true;
  });

  const prospects = filteredClients.filter(c => c.clientType === 'prospect');
  const regularClients = filteredClients.filter(c => c.clientType === 'client');

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bulk Analysis Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage prospects and clients, track bulk analysis projects</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Prospects</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalProspects}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeClients}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Domains Analyzed</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.domainsAnalyzed}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              {/* All/Mine Toggle */}
              <div className="bg-white rounded-lg p-1 flex border border-gray-200">
                <button
                  onClick={() => setShowAllClients(false)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded transition-colors ${
                    !showAllClients 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  My Clients
                </button>
                <button
                  onClick={() => setShowAllClients(true)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded transition-colors ${
                    showAllClients 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All Clients
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name or website..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto lg:w-64"
              />
              
              {/* Account Filter for Internal Users */}
              {session?.userType === 'internal' && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto lg:w-64 flex items-center justify-between gap-2 bg-white hover:bg-gray-50"
                  >
                    <span className="truncate">
                      {selectedAccountId 
                        ? accounts.find(a => a.id === selectedAccountId)?.companyName || 
                          accounts.find(a => a.id === selectedAccountId)?.contactName ||
                          accounts.find(a => a.id === selectedAccountId)?.email
                        : 'Filter by account...'}
                    </span>
                    <div className="flex items-center gap-1">
                      {selectedAccountId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountId('');
                          }}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                  
                  {showAccountDropdown && (
                    <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="p-2 border-b">
                        <input
                          type="text"
                          placeholder="Search accounts..."
                          value={accountSearchQuery}
                          onChange={(e) => setAccountSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {accounts
                          .filter(account => {
                            const query = accountSearchQuery.toLowerCase();
                            return !query || 
                              account.email?.toLowerCase().includes(query) ||
                              account.contactName?.toLowerCase().includes(query) ||
                              account.companyName?.toLowerCase().includes(query);
                          })
                          .map(account => (
                            <button
                              key={account.id}
                              onClick={() => {
                                setSelectedAccountId(account.id);
                                setShowAccountDropdown(false);
                                setAccountSearchQuery('');
                              }}
                              className={`w-full px-3 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 ${
                                selectedAccountId === account.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-sm text-gray-900">
                                    {account.companyName || account.contactName || 'Unnamed Account'}
                                  </div>
                                  {account.status === 'active' && (
                                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mb-1">
                                  {account.contactName && account.companyName && `${account.contactName} • `}
                                  {account.email}
                                </div>
                                <div className="flex gap-3 text-xs text-gray-500">
                                  {account.orderCount !== undefined && (
                                    <span>{account.orderCount} orders</span>
                                  )}
                                  {account.totalRevenue !== undefined && account.totalRevenue > 0 && (
                                    <span>${(account.totalRevenue / 100).toLocaleString()}</span>
                                  )}
                                  {account.createdAt && (
                                    <span>Since {new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                  )}
                                </div>
                              </div>
                              {selectedAccountId === account.id && (
                                <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                              )}
                            </button>
                          ))}
                        {accounts.filter(account => {
                          const query = accountSearchQuery.toLowerCase();
                          return !query || 
                            account.email?.toLowerCase().includes(query) ||
                            account.contactName?.toLowerCase().includes(query) ||
                            account.companyName?.toLowerCase().includes(query);
                        }).length === 0 && (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            No accounts found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/clients/new')}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Client</span>
                <span className="sm:hidden">Client</span>
              </button>
            </div>
          </div>

          {/* All Clients Table */}
          {filteredClients.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Clients</h2>
              
              {/* Mobile Cards */}
              <div className="block lg:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredClients.map((client) => (
                    <div key={client.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{client.name}</h3>
                          <p className="text-sm text-gray-500">{client.website}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          client.clientType === 'prospect' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {client.clientType === 'prospect' ? 'Prospect' : 'Client'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Projects:</span>
                          <span className="ml-1 font-medium">{client.projectCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Workflows:</span>
                          <span className="ml-1 font-medium">{client.workflowCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Domains:</span>
                          <span className="ml-1 font-medium">{client.domainCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Active:</span>
                          <span className="ml-1 font-medium">
                            {client.lastActivityAt 
                              ? new Date(client.lastActivityAt).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/clients/${client.id}/bulk-analysis`)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          View Analysis
                        </button>
                        <button
                          onClick={() => router.push(`/clients/${client.id}`)}
                          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domains</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.website}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            client.clientType === 'prospect' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {client.clientType === 'prospect' ? 'Prospect' : 'Client'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{client.projectCount || 0} active</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{client.workflowCount || 0} total</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{client.domainCount || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {client.lastActivityAt 
                              ? new Date(client.lastActivityAt).toLocaleDateString()
                              : 'No activity'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => router.push(`/clients/${client.id}/bulk-analysis`)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <BarChart2 className="w-4 h-4 mr-1" />
                              Bulk Analysis
                            </button>
                            <button
                              onClick={() => router.push(`/clients/${client.id}`)}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredClients.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="max-w-sm mx-auto">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : selectedAccountId
                    ? `No clients found for the selected account`
                    : 'Get started by creating your first client'}
                </p>
                {!searchQuery && !selectedAccountId && (
                  <button
                    onClick={() => router.push('/clients/new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Client
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Conversion Modal */}
        {showConversionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Convert Prospect to Client</h3>
              <p className="text-gray-600 mb-4">
                Converting this prospect will enable full client features including workflow creation.
              </p>
              <textarea
                value={conversionNotes}
                onChange={(e) => setConversionNotes(e.target.value)}
                placeholder="Conversion notes (optional)..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => handleConvertToClient(showConversionModal)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Convert to Client
                </button>
                <button
                  onClick={() => {
                    setShowConversionModal(null);
                    setConversionNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}