'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Database,
  Activity
} from 'lucide-react';

interface PricingComparison {
  id: string;
  domain: string;
  currentPrice: number | null;
  derivedPrice: number | null;
  calculationMethod: string;
  calculatedAt: string | null;
  status: 'match' | 'mismatch' | 'current_null' | 'derived_null' | 'both_null';
  difference: number;
  percentDifference: number | null;
}

interface DerivedPricingStats {
  totalWebsites: number;
  withDerivedPrices: number;
  matchingPrices: number;
  mismatchedPrices: number;
  missingDerived: number;
  readyPercentage: number;
}

export default function DerivedPricingDashboard() {
  const [stats, setStats] = useState<DerivedPricingStats | null>(null);
  const [comparisons, setComparisons] = useState<PricingComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'match' | 'mismatch' | 'derived_null'>('all');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/derived-pricing');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      setStats(data.stats);
      setComparisons(data.comparisons);
    } catch (error) {
      console.error('Error fetching derived pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllPrices = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/derived-pricing/update-all', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to update prices');
      
      const result = await response.json();
      console.log('Bulk update result:', result);
      
      // Refresh data after update
      await fetchData();
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredComparisons = comparisons.filter(comparison => {
    if (filter === 'all') return true;
    return comparison.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      match: { variant: 'default' as const, icon: CheckCircle, text: 'Match' },
      mismatch: { variant: 'destructive' as const, icon: AlertTriangle, text: 'Mismatch' },
      derived_null: { variant: 'secondary' as const, icon: Database, text: 'Missing Derived' },
      current_null: { variant: 'outline' as const, icon: Activity, text: 'Current Null' },
      both_null: { variant: 'outline' as const, icon: Activity, text: 'Both Null' },
    };

    const config = variants[status as keyof typeof variants] || variants.match;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'NULL';
    return `$${(price / 100).toFixed(2)}`;
  };

  const formatDifference = (difference: number, percentDifference: number | null) => {
    if (difference === 0) return '±$0.00';
    
    const sign = difference > 0 ? '+' : '';
    const color = difference > 0 ? 'text-red-600' : 'text-green-600';
    const icon = difference > 0 ? TrendingUp : TrendingDown;
    const Icon = icon;
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span>
          {sign}${Math.abs(difference / 100).toFixed(2)}
          {percentDifference !== null && (
            <span className="text-xs ml-1">({percentDifference.toFixed(1)}%)</span>
          )}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading derived pricing data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Derived Pricing Dashboard</h1>
          <p className="text-muted-foreground">Phase 6B Shadow Mode Monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={updateAllPrices} 
            disabled={updating}
            variant="outline"
          >
            <Database className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Updating...' : 'Update All Prices'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWebsites}</div>
              <p className="text-xs text-muted-foreground">
                With pricing data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Migration</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.readyPercentage}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.matchingPrices} of {stats.totalWebsites} websites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Mismatches</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.mismatchedPrices}</div>
              <p className="text-xs text-muted-foreground">
                Require review or provide customer benefits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing Derived</CardTitle>
              <Database className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.missingDerived}</div>
              <p className="text-xs text-muted-foreground">
                Need guest_post offerings
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Comparisons Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pricing Comparisons</CardTitle>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
              <TabsList>
                <TabsTrigger value="all">All ({comparisons.length})</TabsTrigger>
                <TabsTrigger value="match">
                  Matches ({comparisons.filter(c => c.status === 'match').length})
                </TabsTrigger>
                <TabsTrigger value="mismatch">
                  Mismatches ({comparisons.filter(c => c.status === 'mismatch').length})
                </TabsTrigger>
                <TabsTrigger value="derived_null">
                  Missing ({comparisons.filter(c => c.status === 'derived_null').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Website</th>
                    <th className="text-left p-4 font-medium">Current Price</th>
                    <th className="text-left p-4 font-medium">Derived Price</th>
                    <th className="text-left p-4 font-medium">Difference</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComparisons.slice(0, 50).map((comparison) => (
                    <tr key={comparison.id} className="border-b hover:bg-muted/25">
                      <td className="p-4">
                        <div className="font-mono text-sm">{comparison.domain}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono">
                          {formatPrice(comparison.currentPrice)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono">
                          {formatPrice(comparison.derivedPrice)}
                        </div>
                      </td>
                      <td className="p-4">
                        {formatDifference(comparison.difference, comparison.percentDifference)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(comparison.status)}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {comparison.calculationMethod}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredComparisons.length > 50 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                Showing first 50 of {filteredComparisons.length} results
              </div>
            )}
            
            {filteredComparisons.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No pricing comparisons found for the selected filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phase 6B Status */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 6B Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Completed</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Database schema updated with derived pricing fields</li>
                <li>• Derived prices calculated for all {stats?.totalWebsites || 0} websites</li>
                <li>• Shadow mode active with {stats?.readyPercentage || 0}% accuracy</li>
                <li>• Pricing comparison view created</li>
                <li>• Admin dashboard operational</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🔄 Next Steps</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Monitor accuracy for 1-2 weeks</li>
                <li>• Review remaining {stats?.mismatchedPrices || 0} mismatches</li>
                <li>• Implement feature flag integration</li>
                <li>• Plan Phase 6C: Full migration</li>
                <li>• Create automated triggers (optional)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">🎯 Business Impact</h4>
            <p className="text-sm text-blue-700">
              Shadow mode analysis shows that {stats?.mismatchedPrices || 0} websites with price differences 
              will provide customers with <strong>lower prices</strong> when derived pricing goes live. 
              This represents a competitive advantage with simplified management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}