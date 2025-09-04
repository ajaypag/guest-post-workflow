'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, Plus, CheckCircle, XCircle, AlertCircle, Brain, TrendingUp, Filter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Website {
  id: string;
  domain: string;
  niche: string[] | null;
  categories: string[] | null;
  websiteType: string[] | null;
  lastNicheCheck: Date | null;
  domainRating: number | null;
  totalTraffic: number | null;
}

interface NicheSuggestion {
  niche: string;
  count: number;
  websites: string[];
}

interface BatchProgress {
  total: number;
  processed: number;
  inProgress: boolean;
  errors: string[];
  currentBatch: string[];
}

export default function NicheFinderPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsites, setSelectedWebsites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    processed: 0,
    inProgress: false,
    errors: [],
    currentBatch: []
  });
  
  // Statistics
  const [stats, setStats] = useState({
    totalWebsites: 0,
    websitesWithNiches: 0,
    websitesNeedingCheck: 0,
    uniqueNiches: 0,
    uniqueCategories: 0,
    suggestedNiches: [] as NicheSuggestion[],
    suggestedCategories: [] as NicheSuggestion[]
  });
  
  // Filters
  const [filters, setFilters] = useState({
    needsCheck: false,
    hasNiche: 'all' as 'all' | 'yes' | 'no',
    daysAgo: 30,
    searchTerm: ''
  });
  
  // Current niches and categories from database
  const [currentNiches, setCurrentNiches] = useState<string[]>([]);
  const [currentCategories, setCurrentCategories] = useState<string[]>([]);

  // Load websites and statistics
  const loadWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.needsCheck) params.set('needsCheck', 'true');
      if (filters.hasNiche !== 'all') params.set('hasNiche', filters.hasNiche);
      params.set('daysAgo', filters.daysAgo.toString());
      if (filters.searchTerm) params.set('search', filters.searchTerm);
      
      const response = await fetch(`/api/admin/niche-finder?${params}`);
      const data = await response.json();
      
      setWebsites(data.websites);
      setStats(data.stats);
      setCurrentNiches(data.currentNiches || []);
      setCurrentCategories(data.currentCategories || []);
    } catch (error) {
      console.error('Failed to load websites:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  // Batch process selected websites
  const processBatch = async () => {
    const websitesToProcess = selectedWebsites.size > 0 
      ? Array.from(selectedWebsites)
      : websites.filter(w => !w.lastNicheCheck || 
          new Date(w.lastNicheCheck) < new Date(Date.now() - filters.daysAgo * 24 * 60 * 60 * 1000)
        ).map(w => w.id);

    if (websitesToProcess.length === 0) {
      alert('No websites to process. Select websites or adjust filters.');
      return;
    }

    setBatchProgress({
      total: websitesToProcess.length,
      processed: 0,
      inProgress: true,
      errors: [],
      currentBatch: []
    });

    const batchSize = 10; // Process 10 at a time
    for (let i = 0; i < websitesToProcess.length; i += batchSize) {
      const batch = websitesToProcess.slice(i, i + batchSize);
      
      setBatchProgress(prev => ({
        ...prev,
        currentBatch: batch
      }));

      try {
        const response = await fetch('/api/admin/niche-finder/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            websiteIds: batch,
            currentNiches,
            currentCategories
          })
        });

        const result = await response.json();
        
        if (result.errors) {
          setBatchProgress(prev => ({
            ...prev,
            errors: [...prev.errors, ...result.errors]
          }));
        }

        setBatchProgress(prev => ({
          ...prev,
          processed: Math.min(prev.processed + batchSize, prev.total)
        }));
      } catch (error) {
        console.error('Batch processing error:', error);
        setBatchProgress(prev => ({
          ...prev,
          errors: [...prev.errors, `Batch ${i/batchSize + 1} failed`]
        }));
      }

      // Small delay between batches
      if (i + batchSize < websitesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setBatchProgress(prev => ({
      ...prev,
      inProgress: false,
      currentBatch: []
    }));

    // Reload data
    await loadWebsites();
    setSelectedWebsites(new Set());
  };

  // Add suggested niche to the main list
  const approveSuggestedNiche = async (niche: string) => {
    try {
      await fetch('/api/admin/niche-finder/approve-niche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, type: 'niche' })
      });
      await loadWebsites();
    } catch (error) {
      console.error('Failed to approve niche:', error);
    }
  };

  // Add suggested category to the main list
  const approveSuggestedCategory = async (category: string) => {
    try {
      await fetch('/api/admin/niche-finder/approve-niche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: category, type: 'category' })
      });
      await loadWebsites();
    } catch (error) {
      console.error('Failed to approve category:', error);
    }
  };

  const toggleWebsiteSelection = (id: string) => {
    setSelectedWebsites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Niche & Category Finder</h1>
        <p className="text-gray-600">
          Analyze websites to identify and expand niches and categories using AI
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWebsites}</div>
            <p className="text-xs text-muted-foreground">
              {stats.websitesWithNiches} have niches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Analysis</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.websitesNeedingCheck}</div>
            <p className="text-xs text-muted-foreground">
              Never checked or outdated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Niches</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueNiches}</div>
            <p className="text-xs text-muted-foreground">
              {stats.suggestedNiches.length} suggested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">
              {stats.suggestedCategories.length} suggested
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Processing Progress */}
      {batchProgress.inProgress && (
        <Alert className="mb-6">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Processing Websites</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <div className="flex justify-between mb-2">
                <span>Progress: {batchProgress.processed} / {batchProgress.total}</span>
                <span>{Math.round((batchProgress.processed / batchProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(batchProgress.processed / batchProgress.total) * 100}%` }}
                />
              </div>
              {batchProgress.currentBatch.length > 0 && (
                <p className="text-sm mt-2">
                  Current batch: {batchProgress.currentBatch.length} websites
                </p>
              )}
              {batchProgress.errors.length > 0 && (
                <div className="mt-2 text-red-600 text-sm">
                  Errors: {batchProgress.errors.join(', ')}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="websites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="suggestions">Suggested Tags</TabsTrigger>
          <TabsTrigger value="current">Current Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="websites" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Search</label>
                  <input
                    type="text"
                    placeholder="Search domains..."
                    className="w-full px-3 py-2 border rounded-lg"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Has Niche</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={filters.hasNiche}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasNiche: e.target.value as any }))}
                  >
                    <option value="all">All</option>
                    <option value="yes">Has Niche</option>
                    <option value="no">Missing Niche</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Last Check (days)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={filters.daysAgo}
                    onChange={(e) => setFilters(prev => ({ ...prev, daysAgo: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={processBatch}
                    disabled={batchProgress.inProgress}
                    className="w-full"
                  >
                    {batchProgress.inProgress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Analyze {selectedWebsites.size > 0 ? `${selectedWebsites.size} Selected` : 'Outdated'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {selectedWebsites.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge>{selectedWebsites.size} selected</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWebsites(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Websites Table */}
          <Card>
            <CardHeader>
              <CardTitle>Websites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <input
                          type="checkbox"
                          checked={selectedWebsites.size === websites.length && websites.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWebsites(new Set(websites.map(w => w.id)));
                            } else {
                              setSelectedWebsites(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-2">Domain</th>
                      <th className="text-left p-2">Current Niches</th>
                      <th className="text-left p-2">Categories</th>
                      <th className="text-left p-2">Last Check</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {websites.map((website) => (
                      <tr key={website.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedWebsites.has(website.id)}
                            onChange={() => toggleWebsiteSelection(website.id)}
                          />
                        </td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{website.domain}</div>
                            <div className="text-xs text-gray-500">
                              DR: {website.domainRating || '-'} | Traffic: {website.totalTraffic?.toLocaleString() || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {website.niche?.map((n) => (
                              <Badge key={n} variant="secondary" className="text-xs">
                                {n}
                              </Badge>
                            )) || <span className="text-gray-400">None</span>}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {website.categories?.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">
                                {c}
                              </Badge>
                            )) || <span className="text-gray-400">None</span>}
                          </div>
                        </td>
                        <td className="p-2">
                          {website.lastNicheCheck ? (
                            <div className="text-sm">
                              {new Date(website.lastNicheCheck).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </td>
                        <td className="p-2">
                          {website.lastNicheCheck ? (
                            new Date(website.lastNicheCheck) > new Date(Date.now() - filters.daysAgo * 24 * 60 * 60 * 1000) ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            )
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {/* Suggested Niches */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested New Niches</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.suggestedNiches.length > 0 ? (
                <div className="space-y-3">
                  {stats.suggestedNiches.map((suggestion) => (
                    <div key={suggestion.niche} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{suggestion.niche}</div>
                        <div className="text-sm text-gray-600">
                          Found on {suggestion.count} websites
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Examples: {suggestion.websites.slice(0, 3).join(', ')}
                          {suggestion.websites.length > 3 && '...'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => approveSuggestedNiche(suggestion.niche)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Niches
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No new niches suggested yet. Run analysis to discover new niches.</p>
              )}
            </CardContent>
          </Card>

          {/* Suggested Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested New Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.suggestedCategories.length > 0 ? (
                <div className="space-y-3">
                  {stats.suggestedCategories.map((suggestion) => (
                    <div key={suggestion.niche} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{suggestion.niche}</div>
                        <div className="text-sm text-gray-600">
                          Found on {suggestion.count} websites
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Examples: {suggestion.websites.slice(0, 3).join(', ')}
                          {suggestion.websites.length > 3 && '...'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => approveSuggestedCategory(suggestion.niche)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Categories
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No new categories suggested yet. Run analysis to discover new categories.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {/* Current Niches */}
          <Card>
            <CardHeader>
              <CardTitle>Current Niches ({currentNiches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentNiches.map((niche) => (
                  <Badge key={niche} variant="default">
                    {niche}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Current Categories ({currentCategories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentCategories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}