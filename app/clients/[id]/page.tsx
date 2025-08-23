'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { ClientDetailTabs } from '@/components/ClientDetailTabs';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { Client, TargetPage } from '@/types/user';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Clock, 
  Edit, Globe, ExternalLink, Check, Settings, ChevronDown, ChevronUp,
  FileText, Target, AlertCircle, BarChart2, Users, Package,
  Activity, ShoppingCart, Brain, Mail, Phone, MapPin
} from 'lucide-react';
import { KeywordPreferencesSelector } from '@/components/ui/KeywordPreferencesSelector';
import { getClientKeywordPreferences, setClientKeywordPreferences, KeywordPreferences } from '@/types/keywordPreferences';
import { KeywordGenerationButton } from '@/components/ui/KeywordGenerationButton';
import { KeywordDisplay } from '@/components/ui/KeywordDisplay';
import { DescriptionGenerationButton } from '@/components/ui/DescriptionGenerationButton';
import { DescriptionDisplay } from '@/components/ui/DescriptionDisplay';
import { SmartNotifications } from '@/components/ui/SmartNotifications';
import { parseUrlsFromText, matchUrlsToPages, getMatchingStats, UrlMatchResult } from '@/lib/utils/urlMatcher';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ name: string; email: string } | null>(null);
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
  const [userType, setUserType] = useState<string>('');
  const [aiPermissions, setAiPermissions] = useState({
    canUseAiKeywords: false,
    canUseAiDescriptions: false,
    canUseAiContentGeneration: false
  });
  
  // Tab state with URL parameter support
  const currentTab = (searchParams.get('tab') as 'overview' | 'pages' | 'orders' | 'brand' | 'settings') || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'orders' | 'brand' | 'settings'>(currentTab);
  
  // Update tab and URL when tab changes
  const handleTabChange = (tab: 'overview' | 'pages' | 'orders' | 'brand' | 'settings') => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      newSearchParams.delete('tab'); // Keep overview clean without ?tab=overview
    } else {
      newSearchParams.set('tab', tab);
    }
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  };
  
  // Sync state with URL on mount and URL changes
  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);
  
  // Bulk URL Update states
  const [showBulkUrlUpdate, setShowBulkUrlUpdate] = useState(false);
  const [bulkUrlText, setBulkUrlText] = useState('');
  const [bulkUrlStatus, setBulkUrlStatus] = useState<'active' | 'inactive' | 'completed'>('inactive');
  const [urlMatchResults, setUrlMatchResults] = useState<UrlMatchResult[]>([]);
  const [isBulkUrlProcessing, setIsBulkUrlProcessing] = useState(false);
  
  // Settings edit states
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editedClient, setEditedClient] = useState({
    name: '',
    website: '',
    description: ''
  });

  useEffect(() => {
    // Get user type from session
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType || 'internal');
      
      // For internal users, grant all permissions
      if (session.userType === 'internal') {
        setAiPermissions({
          canUseAiKeywords: true,
          canUseAiDescriptions: true,
          canUseAiContentGeneration: true
        });
      }
    }
    loadClient();
  }, [params.id]);

  useEffect(() => {
    // Check if we should prompt for keyword generation (from client creation flow)
    if (searchParams.get('promptKeywords') === 'true' && client) {
      const targetPages = (client as any)?.targetPages || [];
      if (targetPages.length > 0) {
        setNewlyAddedPages(targetPages.map((page: any) => ({ url: page.url })));
        setShowKeywordPrompt(true);
        
        // Clear the query parameter to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('promptKeywords');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, [client, searchParams]);

  const loadClient = async () => {
    try {
      // Use API instead of clientStorage to get the new fields
      const response = await fetch(`/api/clients/${params.id}`);
      if (!response.ok) {
        router.push('/clients');
        return;
      }
      
      const data = await response.json();
      const clientData = data.client;
      
      if (!clientData) {
        router.push('/clients');
        return;
      }
      
      setClient(clientData);
      
      // Load account info if client has accountId
      if ((clientData as any).accountId) {
        const accountResponse = await fetch(`/api/accounts/${(clientData as any).accountId}`);
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          setAccountInfo(accountData.account);
          
          // Load AI permissions for account users
          const session = sessionStorage.getSession();
          if (session && session.userType === 'account') {
            setAiPermissions({
              canUseAiKeywords: accountData.account.canUseAiKeywords || false,
              canUseAiDescriptions: accountData.account.canUseAiDescriptions || false,
              canUseAiContentGeneration: accountData.account.canUseAiContentGeneration || false
            });
          }
        }
      }
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
      const result = await clientStorage.addTargetPages(client.id, urls);
      setNewPages('');
      setShowAddForm(false);
      await loadClient();
      
      // Show feedback to user
      if (result.added > 0 && result.duplicates > 0) {
        alert(`✅ Successfully added ${result.added} new pages. ${result.duplicates} duplicates were skipped.`);
      } else if (result.added > 0) {
        alert(`✅ Successfully added ${result.added} new pages!`);
      } else if (result.duplicates > 0) {
        alert(`ℹ️ All ${result.duplicates} pages already exist. No new pages added.`);
      }
      
      // Prompt user to generate keywords AND descriptions for newly added pages
      if (result.added > 0) {
        setNewlyAddedPages(urls.slice(0, result.added).map(url => ({ url })));
        setShowKeywordPrompt(true);
      }
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
    // Add a small delay before refreshing to ensure database transaction is complete
    setTimeout(() => {
      loadClient();
    }, 500);
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
    // Add a small delay before refreshing to ensure database transaction is complete
    setTimeout(() => {
      loadClient();
    }, 500);
    // Clear message after 5 seconds
    setTimeout(() => setKeywordMessage(''), 5000);
  };

  const handleDescriptionSuccess = (description: string) => {
    setDescriptionMessage(`✅ Generated description successfully! (${description.length} characters)`);
    // Add a small delay before refreshing to ensure database transaction is complete
    setTimeout(() => {
      loadClient();
    }, 500);
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
    // Add a small delay before refreshing to ensure database transaction is complete
    setTimeout(() => {
      loadClient();
    }, 500);
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

  // Bulk URL Update Functions
  // Settings edit functions
  const startEditingSettings = () => {
    if (!client) return;
    setEditedClient({
      name: client.name,
      website: client.website,
      description: (client as any).description || ''
    });
    setIsEditingSettings(true);
  };

  const cancelEditingSettings = () => {
    setIsEditingSettings(false);
    setEditedClient({ name: '', website: '', description: '' });
  };

  const saveSettingsChanges = async () => {
    if (!client) return;

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editedClient.name,
          website: editedClient.website,
          description: editedClient.description
        })
      });
      
      if (response.ok) {
        setClient({
          ...client,
          name: editedClient.name,
          website: editedClient.website,
          ...(editedClient.description && { description: editedClient.description })
        });
        setIsEditingSettings(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update client');
      }
    } catch (error: any) {
      alert('Error updating client: ' + error.message);
    }
  };

  const handleBulkUrlTextChange = (text: string) => {
    setBulkUrlText(text);
    
    if (text.trim()) {
      const inputUrls = parseUrlsFromText(text);
      const targetPages = (client as any)?.targetPages || [];
      const results = matchUrlsToPages(inputUrls, targetPages);
      setUrlMatchResults(results);
    } else {
      setUrlMatchResults([]);
    }
  };

  const applyBulkUrlStatusUpdate = async () => {
    if (!client || urlMatchResults.length === 0) return;

    const matchedPageIds = urlMatchResults
      .filter(result => result.matchedPageId)
      .map(result => result.matchedPageId!);

    if (matchedPageIds.length === 0) {
      alert('No matching pages found to update.');
      return;
    }

    const confirmMessage = `Update ${matchedPageIds.length} pages to "${bulkUrlStatus}" status?`;
    if (!confirm(confirmMessage)) return;

    setIsBulkUrlProcessing(true);

    try {
      const response = await fetch(`/api/clients/${client.id}/target-pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageIds: matchedPageIds,
          status: bulkUrlStatus
        })
      });

      if (response.ok) {
        await loadClient();
        setSelectedPages([]);
        setUrlMatchResults([]);
        setBulkUrlText('');
        setShowBulkUrlUpdate(false);
        alert(`✅ Successfully updated ${matchedPageIds.length} pages to "${bulkUrlStatus}" status!`);
      } else {
        alert('Failed to update page statuses. Please try again.');
      }
    } catch (error) {
      console.error('Error updating page statuses:', error);
      alert('Error updating page statuses. Please try again.');
    } finally {
      setIsBulkUrlProcessing(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push(userType === 'account' ? '/account/dashboard' : '/clients')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {userType === 'account' ? 'Back to Dashboard' : 'Back to Clients'}
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{client.name}</h1>
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center mt-1 break-all"
                >
                  <Globe className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate sm:break-all">{client.website}</span>
                  <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                </a>
                <div className="mt-2">
                  {userType === 'internal' && (
                    <>
                      {(client as any).accountId ? (
                        accountInfo ? (
                          <span className="inline-flex items-center px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 rounded-full">
                            <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Owned by: {accountInfo.name || accountInfo.email}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
                            <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                            Loading account...
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium text-orange-700 bg-orange-50 rounded-full">
                          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="hidden sm:inline">No Account - This client needs to be assigned</span>
                          <span className="sm:hidden">No Account</span>
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {userType === 'internal' && (
                  <>
                    <Link
                      href={`/workflow/new?clientId=${client.id}`}
                      className="group inline-flex items-center px-5 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200"
                    >
                      <FileText className="w-4 h-4 mr-2.5 text-gray-500 group-hover:text-gray-700" />
                      Create Workflow
                    </Link>
                    <Link
                      href={`/clients/${client.id}/bulk-analysis`}
                      className="group inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200"
                    >
                      <BarChart2 className="w-4 h-4 mr-2.5" />
                      Bulk Analysis
                    </Link>
                  </>
                )}
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

          {/* Tab Navigation */}
          <ClientDetailTabs 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            stats={stats}
            userType={userType}
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Pages</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-gray-600">Active Pages</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Active Orders</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Workflows</div>
                </div>
              </div>
              
              {/* Smart Notifications */}
              <SmartNotifications
                client={client}
                onGenerateKeywords={() => {
                  handleTabChange('pages');
                  // TODO: Trigger bulk keyword generation for missing pages
                }}
                onGenerateDescriptions={() => {
                  handleTabChange('pages');
                  // TODO: Trigger bulk description generation for missing pages
                }}
                onGenerateBrandIntelligence={() => {
                  handleTabChange('brand');
                  // TODO: Trigger brand intelligence generation
                }}
                onGoToPages={() => handleTabChange('pages')}
                canUseAI={{
                  keywords: aiPermissions.canUseAiKeywords,
                  descriptions: aiPermissions.canUseAiDescriptions,
                  brandIntelligence: aiPermissions.canUseAiContentGeneration
                }}
              />
              
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userType === 'internal' && (
                      <>
                        <Link
                          href={`/workflow/new?clientId=${client.id}`}
                          className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors group"
                        >
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-green-600 mr-3" />
                            <div className="text-left">
                              <div className="font-medium text-gray-900">Create Workflow</div>
                              <div className="text-xs text-gray-500">Start new content</div>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </Link>
                        <Link
                          href={`/clients/${client.id}/bulk-analysis`}
                          className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors group"
                        >
                          <div className="flex items-center">
                            <BarChart2 className="w-5 h-5 text-indigo-600 mr-3" />
                            <div className="text-left">
                              <div className="font-medium text-gray-900">Bulk Analysis</div>
                              <div className="text-xs text-gray-500">Analyze domains</div>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => { handleTabChange('pages'); setShowAddForm(true); }}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors group"
                    >
                      <div className="flex items-center">
                        <Plus className="w-5 h-5 text-blue-600 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900">Add Pages</div>
                          <div className="text-xs text-gray-500">Target URLs</div>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <ActivityTimeline clientId={client.id} limit={7} />
            </div>
          )}

          {/* Target Pages Tab */}
          {activeTab === 'pages' && (
            <div className="space-y-6">
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
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="submit"
                    className="px-3 py-2 sm:px-4 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Add Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 sm:px-4 bg-gray-200 text-gray-800 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
                </div>
              )}

              {/* Keyword Generation Prompt */}
              {showKeywordPrompt && (aiPermissions.canUseAiKeywords || aiPermissions.canUseAiDescriptions) && (
                <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-purple-500">
              <h3 className="text-lg font-medium mb-4 text-purple-800">Generate Keywords & Descriptions for Target Pages?</h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchParams.get('promptKeywords') === 'true' 
                  ? `Great! You've created ${client.name} with ${newlyAddedPages.length} target page(s). Would you like to automatically generate keywords AND descriptions for all of them using AI?`
                  : `You just added ${newlyAddedPages.length} new target page(s). Would you like to automatically generate keywords AND descriptions for all of them using AI?`
                }
              </p>
              <div className="bg-purple-50 p-3 rounded-md mb-4">
                <p className="text-xs text-purple-700">
                  This will use OpenAI to analyze each page and generate both relevant keywords and page descriptions for guest post targeting. 
                  The process takes about 2-3 seconds per page (both APIs run in parallel).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleBulkKeywordAndDescriptionGeneration}
                  className="px-3 py-2 sm:px-4 bg-purple-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-purple-700"
                >
                  Yes, Generate Keywords & Descriptions
                </button>
                <button
                  onClick={cancelBulkKeywordGeneration}
                  className="px-3 py-2 sm:px-4 bg-gray-200 text-gray-800 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-300"
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left side: Filters and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Filter:</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1"
                    >
                      <option value="all">All Pages ({stats.total})</option>
                      <option value="active">Active ({stats.active})</option>
                      <option value="inactive">Inactive ({stats.inactive})</option>
                      <option value="completed">Completed ({stats.completed})</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Pages
                  </button>
                </div>

                {/* Bulk Actions */}
                {selectedPages.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-2">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {selectedPages.length} selected
                    </span>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as any)}
                      className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-1"
                    >
                      <option value="">Bulk Action...</option>
                      <option value="active">Mark as Active</option>
                      <option value="inactive">Mark as Inactive</option>
                      <option value="completed">Mark as Completed</option>
                      {(aiPermissions.canUseAiKeywords || aiPermissions.canUseAiDescriptions) && (
                        <option value="generate-keywords">Generate Keywords & Descriptions</option>
                      )}
                      <option value="delete">Delete</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className="px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
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
                  <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex items-center">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPages.length === filteredPages.length && filteredPages.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <div className="text-sm font-medium text-gray-700">
                        Select All ({filteredPages.length})
                      </div>
                    </div>
                  </div>

                  {/* Pages */}
                  <div className="divide-y divide-gray-100">
                    {filteredPages.map((page: any) => (
                      <div key={page.id} className="px-5 py-5 hover:bg-gray-50/50 transition-colors duration-150">
                        <div className="flex items-start space-x-4">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedPages.includes(page.id)}
                              onChange={() => togglePageSelection(page.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            {/* URL Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center min-w-0">
                                <a
                                  href={page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate mr-2"
                                >
                                  {page.url}
                                </a>
                                <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex-shrink-0 ml-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                                  {getStatusIcon(page.status)}
                                  <span className="ml-1 capitalize">{page.status}</span>
                                </span>
                              </div>
                            </div>
                            
                            {/* Metadata */}
                            <div className="text-xs text-gray-500 mb-3 flex items-center space-x-3">
                              <span className="flex items-center">
                                <span className="font-medium">Domain:</span>
                                <span className="ml-1">{page.domain}</span>
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center">
                                <span className="font-medium">Added:</span>
                                <span className="ml-1">{new Date(page.addedAt).toLocaleDateString()}</span>
                              </span>
                              {page.completedAt && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="flex items-center">
                                    <span className="font-medium">Completed:</span>
                                    <span className="ml-1">{new Date(page.completedAt).toLocaleDateString()}</span>
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Content Sections Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Keywords Section */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Keywords</h4>
                                </div>
                                <KeywordDisplay 
                                  keywords={page.keywords} 
                                  className="text-xs"
                                  maxDisplay={24}
                                  targetPageId={page.id}
                                  onKeywordsUpdate={handleKeywordsUpdate}
                                  canGenerate={aiPermissions.canUseAiKeywords}
                                  onGenerate={() => {
                                    // TODO: Implement direct keyword generation
                                    console.log('Generate keywords for:', page.id);
                                  }}
                                />
                              </div>

                              {/* Description Section */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Description</h4>
                                </div>
                                <DescriptionDisplay 
                                  description={page.description} 
                                  className="text-xs"
                                  targetPageId={page.id}
                                  onDescriptionUpdate={handleDescriptionUpdate}
                                  canGenerate={aiPermissions.canUseAiDescriptions}
                                  onGenerate={async () => {
                                    try {
                                      const response = await fetch(`/api/target-pages/${page.id}/description`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ targetUrl: page.url })
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        handleDescriptionSuccess(data.description);
                                      } else {
                                        const error = await response.json();
                                        handleDescriptionError(error.error || 'Failed to generate description');
                                      }
                                    } catch (error) {
                                      handleDescriptionError(error instanceof Error ? error.message : 'Unknown error');
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
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
          )}

          {/* Orders & Projects Tab */}
          {activeTab === 'orders' && userType === 'internal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders & Projects</h3>
                  <div className="space-y-4">
                    <Link
                      href={`/orders?client=${client.id}`}
                      className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ShoppingCart className="w-5 h-5 text-gray-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">View Orders</div>
                            <div className="text-xs text-gray-500">See all orders for this client</div>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                    <Link
                      href={`/clients/${client.id}/bulk-analysis`}
                      className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <BarChart2 className="w-5 h-5 text-indigo-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">Bulk Analysis Projects</div>
                            <div className="text-xs text-gray-500">View and manage bulk analysis</div>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brand & Content Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              {/* Brand Intelligence - Available to both internal and external users */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Intelligence</h3>
                      <p className="text-gray-600 text-sm">
                        {userType === 'internal' 
                          ? 'AI-powered deep research and brand brief generation'
                          : 'Collaborate on brand research and brief creation'
                        }
                      </p>
                    </div>
                    <Link
                      href={`/clients/${client.id}/brand-intelligence`}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {userType === 'internal' ? 'Open Brand Intelligence' : 'View Brand Intelligence'}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Topic Preferences */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Topic Preferences</h3>
                    <button
                      onClick={() => setShowKeywordPrefs(!showKeywordPrefs)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {showKeywordPrefs ? 'Hide' : 'Edit'}
                    </button>
                  </div>
                  {showKeywordPrefs ? (
                    <>
                      <p className="text-sm text-gray-600 mb-6">
                        Set default guest post topic preferences for this client. These will be automatically applied to all new workflows.
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
                          Save Preferences
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">
                      {getClientKeywordPreferences(client) ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="font-medium mb-2">Current Preferences:</p>
                          <p className="text-xs">{JSON.stringify(getClientKeywordPreferences(client), null, 2)}</p>
                        </div>
                      ) : (
                        <p>No topic preferences set. Click Edit to configure.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Account Information */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {userType === 'account' ? 'Brand Information' : 'Account Information'}
                    </h3>
                    {!isEditingSettings ? (
                      <button
                        onClick={startEditingSettings}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={saveSettingsChanges}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditingSettings}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isEditingSettings ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {userType === 'account' ? 'Brand Name' : 'Client Name'}
                        </label>
                        <input
                          type="text"
                          value={editedClient.name}
                          onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="url"
                          value={editedClient.website}
                          onChange={(e) => setEditedClient({ ...editedClient, website: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editedClient.description}
                          onChange={(e) => setEditedClient({ ...editedClient, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Brief description of the client/brand..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {userType === 'account' ? 'Brand Name' : 'Client Name'}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">{client.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Website</label>
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                        >
                          {client.website}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                      {(client as any).description && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="mt-1 text-sm text-gray-900">{(client as any).description}</p>
                        </div>
                      )}
                      {accountInfo && userType === 'internal' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Account Owner</label>
                          <p className="mt-1 text-sm text-gray-900">{accountInfo.name || accountInfo.email}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Tools */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg">
                <button
                  onClick={() => setShowBulkUrlUpdate(!showBulkUrlUpdate)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Advanced Settings</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-300">Power User Tools</span>
                </div>
                {showBulkUrlUpdate ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {showBulkUrlUpdate && (
                <div className="border-t border-gray-200 bg-white rounded-b-lg">
                  <div className="p-6 space-y-6">
                    {/* Bulk URL Status Update Tool */}
                    <div>
                      <h4 className="text-base font-medium text-gray-900 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2 text-gray-600" />
                        Bulk URL Status Update
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">How this works:</p>
                            <p>1. Paste a list of URLs (one per line) in the textarea below</p>
                            <p>2. Select the target status you want to apply</p>
                            <p>3. Preview which pages will be updated</p>
                            <p>4. Apply the changes to all matched pages at once</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Input Section */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Paste URLs to Update
                          </label>
                          <textarea
                            value={bulkUrlText}
                            onChange={(e) => handleBulkUrlTextChange(e.target.value)}
                            placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3&#10;&#10;# Comments starting with # are ignored"
                            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {bulkUrlText ? `${parseUrlsFromText(bulkUrlText).length} URLs detected` : 'One URL per line'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Target Status
                          </label>
                          <select
                            value={bulkUrlStatus}
                            onChange={(e) => setBulkUrlStatus(e.target.value as 'active' | 'inactive' | 'completed')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="inactive">Inactive</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      {/* Preview Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preview & Results
                        </label>
                        <div className="border border-gray-300 rounded-lg h-64 overflow-y-auto bg-white">
                          {urlMatchResults.length > 0 ? (
                            <div className="p-3 space-y-2">
                              {/* Statistics */}
                              <div className="bg-gray-50 rounded p-2 text-xs">
                                {(() => {
                                  const stats = getMatchingStats(urlMatchResults);
                                  return (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>Total: {stats.total}</div>
                                      <div className="text-green-600">Matched: {stats.matched}</div>
                                      <div className="text-red-600">Not Found: {stats.notFound}</div>
                                      <div className="text-blue-600">Will Update: {stats.matched}</div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Results List */}
                              {urlMatchResults.map((result, index) => (
                                <div key={index} className={`text-xs p-2 rounded border-l-4 ${
                                  result.matchedPageId 
                                    ? 'border-green-400 bg-green-50' 
                                    : 'border-red-400 bg-red-50'
                                }`}>
                                  <div className="font-mono text-gray-600 truncate">
                                    {result.inputUrl}
                                  </div>
                                  {result.matchedPageId ? (
                                    <div className="text-green-700 mt-1">
                                      ✓ Matched: {result.matchedPageUrl}
                                      {result.status === 'normalized' && (
                                        <span className="text-blue-600 ml-1">(normalized)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-red-700 mt-1">✗ No match found</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                              {bulkUrlText ? 'Processing URLs...' : 'Enter URLs above to see preview'}
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        {urlMatchResults.length > 0 && (
                          <button
                            onClick={applyBulkUrlStatusUpdate}
                            disabled={isBulkUrlProcessing || urlMatchResults.filter(r => r.matchedPageId).length === 0}
                            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isBulkUrlProcessing ? (
                              <span className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Updating...</span>
                              </span>
                            ) : (
                              `Update ${urlMatchResults.filter(r => r.matchedPageId).length} Pages to ${bulkUrlStatus.charAt(0).toUpperCase() + bulkUrlStatus.slice(1)}`
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}