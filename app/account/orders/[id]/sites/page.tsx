'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Check, X, ExternalLink, Search, Filter, ChevronDown } from 'lucide-react';

interface AnalyzedDomain {
  id: string;
  domain: string;
  dr: number;
  traffic: number;
  niche: string;
  status: 'high_quality' | 'good' | 'marginal' | 'disqualified';
  price: number;
  projectId: string;
  notes?: string;
}

interface SiteSelection {
  id: string;
  domainId: string;
  domain: AnalyzedDomain;
  targetPageUrl: string;
  anchorText: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
  };
  linkCount: number;
  targetPages: string[];
  requirements: {
    minDR?: number;
    minTraffic?: number;
    niches?: string[];
    customGuidelines?: string;
  };
  bulkAnalysisProjectId?: string;
}

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  orderGroups: OrderGroup[];
}

export default function SiteSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [suggestedSites, setSuggestedSites] = useState<AnalyzedDomain[]>([]);
  const [allSites, setAllSites] = useState<AnalyzedDomain[]>([]);
  const [selections, setSelections] = useState<SiteSelection[]>([]);
  const [activeTab, setActiveTab] = useState('suggested');
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minDR, setMinDR] = useState<number>(0);
  const [maxDR, setMaxDR] = useState<number>(100);
  const [minTraffic, setMinTraffic] = useState<number>(0);
  const [maxTraffic, setMaxTraffic] = useState<number>(1000000);
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const selectedGroup = order?.orderGroups.find(g => g.id === selectedGroupId);
  const requiredLinks = selectedGroup?.linkCount || 0;
  const selectedCount = selections.filter(s => s.status === 'approved').length;
  
  useEffect(() => {
    fetchOrderAndSites();
  }, [orderId]);
  
  useEffect(() => {
    if (order?.orderGroups.length && !selectedGroupId) {
      setSelectedGroupId(order.orderGroups[0].id);
    }
  }, [order, selectedGroupId]);
  
  useEffect(() => {
    if (selectedGroupId) {
      fetchSitesForGroup();
    }
  }, [selectedGroupId]);
  
  const fetchOrderAndSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setMessage('Failed to load order details');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSitesForGroup = async () => {
    if (!selectedGroupId || !selectedGroup) return;
    
    try {
      const response = await fetch(`/api/orders/${orderId}/groups/${selectedGroupId}/site-selections`);
      if (!response.ok) throw new Error('Failed to fetch sites');
      const data = await response.json();
      
      setSuggestedSites(data.suggested || []);
      setAllSites(data.all || []);
      setSelections(data.currentSelections || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setMessage('Failed to load available sites');
      setMessageType('error');
    }
  };
  
  const handleSiteToggle = (domain: AnalyzedDomain, isSelected: boolean) => {
    if (isSelected) {
      // Remove selection
      setSelections(prev => prev.filter(s => s.domainId !== domain.id));
    } else {
      // Add selection
      const newSelection: SiteSelection = {
        id: `temp-${Date.now()}`,
        domainId: domain.id,
        domain,
        targetPageUrl: selectedGroup?.targetPages[0] || '',
        anchorText: '',
        status: 'approved'
      };
      setSelections(prev => [...prev, newSelection]);
    }
  };
  
  const handleTargetPageChange = (selectionId: string, targetPageUrl: string) => {
    setSelections(prev => prev.map(s => 
      s.id === selectionId ? { ...s, targetPageUrl } : s
    ));
  };
  
  const handleAnchorTextChange = (selectionId: string, anchorText: string) => {
    setSelections(prev => prev.map(s => 
      s.id === selectionId ? { ...s, anchorText } : s
    ));
  };
  
  const handleSaveSelections = async () => {
    if (!selectedGroupId) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/orders/${orderId}/groups/${selectedGroupId}/site-selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: selections.map(s => ({
            domainId: s.domainId,
            targetPageUrl: s.targetPageUrl,
            anchorText: s.anchorText,
            status: s.status
          }))
        })
      });
      
      if (!response.ok) throw new Error('Failed to save selections');
      
      setMessage('Site selections saved successfully');
      setMessageType('success');
      await fetchSitesForGroup();
    } catch (error) {
      console.error('Error saving selections:', error);
      setMessage('Failed to save site selections');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };
  
  const filteredSites = (sites: AnalyzedDomain[]) => {
    return sites.filter(site => {
      if (statusFilter !== 'all' && site.status !== statusFilter) return false;
      if (site.dr < minDR || site.dr > maxDR) return false;
      if (site.traffic < minTraffic || site.traffic > maxTraffic) return false;
      if (nicheFilter !== 'all' && site.niche !== nicheFilter) return false;
      if (searchQuery && !site.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };
  
  const uniqueNiches = Array.from(new Set(allSites.map(s => s.niche)));
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'high_quality':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'marginal':
        return 'bg-yellow-100 text-yellow-800';
      case 'disqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const SiteCard = ({ site }: { site: AnalyzedDomain }) => {
    const selection = selections.find(s => s.domainId === site.id);
    const isSelected = !!selection;
    
    return (
      <div 
        className={`border rounded-lg p-4 transition-all cursor-pointer ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleSiteToggle(site, isSelected)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium flex items-center gap-2">
              {site.domain}
              <a 
                href={`https://${site.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </h4>
            <p className="text-sm text-gray-600">{site.niche}</p>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
          }`}>
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-500">DR</p>
            <p className="font-medium">{site.dr}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Traffic</p>
            <p className="font-medium">{site.traffic.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="font-medium">${site.price}</p>
          </div>
        </div>
        
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(site.status)}`}>
          {site.status.replace('_', ' ')}
        </span>
        
        {site.notes && (
          <p className="text-xs text-gray-500 mt-2">{site.notes}</p>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-center text-gray-500">Order not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Site Selection</h1>
        <p className="text-gray-600">Order #{order.id.slice(0, 8)}</p>
      </div>
      
      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {messageType === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {message}
        </div>
      )}
      
      {/* Client Selector */}
      {order.orderGroups.length > 1 && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Select Client</h2>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {order.orderGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.client.name} - {group.linkCount} links
              </option>
            ))}
          </select>
        </div>
      )}
      
      {selectedGroup && (
        <>
          {/* Client Details */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-lg font-semibold mb-4">{selectedGroup.client.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Links Ordered</p>
                <p className="font-medium">{selectedGroup.linkCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="font-medium">{selectedCount} / {requiredLinks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Min DR</p>
                <p className="font-medium">{selectedGroup.requirements.minDR || 'Any'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Min Traffic</p>
                <p className="font-medium">
                  {selectedGroup.requirements.minTraffic?.toLocaleString() || 'Any'}
                </p>
              </div>
            </div>
            
            {selectedGroup.requirements.customGuidelines && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Custom Guidelines</p>
                <p className="text-sm mt-1">{selectedGroup.requirements.customGuidelines}</p>
              </div>
            )}
          </div>
          
          {/* Site Browser */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Available Sites</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </button>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search domains..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-[200px]"
                    />
                  </div>
                </div>
              </div>
              
              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">All</option>
                        <option value="high_quality">High Quality</option>
                        <option value="good">Good</option>
                        <option value="marginal">Marginal</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DR Range: {minDR} - {maxDR}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={minDR}
                          onChange={(e) => setMinDR(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          min="0"
                          max="100"
                        />
                        <input
                          type="number"
                          value={maxDR}
                          onChange={(e) => setMaxDR(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
                      <select
                        value={nicheFilter}
                        onChange={(e) => setNicheFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="all">All Niches</option>
                        {uniqueNiches.map(niche => (
                          <option key={niche} value={niche}>
                            {niche}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6">
              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('suggested')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      activeTab === 'suggested'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    Suggested ({suggestedSites.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      activeTab === 'all'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    Browse All ({allSites.length})
                  </button>
                </div>
              </div>
              
              {/* Tab Content */}
              <div>
                {activeTab === 'suggested' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSites(suggestedSites).map(site => (
                      <SiteCard key={site.id} site={site} />
                    ))}
                  </div>
                )}
                
                {activeTab === 'all' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSites(allSites).map(site => (
                      <SiteCard key={site.id} site={site} />
                    ))}
                  </div>
                )}
                
                {((activeTab === 'suggested' && filteredSites(suggestedSites).length === 0) ||
                  (activeTab === 'all' && filteredSites(allSites).length === 0)) && (
                  <p className="text-center text-gray-500 py-8">
                    No sites match your filters
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Selection Summary */}
          {selections.length > 0 && (
            <div className="bg-white rounded-lg shadow mt-6 p-6">
              <h2 className="text-lg font-semibold mb-4">Selected Sites ({selectedCount} / {requiredLinks})</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 font-medium text-gray-700">Domain</th>
                      <th className="text-left py-2 font-medium text-gray-700">Target Page</th>
                      <th className="text-left py-2 font-medium text-gray-700">Anchor Text</th>
                      <th className="text-left py-2 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selections.map(selection => (
                      <tr key={selection.id}>
                        <td className="py-3 font-medium">
                          {selection.domain.domain}
                        </td>
                        <td className="py-3">
                          <select
                            value={selection.targetPageUrl}
                            onChange={(e) => handleTargetPageChange(selection.id, e.target.value)}
                            className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="">Select target page</option>
                            {selectedGroup.targetPages.map(page => (
                              <option key={page} value={page}>
                                {page}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3">
                          <input
                            type="text"
                            value={selection.anchorText}
                            onChange={(e) => handleAnchorTextChange(selection.id, e.target.value)}
                            placeholder="Enter anchor text"
                            className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleSiteToggle(selection.domain, true)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => router.push(`/account/orders/${orderId}`)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSelections}
                  disabled={saving || selectedCount === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Selections
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}