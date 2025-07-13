'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client, TargetPage } from '@/types/user';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Clock, 
  Edit, Globe, ExternalLink, Check, Settings 
} from 'lucide-react';
import { KeywordPreferencesSelector } from '@/components/ui/KeywordPreferencesSelector';
import { getClientKeywordPreferences, setClientKeywordPreferences, KeywordPreferences } from '@/types/keywordPreferences';
import { KeywordGenerationButton } from '@/components/ui/KeywordGenerationButton';
import { KeywordDisplay } from '@/components/ui/KeywordDisplay';
import { DescriptionGenerationButton } from '@/components/ui/DescriptionGenerationButton';
import { DescriptionDisplay } from '@/components/ui/DescriptionDisplay';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkAction, setBulkAction] = useState<'active' | 'inactive' | 'completed' | 'delete' | 'generate-keywords' | 'generate-descriptions' | ''>('');
  const [newPages, setNewPages] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');
  const [showKeywordPrefs, setShowKeywordPrefs] = useState(false);
  const [keywordMessage, setKeywordMessage] = useState('');
  const [descriptionMessage, setDescriptionMessage] = useState('');
  const [showKeywordPrompt, setShowKeywordPrompt] = useState(false);
  const [newlyAddedPages, setNewlyAddedPages] = useState<any[]>([]);
  const [bulkKeywordProgress, setBulkKeywordProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadClient();
  }, [params.id]);

  const loadClient = async () => {
    try {
      const clientData = await clientStorage.getClient(params.id as string);
      if (!clientData) {
        router.push('/clients');
        return;
      }
      setClient(clientData);
    } catch (error) {
      console.error('Error loading client:', error);
      router.push('/clients');
    }
  };

  const handleAddPages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const urls = newPages
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) return;

    try {
      await clientStorage.addTargetPages(client.id, urls);
      setNewPages('');
      setShowAddForm(false);
      await loadClient();
      
      // Prompt user to generate keywords AND descriptions for newly added pages
      setNewlyAddedPages(urls.map(url => ({ url })));
      setShowKeywordPrompt(true);
    } catch (error: any) {
      alert('Error adding pages: ' + error.message);
    }
  };

  const handleBulkAction = async () => {
    if (!client || selectedPages.length === 0 || !bulkAction) return;

    if (bulkAction === 'generate-keywords') {
      handleBulkSelectedKeywordAndDescriptionGeneration();
      return;
    }

    if (bulkAction === 'generate-descriptions') {
      handleBulkSelectedKeywordAndDescriptionGeneration();
      return;
    }

    const confirmMessage = bulkAction === 'delete' 
      ? `Delete ${selectedPages.length} selected pages?`
      : `Mark ${selectedPages.length} pages as ${bulkAction}?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (bulkAction === 'delete') {
        await clientStorage.removeTargetPages(client.id, selectedPages);
      } else {
        await clientStorage.updateTargetPageStatus(client.id, selectedPages, bulkAction);
      }
      
      setSelectedPages([]);
      setBulkAction('');
      await loadClient();
    } catch (error: any) {
      alert('Error performing bulk action: ' + error.message);
    }
  };

  // Handle client keyword preference updates
  const handleClientKeywordPreferencesUpdate = async (preferences: KeywordPreferences) => {
    if (!client) return;

    try {
      const updatedClient = setClientKeywordPreferences(client, preferences);
      
      // Only send the fields that actually changed (just description in this case)
      const updates = {
        description: updatedClient.description
      };
      
      // Save to server first, then update local state
      await clientStorage.updateClient(client.id, updates as any);
      
      // Update local state after successful save
      setClient(updatedClient);
    } catch (error: any) {
      console.error('Error updating topic preferences:', error);
      alert('Error updating topic preferences: ' + error.message);
    }
  };

  const handleKeywordSuccess = (keywords: string[]) => {
    setKeywordMessage(`✅ Generated ${keywords.length} keywords successfully!`);
    // Refresh client data to show updated keywords
    loadClient();
    // Clear message after 5 seconds
    setTimeout(() => setKeywordMessage(''), 5000);
  };

  const handleKeywordError = (error: string) => {
    setKeywordMessage(`❌ Keyword generation failed: ${error}`);
    // Clear message after 8 seconds
    setTimeout(() => setKeywordMessage(''), 8000);
  };

  const handleKeywordsUpdate = (keywords: string[]) => {
    setKeywordMessage(`✅ Keywords updated! Now showing ${keywords.length} keywords.`);
    // Refresh client data to show updated keywords
    loadClient();
    // Clear message after 5 seconds
    setTimeout(() => setKeywordMessage(''), 5000);
  };

  const handleDescriptionSuccess = (description: string) => {
    setDescriptionMessage(`✅ Generated description successfully! (${description.length} characters)`);
    // Refresh client data to show updated description
    loadClient();
    // Clear message after 5 seconds
    setTimeout(() => setDescriptionMessage(''), 5000);
  };

  const handleDescriptionError = (error: string) => {
    setDescriptionMessage(`❌ Description generation failed: ${error}`);
    // Clear message after 8 seconds
    setTimeout(() => setDescriptionMessage(''), 8000);
  };

  const handleDescriptionUpdate = (description: string) => {
    setDescriptionMessage(`✅ Description updated! (${description.length} characters)`);
    // Refresh client data to show updated description
    loadClient();
    // Clear message after 5 seconds
    setTimeout(() => setDescriptionMessage(''), 5000);
  };

  const handleBulkKeywordAndDescriptionGeneration = async () => {
    if (!client || newlyAddedPages.length === 0) return;

    setBulkKeywordProgress({ current: 0, total: newlyAddedPages.length });
    setShowKeywordPrompt(false);

    // Find the actual target page IDs from the loaded client data
    const targetPages = (client as any)?.targetPages || [];
    const pagesToProcess = newlyAddedPages.map(newPage => {
      const foundPage = targetPages.find((page: any) => page.url === newPage.url);
      return foundPage;
    }).filter(Boolean);

    for (let i = 0; i < pagesToProcess.length; i++) {
      const page = pagesToProcess[i];
      setBulkKeywordProgress({ current: i + 1, total: pagesToProcess.length });

      try {
        // Generate BOTH keywords AND descriptions for this page
        const [keywordResponse, descriptionResponse] = await Promise.all([
          fetch(`/api/target-pages/${page.id}/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          }),
          fetch(`/api/target-pages/${page.id}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          })
        ]);

        if (keywordResponse.ok && descriptionResponse.ok) {
          const [keywordResult, descriptionResult] = await Promise.all([
            keywordResponse.json(),
            descriptionResponse.json()
          ]);
          console.log(`Keywords & description generated for ${page.url}:`, {
            keywords: keywordResult.keywords,
            description: descriptionResult.description
          });
        } else {
          console.error(`Failed to generate data for ${page.url}`);
        }

        // Small delay between requests to avoid overwhelming the API
        if (i < pagesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`Error generating data for ${page.url}:`, error);
      }
    }

    // Reset state and refresh data
    setBulkKeywordProgress({ current: 0, total: 0 });
    setNewlyAddedPages([]);
    await loadClient();
    setKeywordMessage(`✅ Bulk keywords & descriptions generation completed for ${pagesToProcess.length} pages!`);
    setTimeout(() => setKeywordMessage(''), 5000);
  };

  const cancelBulkKeywordGeneration = () => {
    setShowKeywordPrompt(false);
    setNewlyAddedPages([]);
  };

  const handleBulkSelectedKeywordAndDescriptionGeneration = async () => {
    if (!client || selectedPages.length === 0) return;

    // Get selected target pages from client data
    const targetPages = (client as any)?.targetPages || [];
    const pagesToProcess = selectedPages.map(pageId => {
      return targetPages.find((page: any) => page.id === pageId);
    }).filter(Boolean);

    // Analyze each page's data state for granular handling
    const pageAnalysis = pagesToProcess.map(page => {
      const hasKeywords = page.keywords && page.keywords.trim() !== '';
      const hasDescription = page.description && page.description.trim() !== '';
      
      return {
        page,
        hasKeywords,
        hasDescription,
        needsKeywords: !hasKeywords,
        needsDescription: !hasDescription,
        needsBoth: !hasKeywords && !hasDescription,
        hasPartial: (hasKeywords && !hasDescription) || (!hasKeywords && hasDescription),
        isComplete: hasKeywords && hasDescription
      };
    });

    // Categorize pages by data state
    const completePages = pageAnalysis.filter(p => p.isComplete);
    const partialPages = pageAnalysis.filter(p => p.hasPartial);
    const emptyPages = pageAnalysis.filter(p => p.needsBoth);
    
    // Count what needs to be generated
    const keywordsNeeded = pageAnalysis.filter(p => p.needsKeywords).length;
    const descriptionsNeeded = pageAnalysis.filter(p => p.needsDescription).length;
    
    let generateOnlyMissing = true;
    let pagesToActuallyProcess = pageAnalysis;

    // Smart user prompts based on data state
    if (partialPages.length > 0 || completePages.length > 0) {
      let message = '';
      
      if (partialPages.length > 0 && emptyPages.length > 0) {
        message = `📊 SMART GENERATION:\n` +
          `• ${emptyPages.length} pages need both keywords & descriptions\n` +
          `• ${partialPages.length} pages have partial data (missing ${keywordsNeeded} keywords, ${descriptionsNeeded} descriptions)\n` +
          `• ${completePages.length} pages are complete\n\n` +
          `💰 EFFICIENT: Click OK to generate ONLY missing data (${keywordsNeeded + descriptionsNeeded} API calls).\n` +
          `Click Cancel to regenerate EVERYTHING (${pagesToProcess.length * 2} API calls).`;
      } else if (partialPages.length > 0 && emptyPages.length === 0) {
        message = `📊 PARTIAL DATA DETECTED:\n` +
          `• ${partialPages.length} pages have partial data (missing ${keywordsNeeded} keywords, ${descriptionsNeeded} descriptions)\n` +
          `• ${completePages.length} pages are complete\n\n` +
          `💰 EFFICIENT: Click OK to generate ONLY missing data (${keywordsNeeded + descriptionsNeeded} API calls).\n` +
          `Click Cancel to regenerate EVERYTHING (${pagesToProcess.length * 2} API calls).`;
      } else if (completePages.length > 0 && emptyPages.length > 0) {
        message = `📊 MIXED DATA STATE:\n` +
          `• ${emptyPages.length} pages need both keywords & descriptions\n` +
          `• ${completePages.length} pages already have both\n\n` +
          `💰 EFFICIENT: Click OK to generate ONLY for empty pages (${emptyPages.length * 2} API calls).\n` +
          `Click Cancel to regenerate ALL pages (${pagesToProcess.length * 2} API calls).`;
      } else if (completePages.length === pagesToProcess.length) {
        message = `All ${completePages.length} selected pages already have complete data.\n\n` +
          `💰 This will regenerate keywords & descriptions for all (${pagesToProcess.length * 2} API calls). Continue anyway?`;
      }

      const choice = confirm(message);
      
      if (!choice) {
        generateOnlyMissing = false; // Regenerate everything
      } else if (completePages.length === pagesToProcess.length) {
        // All complete, user confirmed to regenerate everything
        generateOnlyMissing = false;
      }
    } else if (emptyPages.length > 0) {
      const choice = confirm(`Generate keywords & descriptions for ${emptyPages.length} pages? (${emptyPages.length * 2} API calls)`);
      if (!choice) return;
    }

    // Filter pages to process based on user choice
    if (generateOnlyMissing) {
      pagesToActuallyProcess = pageAnalysis.filter(p => p.needsKeywords || p.needsDescription);
    }

    if (pagesToActuallyProcess.length === 0) {
      setKeywordMessage('✅ No generation needed - all selected pages have complete data!');
      setTimeout(() => setKeywordMessage(''), 3000);
      return;
    }

    // Start bulk generation
    setBulkKeywordProgress({ current: 0, total: pagesToActuallyProcess.length });
    setSelectedPages([]);
    setBulkAction('');

    let totalApiCalls = 0;
    
    for (let i = 0; i < pagesToActuallyProcess.length; i++) {
      const { page, needsKeywords, needsDescription } = pagesToActuallyProcess[i];
      setBulkKeywordProgress({ current: i + 1, total: pagesToActuallyProcess.length });

      try {
        const apiCalls = [];
        
        // Conditional API calls based on what's needed
        if (!generateOnlyMissing || needsKeywords) {
          apiCalls.push(
            fetch(`/api/target-pages/${page.id}/keywords`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUrl: page.url })
            })
          );
          totalApiCalls++;
        }
        
        if (!generateOnlyMissing || needsDescription) {
          apiCalls.push(
            fetch(`/api/target-pages/${page.id}/description`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetUrl: page.url })
            })
          );
          totalApiCalls++;
        }

        if (apiCalls.length > 0) {
          const responses = await Promise.all(apiCalls);
          const results = await Promise.all(responses.map(r => r.json()));
          
          console.log(`Generated data for ${page.url}:`, {
            generatedKeywords: needsKeywords || !generateOnlyMissing,
            generatedDescription: needsDescription || !generateOnlyMissing,
            results
          });
        }

        // Small delay between requests to avoid overwhelming the API
        if (i < pagesToActuallyProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`Error generating data for ${page.url}:`, error);
      }
    }

    // Reset state and refresh data
    setBulkKeywordProgress({ current: 0, total: 0 });
    await loadClient();
    
    const efficiencyNote = generateOnlyMissing ? ` (${totalApiCalls} efficient API calls)` : ` (${totalApiCalls} total API calls)`;
    setKeywordMessage(`✅ Bulk generation completed for ${pagesToActuallyProcess.length} pages${efficiencyNote}!`);
    setTimeout(() => setKeywordMessage(''), 5000);
  };


  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const toggleSelectAll = () => {
    const filteredPages = getFilteredPages();
    if (selectedPages.length === filteredPages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(filteredPages.map((page: any) => page.id));
    }
  };

  const getFilteredPages = () => {
    if (!client) return [];
    const pages = (client as any).targetPages || [];
    if (filter === 'all') return pages;
    return pages.filter((page: any) => page.status === filter);
  };

  const getStatusIcon = (status: TargetPage['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: TargetPage['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
    }
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

  const filteredPages = getFilteredPages();
  const pages = (client as any)?.targetPages || [];
  const stats = {
    total: pages.length,
    active: pages.filter((p: any) => p.status === 'active').length,
    inactive: pages.filter((p: any) => p.status === 'inactive').length,
    completed: pages.filter((p: any) => p.status === 'completed').length,
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link
                href="/clients"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
              </Link>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center mt-1"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  {client.website}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              
              <div className="flex space-x-3">
                <Link
                  href={`/workflow/new?clientId=${client.id}`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                  Create Workflow
                </Link>
                <button
                  onClick={() => setShowKeywordPrefs(true)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Topic Preferences
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pages
                </button>
              </div>
            </div>
          </div>

          {/* Keyword Generation Message */}
          {keywordMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              keywordMessage.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {keywordMessage}
            </div>
          )}

          {/* Description Generation Message */}
          {descriptionMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              descriptionMessage.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {descriptionMessage}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Pages</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>

          {/* Client Keyword Preferences Form */}
          {showKeywordPrefs && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Default Guest Post Topic Preferences for {client.name}</h3>
                <button
                  onClick={() => setShowKeywordPrefs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Set default guest post topic preferences for this client. These will be automatically applied to all new workflows, but can be overridden at the workflow level when needed.
              </p>
              
              <KeywordPreferencesSelector
                preferences={getClientKeywordPreferences(client) || undefined}
                onChange={handleClientKeywordPreferencesUpdate}
              />
              
              <div className="mt-6 pt-4 border-t flex justify-end">
                <button
                  onClick={() => setShowKeywordPrefs(false)}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Add Pages Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Add Target Pages</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add URLs from {client.name}'s website that you want to get links TO from guest posts
              </p>
              <form onSubmit={handleAddPages}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client URLs (one per line)
                  </label>
                  <textarea
                    value={newPages}
                    onChange={(e) => setNewPages(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder={`${client.website}/blog/best-practices\n${client.website}/services/consulting\n${client.website}/about-us`}
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Add Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Keyword Generation Prompt */}
          {showKeywordPrompt && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-purple-500">
              <h3 className="text-lg font-medium mb-4 text-purple-800">Generate Keywords & Descriptions for New Pages?</h3>
              <p className="text-sm text-gray-600 mb-4">
                You just added {newlyAddedPages.length} new target page(s). Would you like to automatically generate keywords AND descriptions for all of them using AI?
              </p>
              <div className="bg-purple-50 p-3 rounded-md mb-4">
                <p className="text-xs text-purple-700">
                  This will use OpenAI to analyze each page and generate both relevant keywords and page descriptions for guest post targeting. 
                  The process takes about 2-3 seconds per page (both APIs run in parallel).
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleBulkKeywordAndDescriptionGeneration}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                >
                  Yes, Generate Keywords & Descriptions
                </button>
                <button
                  onClick={cancelBulkKeywordGeneration}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {/* Bulk Keyword Generation Progress */}
          {bulkKeywordProgress.total > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-medium mb-4 text-blue-800">Generating Keywords & Descriptions...</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progress: {bulkKeywordProgress.current} of {bulkKeywordProgress.total} pages</span>
                  <span>{Math.round((bulkKeywordProgress.current / bulkKeywordProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bulkKeywordProgress.current / bulkKeywordProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  Please wait while AI generates keywords & descriptions for your target pages...
                </p>
              </div>
            </div>
          )}

          {/* Filter and Bulk Actions */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filters */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1"
                  >
                    <option value="all">All Pages ({stats.total})</option>
                    <option value="active">Active ({stats.active})</option>
                    <option value="inactive">Inactive ({stats.inactive})</option>
                    <option value="completed">Completed ({stats.completed})</option>
                  </select>
                </div>

                {/* Bulk Actions */}
                {selectedPages.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {selectedPages.length} selected
                    </span>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1"
                    >
                      <option value="">Bulk Action...</option>
                      <option value="active">Mark as Active</option>
                      <option value="inactive">Mark as Inactive</option>
                      <option value="completed">Mark as Completed</option>
                      <option value="generate-keywords">Generate Keywords & Descriptions</option>
                      <option value="delete">Delete</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pages List */}
            <div className="overflow-hidden">
              {filteredPages.length > 0 ? (
                <>
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPages.length === filteredPages.length && filteredPages.length > 0}
                      onChange={toggleSelectAll}
                      className="mr-3"
                    />
                    <div className="text-sm font-medium text-gray-700">
                      Select All ({filteredPages.length})
                    </div>
                  </div>

                  {/* Pages */}
                  <div className="divide-y divide-gray-200">
                    {filteredPages.map((page: any) => (
                      <div key={page.id} className="px-4 py-4 flex items-center hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedPages.includes(page.id)}
                          onChange={() => togglePageSelection(page.id)}
                          className="mr-3"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium truncate mr-2"
                            >
                              {page.url}
                            </a>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Domain: {page.domain} • Added: {new Date(page.addedAt).toLocaleDateString()}
                            {page.completedAt && (
                              <> • Completed: {new Date(page.completedAt).toLocaleDateString()}</>
                            )}
                          </div>
                          
                          {/* Keywords Section */}
                          <div className="mt-2 space-y-2">
                            <KeywordDisplay 
                              keywords={page.keywords} 
                              className="text-xs"
                              maxDisplay={3}
                              targetPageId={page.id}
                              onKeywordsUpdate={handleKeywordsUpdate}
                            />
                            <KeywordGenerationButton
                              targetPageId={page.id}
                              targetUrl={page.url}
                              onSuccess={handleKeywordSuccess}
                              onError={handleKeywordError}
                              size="sm"
                            />
                          </div>

                          {/* Description Section */}
                          <div className="mt-2 space-y-2">
                            <DescriptionDisplay 
                              description={page.description} 
                              className="text-xs"
                              targetPageId={page.id}
                              onDescriptionUpdate={handleDescriptionUpdate}
                            />
                            <DescriptionGenerationButton
                              targetPageId={page.id}
                              targetUrl={page.url}
                              onSuccess={handleDescriptionSuccess}
                              onError={handleDescriptionError}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                            {getStatusIcon(page.status)}
                            <span className="ml-1 capitalize">{page.status}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {filter === 'all' 
                      ? 'No target pages yet. Add some URLs to get started.'
                      : `No ${filter} pages found.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}