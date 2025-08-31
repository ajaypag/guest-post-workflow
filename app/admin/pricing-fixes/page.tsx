'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit2, 
  Save, 
  X, 
  Filter,
  CheckSquare,
  Square,
  DollarSign,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

interface ExecutionStep {
  step: number;
  action: string;
  description: string;
  details: any;
}

interface PricingIssue {
  id: string;
  websiteId: string;
  domain: string;
  issueType: 'no_offering' | 'price_mismatch' | 'multiple_offerings' | 'no_publisher';
  currentGuestPostCost: number | null;
  currentOfferingPrice: number | null;
  airtablePrice: number | null;
  airtableEmail: string | null;
  proposedAction: string;
  proposedPrice: number | null;
  priceDifference: number | null;
  publisherName: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  confidence: 'high' | 'medium' | 'low';
  executionPlan?: ExecutionStep[];
}

export default function PricingFixesAdmin() {
  const [issues, setIssues] = useState<PricingIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ price?: number; email?: string }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priceRangeFilter, setPriceRangeFilter] = useState([0, 500]);
  const [showFilters, setShowFilters] = useState(true);
  
  const [stats, setStats] = useState({
    total: 0,
    noOffering: 0,
    priceMismatch: 0,
    multipleOfferings: 0,
    noPublisher: 0,
    approved: 0,
    rejected: 0,
    pending: 0
  });

  useEffect(() => {
    loadPricingIssues();
  }, []);

  const loadPricingIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing-fixes/analyze-with-plan');
      const data = await response.json();
      setIssues(data.issues);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load pricing issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted issues
  const filteredIssues = useMemo(() => {
    let filtered = issues;
    
    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(i => i.issueType === activeTab);
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(i => 
        i.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.publisherName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Confidence filter
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(i => i.confidence === confidenceFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    
    // Price range filter
    filtered = filtered.filter(i => {
      const price = i.proposedPrice || i.currentGuestPostCost || 0;
      return price >= priceRangeFilter[0] && price <= priceRangeFilter[1];
    });
    
    return filtered;
  }, [issues, activeTab, searchTerm, confidenceFilter, statusFilter, priceRangeFilter]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredIssues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIssues.map(i => i.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    
    try {
      await fetch('/api/admin/pricing-fixes/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action })
      });
      
      setIssues(issues.map(i => 
        selectedIds.has(i.id) ? { ...i, status: action === 'approve' ? 'approved' : 'rejected' } : i
      ));
      
      setSelectedIds(new Set());
      
      // Update stats
      const updatedStats = { ...stats };
      const count = selectedIds.size;
      if (action === 'approve') {
        updatedStats.approved += count;
        updatedStats.pending -= count;
      } else {
        updatedStats.rejected += count;
        updatedStats.pending -= count;
      }
      setStats(updatedStats);
    } catch (error) {
      console.error(`Failed to bulk ${action}:`, error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/admin/pricing-fixes/${id}/approve`, { method: 'POST' });
      setIssues(issues.map(i => i.id === id ? { ...i, status: 'approved' } : i));
      setStats({ ...stats, approved: stats.approved + 1, pending: stats.pending - 1 });
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/admin/pricing-fixes/${id}/reject`, { method: 'POST' });
      setIssues(issues.map(i => i.id === id ? { ...i, status: 'rejected' } : i));
      setStats({ ...stats, rejected: stats.rejected + 1, pending: stats.pending - 1 });
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleEdit = (issue: PricingIssue) => {
    setEditingId(issue.id);
    setEditValues({
      price: issue.proposedPrice || issue.airtablePrice || 0,
      email: issue.airtableEmail || ''
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/admin/pricing-fixes/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      });
      setIssues(issues.map(i => 
        i.id === id 
          ? { ...i, proposedPrice: editValues.price || i.proposedPrice, status: 'modified' }
          : i
      ));
      setEditingId(null);
      setEditValues({});
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  const executeApprovedFixes = async () => {
    if (!confirm('This will apply all approved fixes to the database. Are you sure?')) return;
    
    setExecuting(true);
    try {
      const response = await fetch('/api/admin/pricing-fixes/execute', { method: 'POST' });
      const result = await response.json();
      alert(`Executed ${result.executed} fixes successfully!`);
      loadPricingIssues();
    } catch (error) {
      console.error('Failed to execute fixes:', error);
      alert('Failed to execute fixes. Check console for details.');
    } finally {
      setExecuting(false);
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'no_offering': return 'bg-red-100 text-red-800';
      case 'price_mismatch': return 'bg-yellow-100 text-yellow-800';
      case 'multiple_offerings': return 'bg-purple-100 text-purple-800';
      case 'no_publisher': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high': return <Badge className="bg-green-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge className="bg-red-500">Review</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'modified': return <Badge className="bg-blue-100 text-blue-800">Modified</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading pricing analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-full">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Pricing Fixes Admin Panel</h1>
          <Button onClick={loadPricingIssues} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-8 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Issues</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.noOffering}</div>
              <div className="text-xs text-gray-500">No Offering</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.priceMismatch}</div>
              <div className="text-xs text-gray-500">Price Mismatch</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.multipleOfferings}</div>
              <div className="text-xs text-gray-500">Multiple</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.noPublisher}</div>
              <div className="text-xs text-gray-500">No Publisher</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-xs text-gray-500">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-gray-500">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Bulk Actions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              {/* Search and Quick Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search domains..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Confidence Level</Label>
                  <select
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Confidence</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="low">Low Only</option>
                  </select>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="modified">Modified</option>
                  </select>
                </div>
                
                <div>
                  <Label>Price Range: ${priceRangeFilter[0]} - ${priceRangeFilter[1]}</Label>
                  <div className="mt-2 space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="10"
                      value={priceRangeFilter[0]}
                      onChange={(e) => setPriceRangeFilter([parseInt(e.target.value), priceRangeFilter[1]])}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="10"
                      value={priceRangeFilter[1]}
                      onChange={(e) => setPriceRangeFilter([priceRangeFilter[0], parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              {/* Bulk Actions Bar */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.size === filteredIssues.length && filteredIssues.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">
                    {selectedIds.size} of {filteredIssues.length} selected
                  </span>
                  {selectedIds.size > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        onClick={() => handleBulkAction('approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleBulkAction('reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject Selected
                      </Button>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const highConfidence = filteredIssues.filter(i => i.confidence === 'high' && i.status === 'pending');
                      setSelectedIds(new Set(highConfidence.map(i => i.id)));
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Select High Confidence
                  </Button>
                  <Button
                    onClick={() => {
                      const smallChanges = filteredIssues.filter(i => {
                        const diff = Math.abs(i.priceDifference || 0);
                        return diff < 10 && i.status === 'pending';
                      });
                      setSelectedIds(new Set(smallChanges.map(i => i.id)));
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Select Changes &lt; $10
                  </Button>
                  <Button
                    onClick={executeApprovedFixes}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={executing || stats.approved === 0}
                  >
                    {executing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Execute {stats.approved} Approved
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Tabs for filtering */}
      <div className="mb-6">
        <div className="flex gap-2 border-b mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'all' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('no_offering')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'no_offering' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            No Offering ({stats.noOffering})
          </button>
          <button
            onClick={() => setActiveTab('price_mismatch')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'price_mismatch' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Price Mismatch ({stats.priceMismatch})
          </button>
          <button
            onClick={() => setActiveTab('multiple_offerings')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'multiple_offerings' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Multiple ({stats.multipleOfferings})
          </button>
          <button
            onClick={() => setActiveTab('no_publisher')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'no_publisher' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            No Publisher ({stats.noPublisher})
          </button>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredIssues.length} issues
          </div>
          
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <Card 
                key={issue.id} 
                className={`transition-all ${
                  selectedIds.has(issue.id) ? 'ring-2 ring-blue-500' : ''
                } ${
                  issue.status === 'approved' ? 'bg-green-50 border-green-300' : 
                  issue.status === 'rejected' ? 'bg-red-50 border-red-300' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(issue.id)}
                      onCheckedChange={() => handleSelectOne(issue.id)}
                      className="mt-1"
                    />
                    
                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{issue.domain}</h3>
                          <div className="flex gap-2 mt-2">
                            <Badge className={getIssueColor(issue.issueType)}>
                              {issue.issueType.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {getConfidenceBadge(issue.confidence)}
                            {getStatusBadge(issue.status)}
                            {issue.priceDifference && Math.abs(issue.priceDifference) > 50 && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Large Difference
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {issue.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(issue)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApprove(issue.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReject(issue.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingId === issue.id ? (
                        <div className="space-y-4 bg-gray-50 p-4 rounded">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Proposed Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.price || ''}
                                onChange={(e) => setEditValues({ ...editValues, price: parseFloat(e.target.value) })}
                              />
                            </div>
                            <div>
                              <Label>Contact Email</Label>
                              <Input
                                type="email"
                                value={editValues.email || ''}
                                onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(issue.id)}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Current Database Values</p>
                            <div className="space-y-1">
                              <p>guest_post_cost: ${issue.currentGuestPostCost || 'None'}</p>
                              <p>Offering price: ${issue.currentOfferingPrice ? (issue.currentOfferingPrice / 100).toFixed(2) : 'None'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-gray-500 mb-1">Airtable Data</p>
                            <div className="space-y-1">
                              <p>Price: ${issue.airtablePrice || 'Not found'}</p>
                              <p className="truncate" title={issue.airtableEmail || ''}>
                                Email: {issue.airtableEmail || 'Not found'}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-gray-500 mb-1">Proposed Action</p>
                            <p className="font-medium">{issue.proposedAction}</p>
                            {issue.proposedPrice && (
                              <p className="text-green-600 font-semibold">
                                <DollarSign className="inline h-3 w-3" />
                                {issue.proposedPrice}
                              </p>
                            )}
                          </div>
                          
                          {issue.priceDifference && (
                            <div>
                              <p className="text-gray-500 mb-1">Price Difference</p>
                              <p className={`font-bold ${
                                Math.abs(issue.priceDifference) > 50 ? 'text-red-600 text-lg' : 
                                Math.abs(issue.priceDifference) > 10 ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {issue.priceDifference > 0 ? '+' : ''}${issue.priceDifference.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Execution Plan Accordion */}
                      {issue.executionPlan && issue.executionPlan.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <button
                            onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            {expandedId === issue.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            View Execution Plan ({issue.executionPlan.length} steps)
                          </button>
                          
                          {expandedId === issue.id && (
                            <div className="mt-3 space-y-2 bg-gray-50 p-4 rounded">
                              <h4 className="font-semibold text-sm mb-3">What will happen when executed:</h4>
                              {issue.executionPlan.map((step, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                      {step.step}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{step.action}</div>
                                    <div className="text-xs text-gray-600 mt-1">{step.description}</div>
                                    {step.details && (
                                      <div className="mt-2 text-xs bg-white p-2 rounded border border-gray-200">
                                        {step.details.table && (
                                          <div className="mb-1">
                                            <span className="font-semibold">Table:</span> {step.details.table}
                                          </div>
                                        )}
                                        {step.details.fields && (
                                          <div className="mb-1">
                                            <span className="font-semibold">Fields to set:</span>
                                            <pre className="mt-1 text-xs overflow-x-auto">
                                              {JSON.stringify(step.details.fields, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                        {step.details.defaults && (
                                          <div className="mt-1 text-gray-500">
                                            <span className="font-semibold">Database defaults:</span>
                                            <pre className="mt-1 text-xs">
                                              {JSON.stringify(step.details.defaults, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                        {step.details.reason && (
                                          <div className="text-yellow-700">
                                            <span className="font-semibold">Reason:</span> {step.details.reason}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredIssues.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No issues match your current filters
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}