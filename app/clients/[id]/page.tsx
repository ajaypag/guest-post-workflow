'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client, TargetPage } from '@/types/user';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Clock, 
  Edit, Globe, ExternalLink, Check 
} from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'active' | 'inactive' | 'completed' | 'delete' | ''>('');
  const [newPages, setNewPages] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');

  useEffect(() => {
    loadClient();
  }, [params.id]);

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const handleAddPages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const urls = newPages
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) return;

    try {
      await clientStorage.addTargetPages(client.id, urls);
      setNewPages('');
      setShowAddForm(false);
      await loadClient();
    } catch (error: any) {
      alert('Error adding pages: ' + error.message);
    }
  };

  const handleBulkAction = async () => {
    if (!client || selectedPages.length === 0 || !bulkAction) return;

    const confirmMessage = bulkAction === 'delete' 
      ? `Delete ${selectedPages.length} selected pages?`
      : `Mark ${selectedPages.length} pages as ${bulkAction}?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (bulkAction === 'delete') {
        await clientStorage.removeTargetPages(client.id, selectedPages);
      } else {
        await clientStorage.updateTargetPageStatus(client.id, selectedPages, bulkAction);
      }
      
      setSelectedPages([]);
      setBulkAction('');
      await loadClient();
    } catch (error: any) {
      alert('Error performing bulk action: ' + error.message);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const toggleSelectAll = () => {
    const filteredPages = getFilteredPages();
    if (selectedPages.length === filteredPages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(filteredPages.map((page: any) => page.id));
    }
  };

  const getFilteredPages = () => {
    if (!client) return [];
    const pages = (client as any).targetPages || [];
    if (filter === 'all') return pages;
    return pages.filter((page: any) => page.status === filter);
  };

  const getStatusIcon = (status: TargetPage['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: TargetPage['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (!client) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div>Loading...</div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const filteredPages = getFilteredPages();
  const pages = (client as any)?.targetPages || [];
  const stats = {
    total: pages.length,
    active: pages.filter((p: any) => p.status === 'active').length,
    inactive: pages.filter((p: any) => p.status === 'inactive').length,
    completed: pages.filter((p: any) => p.status === 'completed').length,
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href="/clients"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Link>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center mt-1"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  {client.website}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              
              <div className="flex space-x-3">
                <Link
                  href={`/workflow/new?clientId=${client.id}`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                  Create Workflow
                </Link>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pages
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Pages</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>

          {/* Add Pages Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Add Target Pages</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add URLs from {client.name}'s website that you want to get links TO from guest posts
              </p>
              <form onSubmit={handleAddPages}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client URLs (one per line)
                  </label>
                  <textarea
                    value={newPages}
                    onChange={(e) => setNewPages(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder={`${client.website}/blog/best-practices\n${client.website}/services/consulting\n${client.website}/about-us`}
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Add Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter and Bulk Actions */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filters */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1"
                  >
                    <option value="all">All Pages ({stats.total})</option>
                    <option value="active">Active ({stats.active})</option>
                    <option value="inactive">Inactive ({stats.inactive})</option>
                    <option value="completed">Completed ({stats.completed})</option>
                  </select>
                </div>

                {/* Bulk Actions */}
                {selectedPages.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {selectedPages.length} selected
                    </span>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    >
                      <option value="">Bulk Action...</option>
                      <option value="active">Mark as Active</option>
                      <option value="inactive">Mark as Inactive</option>
                      <option value="completed">Mark as Completed</option>
                      <option value="delete">Delete</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pages List */}
            <div className="overflow-hidden">
              {filteredPages.length > 0 ? (
                <>
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPages.length === filteredPages.length && filteredPages.length > 0}
                      onChange={toggleSelectAll}
                      className="mr-3"
                    />
                    <div className="text-sm font-medium text-gray-700">
                      Select All ({filteredPages.length})
                    </div>
                  </div>

                  {/* Pages */}
                  <div className="divide-y divide-gray-200">
                    {filteredPages.map((page: any) => (
                      <div key={page.id} className="px-4 py-4 flex items-center hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedPages.includes(page.id)}
                          onChange={() => togglePageSelection(page.id)}
                          className="mr-3"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium truncate mr-2"
                            >
                              {page.url}
                            </a>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Domain: {page.domain} • Added: {new Date(page.addedAt).toLocaleDateString()}
                            {page.completedAt && (
                              <> • Completed: {new Date(page.completedAt).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                            {getStatusIcon(page.status)}
                            <span className="ml-1 capitalize">{page.status}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {filter === 'all' 
                      ? 'No target pages yet. Add some URLs to get started.'
                      : `No ${filter} pages found.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}