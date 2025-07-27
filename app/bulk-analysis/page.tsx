'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink,
  Loader2,
  BarChart2
} from 'lucide-react';

interface ExtendedClient extends Client {
  clientType?: 'prospect' | 'client';
  convertedFromProspectAt?: Date;
  projectCount?: number;
  domainCount?: number;
  workflowCount?: number;
  lastActivityAt?: Date;
}

export default function BulkAnalysisDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'prospects' | 'clients'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const session = AuthService.getSession();
      if (!session) return;

      // Load clients based on filter
      let loadedClients: ExtendedClient[] = [];
      if (assignmentFilter === 'mine') {
        loadedClients = await clientStorage.getUserClients(session.userId);
      } else {
        loadedClients = await clientStorage.getAllClients();
      }

      // Enrich with stats (mock data for now)
      const enrichedClients = await Promise.all(
        loadedClients.map(async (client) => {
          // In real implementation, fetch from database
          const projectCount = Math.floor(Math.random() * 10);
          const domainCount = Math.floor(Math.random() * 100);
          const workflowCount = Math.floor(Math.random() * 20);
          
          return {
            ...client,
            clientType: (client as any).clientType || 'client',
            projectCount,
            domainCount,
            workflowCount,
            lastActivityAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          };
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
    // Type filter
    if (viewFilter === 'prospects' && client.clientType !== 'prospect') return false;
    if (viewFilter === 'clients' && client.clientType !== 'client') return false;
    
    // Search filter
    if (searchQuery && !client.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !client.website.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
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
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Prospects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProspects}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeClients}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Domains Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.domainsAnalyzed}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Search className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              {/* View Filter */}
              <div className="bg-white rounded-lg p-1 flex border border-gray-200">
                <button
                  onClick={() => setViewFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    viewFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setViewFilter('prospects')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    viewFilter === 'prospects' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Prospects ({stats.totalProspects})
                </button>
                <button
                  onClick={() => setViewFilter('clients')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    viewFilter === 'clients' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Clients ({stats.activeClients})
                </button>
              </div>

              {/* Assignment Filter */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as 'all' | 'mine')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="mine">My Assignments</option>
                <option value="all">All</option>
              </select>

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name or website..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/clients?new=true&type=prospect')}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Prospect
              </button>
              <button
                onClick={() => router.push('/clients?new=true&type=client')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </button>
            </div>
          </div>

          {/* Prospects Section */}
          {(viewFilter === 'all' || viewFilter === 'prospects') && prospects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Prospects</h2>
              <div className="grid grid-cols-3 gap-6">
                {prospects.map((prospect) => (
                  <div key={prospect.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{prospect.name}</h3>
                        <p className="text-sm text-gray-500">{prospect.website}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Prospect
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Projects</span>
                        <span className="font-medium">{prospect.projectCount || 0} active</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Domains Analyzed</span>
                        <span className="font-medium">{prospect.domainCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Activity</span>
                        <span className="font-medium">
                          {prospect.lastActivityAt 
                            ? new Date(prospect.lastActivityAt).toLocaleDateString()
                            : 'No activity'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/clients/${prospect.id}/bulk-analysis`)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        View Analysis
                      </button>
                      <button
                        onClick={() => setShowConversionModal(prospect.id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                        title="Convert to Client"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clients Section */}
          {(viewFilter === 'all' || viewFilter === 'clients') && regularClients.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Clients</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflows</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domains</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {regularClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.website}</div>
                          </div>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No {viewFilter === 'all' ? 'clients or prospects' : viewFilter} found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : 'Get started by creating your first ' + (viewFilter === 'prospects' ? 'prospect' : 'client')}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => router.push(`/clients/new?type=${viewFilter === 'prospects' ? 'prospect' : 'client'}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create {viewFilter === 'prospects' ? 'Prospect' : 'Client'}
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