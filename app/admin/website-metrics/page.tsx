'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  FileText,
  Filter
} from 'lucide-react';

interface WebsiteMetric {
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: number | null;
  status: string;
  source: string;
  updatedAt: string;
}

export default function WebsiteMetricsPage() {
  const [websites, setWebsites] = useState<WebsiteMetric[]>([]);
  const [filteredWebsites, setFilteredWebsites] = useState<WebsiteMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'missing-dr' | 'missing-traffic' | 'missing-both'>('all');
  const [stats, setStats] = useState({
    total: 0,
    withDR: 0,
    withTraffic: 0,
    missingDR: 0,
    missingTraffic: 0,
    missingBoth: 0
  });
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    updated: number;
    errors: number;
  } | null>(null);

  // Fetch websites
  const fetchWebsites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/website-metrics');
      if (!response.ok) throw new Error('Failed to fetch websites');
      
      const data = await response.json();
      setWebsites(data.websites);
      
      // Calculate stats
      const stats = {
        total: data.websites.length,
        withDR: data.websites.filter((w: WebsiteMetric) => w.domainRating !== null).length,
        withTraffic: data.websites.filter((w: WebsiteMetric) => w.totalTraffic !== null).length,
        missingDR: data.websites.filter((w: WebsiteMetric) => w.domainRating === null).length,
        missingTraffic: data.websites.filter((w: WebsiteMetric) => w.totalTraffic === null).length,
        missingBoth: data.websites.filter((w: WebsiteMetric) => w.domainRating === null && w.totalTraffic === null).length
      };
      setStats(stats);
      
      applyFilter(data.websites, filter);
    } catch (error) {
      console.error('Error fetching websites:', error);
      alert('Failed to fetch websites');
    } finally {
      setLoading(false);
    }
  };

  // Apply filter
  const applyFilter = (websiteList: WebsiteMetric[], filterType: string) => {
    let filtered = websiteList;
    
    switch (filterType) {
      case 'missing-dr':
        filtered = websiteList.filter(w => w.domainRating === null);
        break;
      case 'missing-traffic':
        filtered = websiteList.filter(w => w.totalTraffic === null);
        break;
      case 'missing-both':
        filtered = websiteList.filter(w => w.domainRating === null && w.totalTraffic === null);
        break;
    }
    
    setFilteredWebsites(filtered);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvHeaders = ['domain', 'domainRating', 'totalTraffic', 'guestPostCost', 'status', 'source', 'updatedAt'];
    const csvRows = filteredWebsites.map(w => [
      w.domain,
      w.domainRating !== null ? w.domainRating : '',
      w.totalTraffic !== null ? w.totalTraffic : '',
      w.guestPostCost !== null ? (w.guestPostCost / 100).toFixed(2) : '', // Convert cents to dollars
      w.status,
      w.source,
      w.updatedAt
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `website-metrics-${filter}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadResult(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate headers
        const requiredHeaders = ['domain'];
        const optionalHeaders = ['domainRating', 'totalTraffic'];
        
        if (!headers.includes('domain')) {
          throw new Error('CSV must contain a "domain" column');
        }
        
        // Parse rows
        const updates: any[] = [];
        const errors: string[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          
          // Validate and prepare update
          if (row.domain) {
            const update: any = { domain: row.domain.toLowerCase() };
            
            if (row.domainRating !== undefined && row.domainRating !== '') {
              const dr = parseInt(row.domainRating);
              if (isNaN(dr) || dr < 0 || dr > 100) {
                errors.push(`Row ${i + 1}: Invalid DR value for ${row.domain}`);
                continue;
              }
              update.domainRating = dr;
            }
            
            if (row.totalTraffic !== undefined && row.totalTraffic !== '') {
              const traffic = parseInt(row.totalTraffic);
              if (isNaN(traffic) || traffic < 0) {
                errors.push(`Row ${i + 1}: Invalid traffic value for ${row.domain}`);
                continue;
              }
              update.totalTraffic = traffic;
            }
            
            updates.push(update);
          }
        }
        
        if (errors.length > 0) {
          console.error('CSV parsing errors:', errors);
        }
        
        // Send updates to API
        const response = await fetch('/api/admin/website-metrics/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
        
        const result = await response.json();
        
        setUploadResult({
          success: response.ok,
          message: result.message || 'Update complete',
          updated: result.updated || 0,
          errors: result.errors || 0
        });
        
        // Refresh data
        if (response.ok) {
          await fetchWebsites();
        }
        
      } catch (error) {
        console.error('Error processing CSV:', error);
        setUploadResult({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to process CSV',
          updated: 0,
          errors: 1
        });
      } finally {
        setUploading(false);
        // Reset file input
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    applyFilter(websites, filter);
  }, [filter, websites]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Website Metrics Management</CardTitle>
            <Button onClick={fetchWebsites} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Sites</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.withDR}</div>
                <div className="text-sm text-gray-600">With DR</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.withTraffic}</div>
                <div className="text-sm text-gray-600">With Traffic</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.missingDR}</div>
                <div className="text-sm text-gray-600">Missing DR</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.missingTraffic}</div>
                <div className="text-sm text-gray-600">Missing Traffic</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.missingBoth}</div>
                <div className="text-sm text-gray-600">Missing Both</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Options */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              <Filter className="h-4 w-4 mr-2" />
              All Sites ({stats.total})
            </Button>
            <Button
              variant={filter === 'missing-dr' ? 'default' : 'outline'}
              onClick={() => setFilter('missing-dr')}
            >
              Missing DR ({stats.missingDR})
            </Button>
            <Button
              variant={filter === 'missing-traffic' ? 'default' : 'outline'}
              onClick={() => setFilter('missing-traffic')}
            >
              Missing Traffic ({stats.missingTraffic})
            </Button>
            <Button
              variant={filter === 'missing-both' ? 'default' : 'outline'}
              onClick={() => setFilter('missing-both')}
            >
              Missing Both ({stats.missingBoth})
            </Button>
          </div>

          {/* Export/Import Actions */}
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={exportToCSV}
              disabled={filteredWebsites.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export {filteredWebsites.length} Sites to CSV
            </Button>
            
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="csv-upload"
              />
              <Button 
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Import CSV with Updates'}
              </Button>
            </div>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-4 rounded-lg mb-6 ${
              uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                  {uploadResult.message}
                </span>
              </div>
              {uploadResult.success && (
                <div className="mt-2 text-sm text-gray-600">
                  Updated: {uploadResult.updated} sites
                  {uploadResult.errors > 0 && ` | Errors: ${uploadResult.errors}`}
                </div>
              )}
            </div>
          )}

          {/* CSV Format Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV Format Instructions
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Required column: <code className="bg-gray-200 px-1">domain</code></p>
              <p>• Optional columns: <code className="bg-gray-200 px-1">domainRating</code> (0-100), <code className="bg-gray-200 px-1">totalTraffic</code> (number)</p>
              <p>• First row must be headers</p>
              <p>• Domain names will be automatically normalized (lowercase, no www)</p>
              <p>• Empty values will be skipped (won't overwrite existing data)</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-semibold">Preview ({filteredWebsites.length} sites)</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Domain</th>
                    <th className="px-4 py-2 text-center">DR</th>
                    <th className="px-4 py-2 text-center">Traffic</th>
                    <th className="px-4 py-2 text-center">GP Cost</th>
                    <th className="px-4 py-2 text-center">Source</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWebsites.slice(0, 100).map((website, index) => (
                    <tr key={website.domain} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-mono text-sm">{website.domain}</td>
                      <td className="px-4 py-2 text-center">
                        {website.domainRating !== null ? (
                          <Badge variant="secondary">{website.domainRating}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {website.totalTraffic !== null ? (
                          <Badge variant="secondary">
                            {website.totalTraffic.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {website.guestPostCost !== null ? (
                          <span>${(website.guestPostCost / 100).toFixed(0)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline">{website.source || 'unknown'}</Badge>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge 
                          variant={website.status === 'active' ? 'default' : 'secondary'}
                        >
                          {website.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredWebsites.length > 100 && (
                <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50">
                  Showing first 100 of {filteredWebsites.length} sites. Export to see all.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}