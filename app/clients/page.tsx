'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';
import { Building2, Plus, Users, Globe, CheckCircle, XCircle, Clock, Edit, Trash2, X, BarChart2, AlertCircle } from 'lucide-react';

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [accountName, setAccountName] = useState<{ [key: string]: string }>({});
  const [editClient, setEditClient] = useState({
    name: '',
    website: ''
  });

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
    }
    
    loadClients();
  }, [searchParams]);

  const loadClients = async () => {
    const session = sessionStorage.getSession();
    if (!session) return;

    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        const clientsList = data.clients || [];
        setClients(clientsList);
        
        // Load account names for clients with accountIds
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
    }
  };


  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editClient.name,
          website: editClient.website
        })
      });
      
      if (response.ok) {
        setEditingClient(null);
        setEditClient({ name: '', website: '' });
        await loadClients();
      } else {
        alert('Failed to update client');
      }
    } catch (error: any) {
      alert('Error updating client: ' + error.message);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadClients();
      } else {
        alert('Failed to delete client');
      }
    } catch (error: any) {
      alert('Error deleting client: ' + error.message);
    }
  };

  const startEditClient = (client: Client) => {
    setEditingClient(client);
    setEditClient({
      name: client.name,
      website: client.website
    });
  };

  const cancelEdit = () => {
    setEditingClient(null);
    setEditClient({ name: '', website: '' });
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage your clients and their target pages
                </p>
              </div>
              <div className="flex items-center gap-2">
                {userType === 'internal' && (
                  <Link
                    href="/admin/orphaned-clients"
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Orphaned Clients
                  </Link>
                )}
                <Link
                  href="/clients/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Client
                </Link>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => {
              const stats = getStatusCounts(client);
              return (
                <div key={client.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              (client as any).clientType === 'prospect' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {(client as any).clientType === 'prospect' ? 'Prospect' : 'Client'}
                            </span>
                            {(client as any).accountId ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                                <Users className="w-3 h-3 mr-1" />
                                {accountName[(client as any).accountId] || 'Account'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 rounded-full">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                No Account
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditClient(client)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit client"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        <Globe className="w-3 h-3 mr-1" />
                        {client.website}
                      </a>
                    </div>

                    {/* Target Pages Stats */}
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {stats.active}
                        </div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-orange-600 flex items-center justify-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {stats.inactive}
                        </div>
                        <div className="text-xs text-gray-500">Inactive</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-blue-600 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {stats.completed}
                        </div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t space-y-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Manage Target Pages
                      </Link>
                      <Link
                        href={`/clients/${client.id}/bulk-analysis`}
                        className="w-full inline-flex justify-center items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                      >
                        <BarChart2 className="w-4 h-4 mr-2" />
                        Bulk Domain Analysis
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {clients.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first client.</p>
              <Link
                href="/clients/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Client
              </Link>
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