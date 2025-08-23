'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';
import { Building2, Plus, Users, Globe, CheckCircle, XCircle, Clock, Edit, Archive, ArchiveRestore, X, BarChart2, AlertCircle, ArrowLeft, Search, Filter, ChevronDown, Package, TrendingUp } from 'lucide-react';

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
    
    loadClients();
  }, [searchParams, showArchived, searchQuery, filterType, currentPage]);

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
        ...(userType === 'internal' && filterType !== 'all' && { filterType })
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
              accountMap[account.id] = account.name || account.email;
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {userType === 'account' ? 'Your Brands' : 'Client Management'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {userType === 'account' 
                    ? `${pagination.total || clients.length} brands in your portfolio`
                    : `${pagination.total || clients.length} clients • ${clients.filter(c => !c.archivedAt).length} active`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {userType === 'internal' && (
                  <Link
                    href="/admin/orphaned-clients"
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Orphaned
                  </Link>
                )}
                <Link
                  href="/clients/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
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

                {/* Filters */}
                <div className="flex gap-2">
                  {userType === 'internal' && (
                    <div className="relative">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Type: {filterType === 'all' ? 'All' : filterType === 'client' ? 'Clients' : 'Prospects'}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </button>
                      {showFilters && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button
                            onClick={() => { setFilterType('all'); setShowFilters(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            All Types
                          </button>
                          <button
                            onClick={() => { setFilterType('client'); setShowFilters(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Clients Only
                          </button>
                          <button
                            onClick={() => { setFilterType('prospect'); setShowFilters(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Prospects Only
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Archived</span>
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

          {/* Clients Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading clients...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => {
              const stats = getStatusCounts(client);
              const orderStats = (client as any).orderStats || { orderCount: 0, totalRevenue: 0, recentOrderDate: null, activeOrders: 0, completedOrders: 0 };
              const isArchived = !!(client as any).archivedAt;
              return (
                <div key={client.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${isArchived ? 'opacity-75' : ''}`}>
                  <div className="p-5">
                    {/* Header with actions */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link href={`/clients/${client.id}`}>
                          <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors leading-tight">
                            {client.name}
                          </h3>
                        </Link>
                        <div className="mt-2 flex flex-col gap-1">
                          <a
                            href={client.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            {client.website?.replace(/^https?:\/\//, '').replace(/^www\./, '') || client.website}
                          </a>
                          
                          {/* Status badges */}
                          <div className="flex items-center gap-2 mt-1">
                            {userType === 'internal' && (
                              <>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                                  (client as any).clientType === 'prospect' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {(client as any).clientType === 'prospect' ? 'Prospect' : 'Client'}
                                </span>
                                {(client as any).accountId && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                                    <Users className="w-3 h-3 mr-1" />
                                    {accountName[(client as any).accountId] || 'Account'}
                                  </span>
                                )}
                              </>
                            )}
                            {isArchived && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-3">
                        <button
                          onClick={() => startEditClient(client)}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                          title="Edit client"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isArchived ? (
                          <button
                            onClick={() => handleRestoreClient(client)}
                            className="text-gray-400 hover:text-green-600 transition-colors p-1"
                            title="Restore client"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveClient(client)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Archive client"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="mb-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-semibold text-gray-900">{stats.active}</div>
                          <div className="text-xs text-gray-600 font-medium">Active Pages</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-semibold text-gray-900">{orderStats.activeOrders}</div>
                          <div className="text-xs text-gray-600 font-medium">Active Orders</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-lg font-semibold text-gray-900">{orderStats.completedOrders}</div>
                          <div className="text-xs text-gray-600 font-medium">Completed</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Link
                        href={`/orders/new?clientId=${client.id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Order
                      </Link>
                      <Link
                        href={`/clients/${client.id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {userType === 'account' ? 'Manage Brand' : 'Manage Client'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && clients.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterType !== 'all' ? 
                  'No results found' : 
                  (userType === 'account' ? 'No brands yet' : 'No clients yet')
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' ? 
                  'Try adjusting your search or filters' :
                  (userType === 'account' 
                    ? 'Add your first brand to start creating guest post orders.'
                    : 'Get started by creating your first client.')
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <Link
                  href="/clients/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {userType === 'account' ? 'Add Your First Brand' : 'Create First Client'}
                </Link>
              )}
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