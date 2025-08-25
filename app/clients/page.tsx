'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';
import { Building2, Plus, Users, Globe, CheckCircle, XCircle, Clock, Edit, Archive, ArchiveRestore, X, BarChart2, AlertCircle, ArrowLeft, Search, Filter, ChevronDown, Package, TrendingUp } from 'lucide-react';
import AccountMultiSelectFilter from '@/components/AccountMultiSelectFilter';

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [accountName, setAccountName] = useState<{ [key: string]: string }>({});
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'prospect'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsWithCounts, setAccountsWithCounts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editClient, setEditClient] = useState({
    name: '',
    website: '',
    description: ''
  });

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
    }
    
    // Load accounts list for filter (internal users only)
    if (session?.userType === 'internal') {
      loadAccounts();
    }
    
    loadClients();
  }, [searchParams, showArchived, searchQuery, filterType, selectedAccountIds, currentPage]);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        const accountsList = data.accounts || [];
        setAccounts(accountsList);
        
        // Get client counts for each account
        const accountsWithClientCounts = await Promise.all(
          accountsList.map(async (account: any) => {
            try {
              const clientsResponse = await fetch(`/api/clients?accountId=${account.id}&limit=1`);
              if (clientsResponse.ok) {
                const clientsData = await clientsResponse.json();
                return {
                  ...account,
                  clientCount: clientsData.pagination?.total || 0
                };
              }
            } catch (e) {
              console.error(`Error getting client count for account ${account.id}:`, e);
            }
            return { ...account, clientCount: 0 };
          })
        );
        
        setAccountsWithCounts(accountsWithClientCounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadClients = async (page: number = currentPage) => {
    const session = sessionStorage.getSession();
    if (!session) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(showArchived && { includeArchived: 'true' }),
        ...(searchQuery && { search: searchQuery }),
        ...(userType === 'internal' && filterType !== 'all' && { filterType }),
        ...(selectedAccountIds.length > 0 && { accountIds: selectedAccountIds.join(',') })
      });
      const response = await fetch(`/api/clients?${params}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setPagination(data.pagination || {});
        
        // Load account names for clients with accountIds
        const clientsList = data.clients || [];
        const accountIds = clientsList
          .filter((client: any) => client.accountId)
          .map((client: any) => client.accountId);
        
        if (accountIds.length > 0) {
          const uniqueAccountIds = [...new Set(accountIds)];
          const accountsResponse = await fetch('/api/accounts?ids=' + uniqueAccountIds.join(','));
          if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            const accountMap: { [key: string]: string } = {};
            accountsData.accounts?.forEach((account: any) => {
              accountMap[account.id] = account.companyName || account.name || account.email;
            });
            setAccountName(accountMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editClient.name,
          website: editClient.website,
          description: editClient.description
        })
      });
      
      if (response.ok) {
        setEditingClient(null);
        setEditClient({ name: '', website: '', description: '' });
        await loadClients();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update client');
      }
    } catch (error: any) {
      alert('Error updating client: ' + error.message);
    }
  };

  const handleArchiveClient = async (client: Client) => {
    const reason = prompt(`Archive "${client.name}"?\n\nPlease provide a reason (optional):`);
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const response = await fetch(`/api/clients/${client.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || 'No reason provided' })
      });
      
      if (response.ok) {
        await loadClients();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to archive client');
      }
    } catch (error: any) {
      alert('Error archiving client: ' + error.message);
    }
  };

  const handleRestoreClient = async (client: Client) => {
    if (!confirm(`Restore "${client.name}" from archive?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client.id}/archive`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        await loadClients();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to restore client');
      }
    } catch (error: any) {
      alert('Error restoring client: ' + error.message);
    }
  };

  const startEditClient = (client: Client) => {
    setEditingClient(client);
    setEditClient({
      name: client.name,
      website: client.website,
      description: (client as any).description || ''
    });
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setEditClient({ name: '', website: '', description: '' });
  };

  const getStatusCounts = (client: Client) => {
    const pages = (client as any).targetPages || [];
    const active = pages.filter((p: any) => p.status === 'active').length;
    const inactive = pages.filter((p: any) => p.status === 'inactive').length;
    const completed = pages.filter((p: any) => p.status === 'completed').length;
    return { active, inactive, completed, total: pages.length };
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            {userType === 'account' && (
              <button
                onClick={() => router.push('/account/dashboard')}
                className="mb-4 inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </button>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {userType === 'account' ? 'Your Brands' : 'Client Management'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {userType === 'account' 
                    ? `${pagination.total || clients.length} brands in your portfolio`
                    : `${pagination.total || clients.length} clients • ${clients.filter(c => !c.archivedAt).length} active`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {userType === 'internal' && (
                  <Link
                    href="/admin/orphaned-clients"
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300"
                  >
                    <AlertCircle className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Orphaned</span>
                    <span className="sm:hidden">Orphan</span>
                  </Link>
                )}
                <Link
                  href="/clients/new"
                  className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  {userType === 'account' ? 'New Brand' : 'New Client'}
                </Link>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${userType === 'account' ? 'brands' : 'clients'} by name or website...`}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {userType === 'internal' && (
                    <AccountMultiSelectFilter
                      accounts={accountsWithCounts}
                      selectedAccountIds={selectedAccountIds}
                      onChange={setSelectedAccountIds}
                      className="w-full sm:w-auto"
                    />
                  )}
                  
                  <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50 w-full sm:w-auto">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 whitespace-nowrap">Show Archived</span>
                  </label>
                </div>
              </div>
            </div>
          </div>


          {/* Edit Client Form */}
          {editingClient && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Edit Client</h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditClient} className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {userType === 'account' ? 'Brand Name' : 'Client Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editClient.name}
                        onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        required
                        value={editClient.website}
                        onChange={(e) => setEditClient({ ...editClient, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editClient.description}
                      onChange={(e) => setEditClient({ ...editClient, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Brief description of the client/brand..."
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Update Client
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Clients Display */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading clients...</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-4">
                {clients.map((client) => {
                  const stats = getStatusCounts(client);
                  const orderStats = (client as any).orderStats || { orderCount: 0, totalRevenue: 0, recentOrderDate: null, activeOrders: 0, completedOrders: 0 };
                  const isArchived = !!(client as any).archivedAt;
                  return (
                    <div 
                      key={client.id} 
                      className={`bg-white rounded-lg shadow p-4 ${isArchived ? 'opacity-60' : ''}`}
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {client.name}
                          </h3>
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 flex items-center truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{client.website?.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                          </a>
                          {userType === 'internal' && (client as any).accountId && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {accountName[(client as any).accountId] || 'Account'}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => startEditClient(client)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          {isArchived ? (
                            <button
                              onClick={() => handleRestoreClient(client)}
                              className="text-gray-400 hover:text-green-600 p-1"
                            >
                              <ArchiveRestore className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveClient(client)}
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Pages</div>
                          <div className="text-sm font-semibold">{stats.active}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Active</div>
                          <div className="text-sm font-semibold text-blue-600">{orderStats.activeOrders}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Complete</div>
                          <div className="text-sm font-semibold text-green-600">{orderStats.completedOrders}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/clients/${client.id}/target-pages`}
                          className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          Target URLs
                        </Link>
                        <Link
                          href={`/clients/${client.id}/bulk-analysis`}
                          className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded"
                        >
                          Analysis
                        </Link>
                        <Link
                          href={`/orders/new?clientId=${client.id}`}
                          className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
                        >
                          New Order
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {userType === 'account' ? 'Brand' : 'Client'}
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Pages
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quick Actions
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">More</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => {
                      const stats = getStatusCounts(client);
                      const orderStats = (client as any).orderStats || { orderCount: 0, totalRevenue: 0, recentOrderDate: null, activeOrders: 0, completedOrders: 0 };
                      const isArchived = !!(client as any).archivedAt;
                      return (
                        <tr 
                          key={client.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${isArchived ? 'opacity-60' : ''}`}
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {client.name}
                                </div>
                                <a
                                  href={client.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{client.website?.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                                </a>
                                {userType === 'internal' && (client as any).accountId && (
                                  <div className="text-xs text-gray-500 mt-1 flex items-center truncate">
                                    <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{accountName[(client as any).accountId] || 'Account'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link
                              href={`/clients/${client.id}/target-pages`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {stats.active > 0 ? stats.active : '0'}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm">
                              <span className="font-medium text-blue-600">{orderStats.activeOrders}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-600">{orderStats.completedOrders}</span>
                            </div>
                            <div className="text-xs text-gray-500">active / complete</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/clients/${client.id}/target-pages`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                <Globe className="w-3 h-3 mr-1" />
                                Target URLs
                              </Link>
                              <Link
                                href={`/clients/${client.id}/bulk-analysis`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded"
                              >
                                <BarChart2 className="w-3 h-3 mr-1" />
                                Analysis
                              </Link>
                              <Link
                                href={`/orders/new?clientId=${client.id}`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Order
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => startEditClient(client)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {isArchived ? (
                                <button
                                  onClick={() => handleRestoreClient(client)}
                                  className="text-gray-400 hover:text-green-600 p-1"
                                  title="Restore"
                                >
                                  <ArchiveRestore className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleArchiveClient(client)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Archive"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* Empty State */}
          {!isLoading && clients.length === 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="text-center py-16 px-4">
                {searchQuery || (filterType !== 'all' && userType === 'internal') || selectedAccountIds.length > 0 ? (
                  <>
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No results found
                    </h3>
                    <p className="text-gray-600 mb-4 max-w-md mx-auto">
                      Try adjusting your search or filters to find what you're looking for.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                        setSelectedAccountIds([]);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                    >
                      Clear Filters
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                      <Plus className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {userType === 'account' ? 'Add your first brand' : 'Add your first client'}
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      {userType === 'account' 
                        ? 'Get started by adding your brand. You\'ll be able to create orders, add target pages, and track all your guest post campaigns in one place.'
                        : 'Start managing guest post campaigns by adding your first client. Track orders, monitor progress, and manage all campaign details.'}
                    </p>
                    <Link
                      href="/clients/new"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {userType === 'account' ? 'Add Brand' : 'Add Client'}
                    </Link>
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">What you can do after adding:</p>
                      <div className="flex justify-center gap-6 text-xs text-gray-600">
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          Create orders
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          Add target pages
                        </span>
                        <span className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          Track campaigns
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && clients.length > 0 && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>
                  Showing {((currentPage - 1) * 12) + 1} to {Math.min(currentPage * 12, pagination.total)} of {pagination.total} results
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    if (pagination.hasPrev) {
                      setCurrentPage(currentPage - 1);
                    }
                  }}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return page === 1 || 
                           page === pagination.totalPages || 
                           Math.abs(page - currentPage) <= 2;
                  })
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 py-2 text-sm text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium border ${
                          currentPage === page
                            ? 'bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                
                <button
                  onClick={() => {
                    if (pagination.hasNext) {
                      setCurrentPage(currentPage + 1);
                    }
                  }}
                  disabled={!pagination.hasNext}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsPageContent />
    </Suspense>
  );
}