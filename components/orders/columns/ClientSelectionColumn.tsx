'use client';

import { useState, useEffect } from 'react';
import { Building, Plus, Search, ChevronRight, Users, Globe, Target } from 'lucide-react';
import CreateClientModal from '@/components/CreateClientModal';

interface ClientSelectionColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

interface Client {
  id: string;
  name: string;
  website: string;
  niche?: string;
  targetPages?: Array<{
    id: string;
    url: string;
    keywords?: string;
    description?: string;
  }>;
}

interface SelectedClient {
  clientId: string;
  linkCount: number;
  client: Client;
}

export default function ClientSelectionColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: ClientSelectionColumnProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<SelectedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Update parent with selected clients
    onOrderUpdate({ selectedClients });
  }, [selectedClients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load clients');
      
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client, selected: boolean) => {
    if (selected) {
      // Add client with default 1 link
      setSelectedClients(prev => [...prev, {
        clientId: client.id,
        linkCount: 1,
        client
      }]);
    } else {
      // Remove client
      setSelectedClients(prev => prev.filter(sc => sc.clientId !== client.id));
    }
  };

  const updateLinkCount = (clientId: string, count: number) => {
    setSelectedClients(prev => prev.map(sc => 
      sc.clientId === clientId ? { ...sc, linkCount: Math.max(1, count) } : sc
    ));
  };

  const handleClientCreated = (newClient: any) => {
    // Reload clients list
    loadClients();
    setShowCreateModal(false);
    
    // Auto-select the new client
    const clientWithPages: Client = {
      ...newClient,
      targetPages: []
    };
    handleClientSelect(clientWithPages, true);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.niche && client.niche.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalLinks = selectedClients.reduce((sum, sc) => sum + sc.linkCount, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Select Brands
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose the brands you want to order guest posts for
        </p>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading brands...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No brands found matching your search' : 'No brands yet'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map(client => {
              const selected = selectedClients.find(sc => sc.clientId === client.id);
              const isSelected = !!selected;
              
              return (
                <div
                  key={client.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <label className="flex items-start flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleClientSelect(client, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <a 
                          href={client.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3 w-3" />
                          {client.website}
                        </a>
                        {client.niche && (
                          <p className="text-sm text-gray-600 mt-1">
                            Niche: {client.niche}
                          </p>
                        )}
                        {client.targetPages && client.targetPages.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {client.targetPages.length} target pages
                          </p>
                        )}
                      </div>
                    </label>

                    {isSelected && (
                      <div className="ml-4 flex items-center gap-2">
                        <label className="text-sm text-gray-700">Links:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selected.linkCount}
                          onChange={(e) => updateLinkCount(client.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-sm border rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add New Brand
        </button>
        
        {selectedClients.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              {selectedClients.length} brands selected
            </p>
            <p className="text-sm text-blue-700">
              {totalLinks} total links
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('middle')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 md:hidden"
              >
                View Target Pages
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onClientCreated={handleClientCreated}
        />
      )}
    </div>
  );
}