'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';

interface Client {
  id: string;
  name: string;
  website: string;
}

interface TargetPage {
  id: string;
  url: string;
  domain: string;
  keywords: string;
}

interface Site {
  domain: string;
  url?: string;
  siteName?: string;
  monthlyTraffic?: number;
  domainAuthority?: number;
  niche?: string;
  notes?: string;
}

export default function NewBulkQualificationPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [checkDepth, setCheckDepth] = useState('balanced');
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [sites, setSites] = useState<Site[]>([{ domain: '' }]);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadTargetPages(selectedClientId);
    } else {
      setTargetPages([]);
      setSelectedTargetPages([]);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      // Get the current session
      const session = AuthService.getSession();
      const userId = session?.userId;
      
      // Add userId to clients API call if available
      const clientsUrl = userId ? `/api/clients?userId=${userId}` : '/api/clients';
      
      const response = await fetch(clientsUrl);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        
        // Auto-select first client if only one
        if (data.clients?.length === 1) {
          setSelectedClientId(data.clients[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTargetPages = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/target-pages`);
      if (response.ok) {
        const data = await response.json();
        setTargetPages(data.targetPages || []);
      }
    } catch (error) {
      console.error('Failed to load target pages:', error);
    }
  };

  const addSite = () => {
    setSites([...sites, { domain: '' }]);
  };

  const removeSite = (index: number) => {
    setSites(sites.filter((_, i) => i !== index));
  };

  const updateSite = (index: number, field: keyof Site, value: string | number) => {
    const updatedSites = sites.map((site, i) => {
      if (i === index) {
        return { ...site, [field]: value };
      }
      return site;
    });
    setSites(updatedSites);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId || !jobName || selectedTargetPages.length === 0 || sites.filter(s => s.domain.trim()).length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    
    try {
      const validSites = sites.filter(site => site.domain.trim()).map(site => ({
        ...site,
        url: site.url || `https://${site.domain}`,
        siteName: site.siteName || site.domain,
        sourceType: 'manual'
      }));

      const response = await fetch('/api/bulk-qualification/create-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          name: jobName,
          description: jobDescription,
          checkDepth,
          targetPages: selectedTargetPages,
          sites: validSites
        })
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/bulk-qualification/${data.jobId}`);
      } else {
        const error = await response.json();
        alert(`Failed to create job: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create qualification job. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const parseSitesFromText = (text: string) => {
    const domains = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Extract domain from URL if provided
        const domain = line.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
        return { domain };
      });

    if (domains.length > 0) {
      setSites(domains);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        {loading ? (
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/bulk-qualification" className="text-blue-600 hover:text-blue-700">
            ← Back to Bulk Qualification
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create Qualification Job</h1>
        <p className="text-gray-600 mt-2">
          Set up a new bulk qualification to analyze multiple sites for guest posting opportunities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Job Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.website})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Depth
              </label>
              <select
                value={checkDepth}
                onChange={(e) => setCheckDepth(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="minimal">Minimal (faster, basic check)</option>
                <option value="balanced">Balanced (recommended)</option>
                <option value="thorough">Thorough (slower, comprehensive)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Name *
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Tech Sites - January 2024"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Brief description of this qualification job..."
              />
            </div>
          </div>
        </div>

        {/* Target Pages */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Target Pages *</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select which target pages to analyze sites against. We'll use their keywords for ranking analysis.
          </p>

          {targetPages.length === 0 ? (
            <div className="text-gray-500 py-4">
              {selectedClientId ? (
                <>No target pages found for this client. <Link href={`/clients/${selectedClientId}`} className="text-blue-600">Add some target pages first →</Link></>
              ) : (
                'Select a client to see their target pages.'
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {targetPages.map((page) => (
                <label key={page.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedTargetPages.includes(page.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargetPages([...selectedTargetPages, page.id]);
                      } else {
                        setSelectedTargetPages(selectedTargetPages.filter(id => id !== page.id));
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{page.domain}</div>
                    <div className="text-sm text-gray-600">{page.url}</div>
                    {page.keywords && (
                      <div className="text-sm text-gray-500 mt-1">
                        Keywords: {page.keywords.split(',').slice(0, 3).join(', ')}{page.keywords.split(',').length > 3 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sites to Analyze */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sites to Analyze *</h2>
            <button
              type="button"
              onClick={addSite}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              + Add Site
            </button>
          </div>

          {/* Bulk Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Add (one domain per line)
            </label>
            <textarea
              placeholder="example.com&#10;techcrunch.com&#10;venturebeat.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={4}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  parseSitesFromText(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <p className="text-sm text-gray-600 mt-1">
              Paste domains or URLs, one per line. This will replace the current list.
            </p>
          </div>

          {/* Individual Sites */}
          <div className="space-y-4">
            {sites.map((site, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-md">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="example.com *"
                    value={site.domain}
                    onChange={(e) => updateSite(index, 'domain', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Site Name"
                    value={site.siteName || ''}
                    onChange={(e) => updateSite(index, 'siteName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Monthly Traffic"
                    value={site.monthlyTraffic || ''}
                    onChange={(e) => updateSite(index, 'monthlyTraffic', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="DA"
                    value={site.domainAuthority || ''}
                    onChange={(e) => updateSite(index, 'domainAuthority', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    max="100"
                  />
                </div>
                <div className="flex items-center">
                  {sites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSite(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Only domain is required. Other fields help with organization but don't affect the analysis.
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Link 
            href="/bulk-qualification"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating Job...' : 'Create Qualification Job'}
          </button>
        </div>
      </form>
    </div>
        )}
      </div>
    </AuthWrapper>
  );
}