'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { Client, TargetPage } from '@/types/user';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Plus
} from 'lucide-react';

interface BulkAnalysisDomain {
  id: string;
  domain: string;
  qualificationStatus: 'pending' | 'qualified' | 'disqualified';
  keywordCount: number;
  targetPageIds: string[];
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
}

export default function BulkAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [domainText, setDomainText] = useState('');
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');

  useEffect(() => {
    loadClient();
  }, [params.id]);

  useEffect(() => {
    if (client) {
      loadDomains();
    }
  }, [client]);

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
      
      // Get target pages
      const pages = (clientData as any)?.targetPages || [];
      setTargetPages(pages.filter((p: any) => p.status === 'active' && p.keywords));
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const loadDomains = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis`);
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!client || selectedTargetPages.length === 0 || !domainText.trim()) {
      setMessage('Please select target pages and enter domains to analyze');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Parse domains
      const domainList = domainText
        .split('\n')
        .map(d => d.trim())
        .filter(Boolean);

      // Check for existing domains
      const checkResponse = await fetch(`/api/clients/${params.id}/bulk-analysis/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainList })
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        setExistingDomains(checkData.existing || []);
      }

      // Create or update domains
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domains: domainList,
          targetPageIds: selectedTargetPages
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains);
        setDomainText('');
        setMessage(`✅ Added ${data.domains.length} domains for analysis`);
      } else {
        throw new Error('Failed to create domains');
      }
    } catch (error) {
      console.error('Error analyzing domains:', error);
      setMessage('❌ Error analyzing domains');
    } finally {
      setLoading(false);
    }
  };

  const updateQualificationStatus = async (domainId: string, status: 'qualified' | 'disqualified') => {
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await loadDomains();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const createWorkflow = async (domain: string) => {
    // Navigate to workflow creation with pre-filled domain
    router.push(`/workflow/new?clientId=${client?.id}&guestPostSite=${encodeURIComponent(domain)}`);
  };

  const buildAhrefsUrl = (domain: string, keywords: string[]) => {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const targetUrl = `https://${cleanDomain}/`;
    
    if (keywords.length === 0) {
      const positionsParam = selectedPositionRange !== '1-100' ? `&positions=${selectedPositionRange}` : '';
      return `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=&keywordRules=&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc&target=${encodeURIComponent(targetUrl)}&urlRules=&volume_type=average`;
    }
    
    // Batch keywords (50 max per URL)
    const keywordBatch = keywords.slice(0, 50);
    const cleanKeywords = keywordBatch.join(', ');
    const keywordRulesArray = [["contains","all"], cleanKeywords, "any"];
    const keywordRulesEncoded = encodeURIComponent(JSON.stringify(keywordRulesArray));
    
    const positionsParam = selectedPositionRange !== '1-100' ? `&positions=${selectedPositionRange}` : '';
    let url = `https://app.ahrefs.com/v2-site-explorer/organic-keywords?brandedMode=all&chartGranularity=daily&chartInterval=year5&compareDate=dontCompare&country=us&currentDate=today&dataMode=text&hiddenColumns=&intentsAttrs=`;
    url += `&keywordRules=${keywordRulesEncoded}`;
    url += `&limit=100&localMode=all&mainOnly=0&mode=subdomains&multipleUrlsOnly=0&offset=0&performanceChartTopPosition=top11_20%7C%7Ctop21_50%7C%7Ctop3%7C%7Ctop4_10%7C%7Ctop51&positionChanges=${positionsParam}&serpFeatures=&sort=OrganicTrafficInitial&sortDirection=desc`;
    url += `&target=${encodeURIComponent(targetUrl)}`;
    url += `&urlRules=&volume_type=average`;
    
    return url;
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

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href={`/clients/${client.id}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {client.name}
              </Link>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bulk Domain Analysis</h1>
                <p className="text-gray-600 mt-1">Pre-qualify guest post opportunities in bulk</p>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Target Page Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">1. Select Target Pages</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose which target pages to use for keyword analysis. Keywords from selected pages will be combined and deduplicated.
            </p>
            
            {targetPages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No active target pages with keywords found.</p>
                <p className="text-sm mt-2">Please add target pages and generate keywords first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {targetPages.map((page) => (
                  <label key={page.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
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
                      <div className="font-medium text-sm">{page.url}</div>
                      <div className="text-xs text-gray-500">
                        {(page as any).keywords?.split(',').length || 0} keywords
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {selectedTargetPages.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedTargetPages.length} pages • 
                Total keywords: {
                  targetPages
                    .filter(p => selectedTargetPages.includes(p.id))
                    .reduce((acc, p) => {
                      const keywordList = (p as any).keywords?.split(',').map((k: string) => k.trim()) || [];
                      keywordList.forEach((k: string) => acc.add(k));
                      return acc;
                    }, new Set<string>()).size
                } (deduplicated)
              </div>
            )}
          </div>

          {/* Domain Input */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">2. Enter Domains to Analyze</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste domains to analyze (one per line). Domains will be checked against keywords from selected target pages.
            </p>
            
            <textarea
              value={domainText}
              onChange={(e) => setDomainText(e.target.value)}
              placeholder="example.com\nblog.example.com\nanotherdomain.com"
              className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            
            {existingDomains.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">Previously checked domains found:</p>
                <ul className="text-sm text-yellow-700 mt-1">
                  {existingDomains.map(d => (
                    <li key={d.domain}>• {d.domain} ({d.status})</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={handleAnalyze}
              disabled={loading || selectedTargetPages.length === 0 || !domainText.trim()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Analyze Domains
                </>
              )}
            </button>
          </div>

          {/* Results Grid */}
          {domains.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium">Analysis Results</h2>
                
                {/* Position Range Selector */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">Search Position Range</h4>
                    <span className="text-xs text-gray-500">Current: {selectedPositionRange}</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { value: '1-10', label: '1-10' },
                      { value: '1-20', label: '1-20' },
                      { value: '1-50', label: '1-50' },
                      { value: '1-100', label: '1-100' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedPositionRange(option.value)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          selectedPositionRange === option.value
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedPositionRange === '1-10' && 'Highest relevance & best rankability'}
                    {selectedPositionRange === '1-20' && 'High relevance & good rankability'}
                    {selectedPositionRange === '1-50' && 'Moderate relevance (recommended)'}
                    {selectedPositionRange === '1-100' && 'All rankings (lowest average rankability)'}
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4">
                {domains.map((domain) => {
                  // Get keywords for this domain's target pages
                  const keywords = targetPages
                    .filter(p => domain.targetPageIds.includes(p.id))
                    .reduce((acc, p) => {
                      const pageKeywords = (p as any).keywords?.split(',').map((k: string) => k.trim()) || [];
                      pageKeywords.forEach((k: string) => acc.add(k));
                      return acc;
                    }, new Set<string>());
                  
                  const keywordArray = Array.from(keywords);
                  const keywordBatches = [];
                  for (let i = 0; i < keywordArray.length; i += 50) {
                    keywordBatches.push(keywordArray.slice(i, i + 50));
                  }
                  
                  return (
                    <div key={domain.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{domain.domain}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {domain.keywordCount} keywords • 
                            {domain.targetPageIds.length} target pages
                          </p>
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            {keywordBatches.map((batch, index) => (
                              <a
                                key={index}
                                href={buildAhrefsUrl(domain.domain, batch)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Ahrefs {keywordBatches.length > 1 ? `(${index + 1}/${keywordBatches.length})` : ''}
                              </a>
                            ))}
                          </div>
                        </div>
                        
                        <div className="ml-4 flex items-center space-x-2">
                          {domain.qualificationStatus === 'pending' ? (
                            <>
                              <button
                                onClick={() => updateQualificationStatus(domain.id, 'qualified')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Mark as Qualified"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => updateQualificationStatus(domain.id, 'disqualified')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                title="Mark as Disqualified"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          ) : domain.qualificationStatus === 'qualified' ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Qualified
                              </span>
                              <button
                                onClick={() => createWorkflow(domain.domain)}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Create Workflow
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                              <XCircle className="w-4 h-4 mr-1" />
                              Disqualified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}