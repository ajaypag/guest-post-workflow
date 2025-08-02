'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Globe, TrendingUp, Search, ChevronRight, AlertCircle } from 'lucide-react';
import AddTargetPageModal from '@/components/AddTargetPageModal';

interface TargetPageColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

interface TargetPage {
  id: string;
  clientId: string;
  url: string;
  keywords?: string;
  description?: string;
  domainRating?: number;
  organicTraffic?: number;
}

interface ClientWithPages {
  clientId: string;
  clientName: string;
  linkCount: number;
  targetPages: TargetPage[];
}

export default function TargetPageColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: TargetPageColumnProps) {
  const [clientPages, setClientPages] = useState<ClientWithPages[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientForAdd, setSelectedClientForAdd] = useState<string | null>(null);
  
  // Get selected clients from order updates
  const selectedClients = order?.selectedClients || [];
  
  useEffect(() => {
    if (selectedClients.length > 0) {
      loadTargetPages();
    }
  }, [selectedClients]);
  
  const loadTargetPages = async () => {
    try {
      setLoading(true);
      
      // Load target pages for each selected client
      const clientPagePromises = selectedClients.map(async (sc: any) => {
        const response = await fetch(`/api/clients/${sc.clientId}/target-pages`, {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load target pages');
        
        const data = await response.json();
        return {
          clientId: sc.clientId,
          clientName: sc.client.name,
          linkCount: sc.linkCount,
          targetPages: data.targetPages || []
        };
      });
      
      const results = await Promise.all(clientPagePromises);
      setClientPages(results);
    } catch (error) {
      console.error('Error loading target pages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddTargetPage = (clientId: string) => {
    setSelectedClientForAdd(clientId);
    setShowAddModal(true);
  };
  
  const handleTargetPageCreated = () => {
    setShowAddModal(false);
    setSelectedClientForAdd(null);
    loadTargetPages(); // Reload to show new page
  };
  
  const getTotalPagesNeeded = () => {
    return selectedClients.reduce((sum: number, sc: any) => sum + sc.linkCount, 0);
  };
  
  const getTotalPagesAvailable = () => {
    return clientPages.reduce((sum, cp) => sum + cp.targetPages.length, 0);
  };
  
  const hasEnoughPages = () => {
    let sufficient = true;
    clientPages.forEach(cp => {
      const needed = selectedClients.find((sc: any) => sc.clientId === cp.clientId)?.linkCount || 0;
      if (cp.targetPages.length < needed) {
        sufficient = false;
      }
    });
    return sufficient;
  };
  
  if (selectedClients.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Target Pages
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Select brands first to view target pages</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('left')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700"
              >
                ← Select Brands
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Target Pages
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Review and add target pages for backlinks
        </p>
      </div>
      
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">Pages Needed</p>
            <p className="text-2xl font-bold text-gray-900">{getTotalPagesNeeded()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Available</p>
            <p className={`text-2xl font-bold ${
              hasEnoughPages() ? 'text-green-600' : 'text-amber-600'
            }`}>
              {getTotalPagesAvailable()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Status</p>
            <p className={`text-sm font-medium ${
              hasEnoughPages() ? 'text-green-600' : 'text-amber-600'
            }`}>
              {hasEnoughPages() ? '✓ Sufficient' : 'Need More'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading target pages...</div>
        ) : (
          <div className="space-y-6">
            {clientPages.map(cp => {
              const neededLinks = selectedClients.find((sc: any) => sc.clientId === cp.clientId)?.linkCount || 0;
              const hasEnough = cp.targetPages.length >= neededLinks;
              
              return (
                <div key={cp.clientId} className="border rounded-lg">
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{cp.clientName}</h3>
                        <p className="text-sm text-gray-600">
                          {cp.targetPages.length} pages • {neededLinks} links needed
                        </p>
                      </div>
                      {!hasEnough && (
                        <span className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Need {neededLinks - cp.targetPages.length} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    {cp.targetPages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No target pages yet
                      </p>
                    ) : (
                      cp.targetPages.map(page => (
                        <div key={page.id} className="border rounded p-3 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <a 
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                {page.url}
                              </a>
                              
                              {page.keywords && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Keywords: {page.keywords.split(',').slice(0, 3).join(', ')}
                                  {page.keywords.split(',').length > 3 && '...'}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {page.domainRating && (
                                  <span>DR: {page.domainRating}</span>
                                )}
                                {page.organicTraffic && (
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {page.organicTraffic.toLocaleString()} traffic
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    <button
                      onClick={() => handleAddTargetPage(cp.clientId)}
                      className="w-full px-3 py-2 border border-dashed border-gray-300 rounded text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      Add Target Page
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="border-t p-4">
        {!hasEnoughPages() && (
          <div className="mb-3 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm font-medium text-amber-900">
              Add more target pages
            </p>
            <p className="text-sm text-amber-700">
              Some brands need additional target pages before you can proceed
            </p>
          </div>
        )}
        
        {onNavigate && (
          <button
            onClick={() => onNavigate('right')}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium md:hidden ${
              hasEnoughPages()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasEnoughPages()}
          >
            Continue to Order Details
            <ChevronRight className="h-4 w-4 inline ml-1" />
          </button>
        )}
      </div>
      
      {showAddModal && selectedClientForAdd && (
        <AddTargetPageModal
          clientId={selectedClientForAdd}
          onClose={() => {
            setShowAddModal(false);
            setSelectedClientForAdd(null);
          }}
          onTargetPageCreated={handleTargetPageCreated}
        />
      )}
    </div>
  );
}