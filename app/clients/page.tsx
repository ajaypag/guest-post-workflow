'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client } from '@/types/user';
import { Building2, Plus, Users, Globe, CheckCircle, XCircle, Clock, Edit, Trash2, X } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    website: '',
    targetPages: ''
  });
  const [editClient, setEditClient] = useState({
    name: '',
    website: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const session = sessionStorage.getSession();
    if (!session) return;

    try {
      const allClients = await clientStorage.getAllClients();
      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = sessionStorage.getSession();
    if (!session) return;

    try {
      // Parse target pages from textarea (one URL per line)
      const urls = newClient.targetPages
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const client = await clientStorage.createClient({
        name: newClient.name,
        website: newClient.website,
        targetPages: [],
        assignedUsers: [session.userId],
        createdBy: session.userId
      });

      // Add target pages if provided
      if (urls.length > 0) {
        await clientStorage.addTargetPages(client.id, urls);
      }

      setNewClient({ name: '', website: '', targetPages: '' });
      setShowNewClientForm(false);
      await loadClients();
    } catch (error: any) {
      alert('Error creating client: ' + error.message);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      const updatedClient = await clientStorage.updateClient(editingClient.id, {
        name: editClient.name,
        website: editClient.website
      });
      
      if (updatedClient) {
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
      const success = await clientStorage.deleteClient(client.id);
      if (success) {
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
              <button
                onClick={() => setShowNewClientForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </button>
            </div>
          </div>

          {/* New Client Form */}
          {showNewClientForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Create New Client</h3>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
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
                      value={newClient.website}
                      onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Pages (one URL per line)
                  </label>
                  <textarea
                    value={newClient.targetPages}
                    onChange={(e) => setNewClient({ ...newClient, targetPages: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="https://example.com/blog&#10;https://anotherdomain.com/articles&#10;https://techblog.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Add initial target pages. You can add more later.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Create Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

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
                        <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
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

                    <div className="mt-4 pt-4 border-t">
                      <Link
                        href={`/clients/${client.id}`}
                        className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Manage Target Pages
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
              <button
                onClick={() => setShowNewClientForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Client
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}