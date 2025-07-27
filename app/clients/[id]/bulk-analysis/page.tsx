'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { clientStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client, TargetPage } from '@/types/user';
import { groupKeywordsByTopic, generateGroupedAhrefsUrls } from '@/lib/utils/keywordGroupingV2';
import DataForSeoResultsModal from '@/components/DataForSeoResultsModal';
import BulkAnalysisResultsModal from '@/components/BulkAnalysisResultsModal';
import AIQualificationModal from '@/components/AIQualificationModal';
import BulkAnalysisTutorial from '@/components/BulkAnalysisTutorial';
import BulkAnalysisTable from '@/components/BulkAnalysisTable';
import GuidedTriageFlow from '@/components/GuidedTriageFlow';
import { ProjectCard } from '@/components/bulk-analysis/ProjectCard';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  Search,
  Download,
  Folder,
  FolderPlus,
  RefreshCw
} from 'lucide-react';

import { BulkAnalysisDomain } from '@/types/bulk-analysis';
import { BulkAnalysisProject } from '@/types/bulk-analysis-projects';

export default function BulkAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [selectedTargetPages, setSelectedTargetPages] = useState<string[]>([]);
  const [domainText, setDomainText] = useState('');
  const [domains, setDomains] = useState<BulkAnalysisDomain[]>([]);
  const [projects, setProjects] = useState<BulkAnalysisProject[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#6366f1');
  const [newProjectIcon, setNewProjectIcon] = useState('📁');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [existingDomains, setExistingDomains] = useState<{ domain: string; status: string }[]>([]);
  const [selectedPositionRange, setSelectedPositionRange] = useState('1-50');
  
  // Manual keyword input mode
  const [keywordInputMode, setKeywordInputMode] = useState<'target-pages' | 'manual'>('target-pages');
  const [manualKeywords, setManualKeywords] = useState('');
  
  // Filtering options
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'high_quality' | 'average_quality' | 'disqualified'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'has_workflow' | 'no_workflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(50);
  const ITEMS_PER_PAGE = 50;
  
  // DataForSEO modal state
  const [dataForSeoModal, setDataForSeoModal] = useState<{
    isOpen: boolean;
    domainId: string;
    domain: string;
    clientId: string;
    initialResults?: any[];
    totalFound: number;
    taskId?: string;
    cacheInfo?: any;
  }>({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 });
  
  // Experimental features toggle - shown by default
  const [hideExperimentalFeatures, setHideExperimentalFeatures] = useState(false);
  
  // Multi-select state for bulk operations
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [bulkAnalysisRunning, setBulkAnalysisRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResultsModal, setBulkResultsModal] = useState<{
    isOpen: boolean;
    jobId: string;
    analyzedDomains: Array<{ id: string; domain: string }>;
  }>({ isOpen: false, jobId: '', analyzedDomains: [] });
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [recentlyAnalyzedDomains, setRecentlyAnalyzedDomains] = useState<Set<string>>(new Set());
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsJobId, setResultsJobId] = useState<string | null>(null);
  
  // Keyword clustering state
  const [showKeywordClusters, setShowKeywordClusters] = useState(false);
  const [keywordClusters, setKeywordClusters] = useState<Array<{
    name: string;
    keywords: string[];
    relevance: 'core' | 'related' | 'wider';
    priority: number;
    selected: boolean;
  }>>([]);
  
  // AI Qualification state
  const [showAIQualification, setShowAIQualification] = useState(false);
  const [aiQualificationDomains, setAIQualificationDomains] = useState<Array<{ id: string; domain: string }>>([]);
  
  // Triage mode state
  const [triageMode, setTriageMode] = useState(false);
  const [showGuidedTriage, setShowGuidedTriage] = useState(false);
  
  // Bulk workflow creation state
  const [bulkWorkflowCreating, setBulkWorkflowCreating] = useState(false);
  const [bulkWorkflowProgress, setBulkWorkflowProgress] = useState({ current: 0, total: 0 });
  
  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [statusFilter, workflowFilter, searchQuery]);

  // Load experimental features preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hideExperimentalFeatures');
    if (stored !== null) {
      setHideExperimentalFeatures(stored === 'true');
    }
  }, []);

  useEffect(() => {
    loadClient();
  }, [params.id]);

  useEffect(() => {
    if (client) {
      loadProjects();
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

  const loadProjects = async () => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      setMessage('❌ Please enter a project name');
      return;
    }

    try {
      const response = await fetch(`/api/clients/${params.id}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          color: newProjectColor,
          icon: newProjectIcon
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadProjects();
        setShowProjectForm(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setMessage('✅ Project created successfully');
        // Navigate to the new project
        router.push(`/clients/${params.id}/bulk-analysis/projects/${data.project.id}`);
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setMessage('❌ Failed to create project');
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project deleted successfully');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setMessage('❌ Failed to delete project');
    }
  };

  const archiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project archived');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      setMessage('❌ Failed to archive project');
    }
  };
  
  const unarchiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/clients/${params.id}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });

      if (response.ok) {
        await loadProjects();
        setMessage('✅ Project restored');
      } else {
        const error = await response.json();
        setMessage(`❌ ${error.error}`);
      }
    } catch (error) {
      console.error('Error unarchiving project:', error);
      setMessage('❌ Failed to restore project');
    }
  };

  // Selection helpers
  const toggleDomainSelection = (domainId: string) => {
    const newSelection = new Set(selectedDomains);
    if (newSelection.has(domainId)) {
      newSelection.delete(domainId);
    } else {
      newSelection.add(domainId);
    }
    setSelectedDomains(newSelection);
  };

  const selectAll = (domainIds: string[]) => {
    setSelectedDomains(new Set(domainIds));
  };

  const clearSelection = () => {
    setSelectedDomains(new Set());
  };

  const startAIQualification = () => {
    const selectedDomainList = domains
      .filter(d => selectedDomains.has(d.id))
      .map(d => ({ id: d.id, domain: d.domain }));
    
    setAIQualificationDomains(selectedDomainList);
    setShowAIQualification(true);
  };

  const handleAIQualificationComplete = async (results: any[]) => {
    // Reload projects to get updated stats
    await loadProjects();
    setMessage(`✅ AI qualification applied to ${results.length} domains`);
    setSelectedDomains(new Set());
  };

  const updateQualificationStatus = async (domainId: string, status: 'high_quality' | 'average_quality' | 'disqualified', isManual?: boolean) => {
    try {
      const session = AuthService.getSession();
      if (!session) {
        console.error('No user session found');
        return;
      }

      const domainNotes = notes[domainId] || '';
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: session.userId, notes: domainNotes, isManual })
      });

      if (response.ok) {
        // Update local state instead of reloading from server to prevent "jumping"
        setDomains(prevDomains => 
          prevDomains.map(domain => 
            domain.id === domainId 
              ? { 
                  ...domain, 
                  qualificationStatus: status, 
                  checkedBy: session.userId, 
                  checkedAt: new Date().toISOString(), 
                  notes: domainNotes,
                  wasManuallyQualified: isManual || false,
                  manuallyQualifiedBy: isManual ? session.userId : domain.manuallyQualifiedBy,
                  manuallyQualifiedAt: isManual ? new Date().toISOString() : domain.manuallyQualifiedAt
                }
              : domain
          )
        );
        // Also update the notes state to reflect saved value
        setNotes(prev => ({ ...prev, [domainId]: domainNotes }));
      } else {
        const errorData = await response.json();
        console.error('Error updating qualification status:', errorData);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const createWorkflow = async (domain: BulkAnalysisDomain) => {
    // Navigate to workflow creation with pre-filled domain and notes
    const domainNotes = domain.notes || notes[domain.id] || '';
    router.push(`/workflow/new?clientId=${client?.id}&guestPostSite=${encodeURIComponent(domain.domain)}&notes=${encodeURIComponent(domainNotes)}`);
  };

  const aiQualifySingleDomain = async (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    
    // Set the domain for AI qualification
    setAIQualificationDomains([{ id: domain.id, domain: domain.domain }]);
    setShowAIQualification(true);
  };

  const bulkCreateWorkflows = async (domainIds: string[]) => {
    if (!client) return;
    
    setBulkWorkflowCreating(true);
    setBulkWorkflowProgress({ current: 0, total: domainIds.length });
    
    let successCount = 0;
    let failureCount = 0;
    
    try {
      for (let i = 0; i < domainIds.length; i++) {
        const domainId = domainIds[i];
        const domain = domains.find(d => d.id === domainId);
        if (!domain) continue;
        
        setBulkWorkflowProgress({ current: i + 1, total: domainIds.length });
        
        try {
          // Create workflow via API
          const domainNotes = domain.notes || notes[domain.id] || '';
          
          const response = await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: client.id,
              title: `Guest Post - ${domain.domain}`,
              description: `Auto-generated workflow for ${domain.domain}${domainNotes ? `\n\nNotes: ${domainNotes}` : ''}`,
              status: 'draft',
              guestPostSite: domain.domain,
              steps: []
            })
          });
          
          if (response.ok) {
            const workflow = await response.json();
            
            // Update domain to mark as having workflow
            await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                status: domain.qualificationStatus,
                userId: AuthService.getSession()?.userId,
                workflowId: workflow.id,
                hasWorkflow: true
              })
            });
            
            successCount++;
          } else {
            throw new Error('Failed to create workflow');
          }
        } catch (error) {
          console.error(`Failed to create workflow for ${domain.domain}:`, error);
          failureCount++;
        }
      }
      
      // Update local state
      setDomains(prevDomains => 
        prevDomains.map(d => {
          if (domainIds.includes(d.id)) {
            return { ...d, hasWorkflow: true };
          }
          return d;
        })
      );
      
      // Clear selection
      setSelectedDomains(new Set());
      
      if (failureCount === 0) {
        setMessage(`✅ Successfully created ${successCount} workflows`);
      } else {
        setMessage(`⚠️ Created ${successCount} workflows, ${failureCount} failed`);
      }
      
    } catch (error) {
      console.error('Bulk workflow creation error:', error);
      setMessage('❌ Failed to create workflows');
    } finally {
      setBulkWorkflowCreating(false);
      setBulkWorkflowProgress({ current: 0, total: 0 });
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }
      
      // Remove from local state
      setDomains(prev => prev.filter(d => d.id !== domainId));
      setMessage('✅ Domain deleted successfully');
    } catch (error) {
      console.error('Error deleting domain:', error);
      setMessage('❌ Failed to delete domain');
    }
  };

  // Update only the analyzed domains without reloading the entire list
  const updateAnalyzedDomainsOnly = async (analyzedDomainIds: Set<string>) => {
    try {
      // Mark domains as recently analyzed for visual feedback
      setRecentlyAnalyzedDomains(analyzedDomainIds);
      
      // Clear the visual indicator after 5 seconds
      setTimeout(() => {
        setRecentlyAnalyzedDomains(new Set());
      }, 5000);
      
      // Fetch only the analyzed domains' updated data
      const updatePromises = Array.from(analyzedDomainIds).map(async (domainId) => {
        const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const updatedDomains = await Promise.all(updatePromises);
      
      // Update local state with the new data while preserving order
      setDomains(prevDomains => 
        prevDomains.map(domain => {
          if (analyzedDomainIds.has(domain.id)) {
            const updated = updatedDomains.find(d => d && d.id === domain.id);
            if (updated) {
              // Preserve clientId
              return { ...updated, clientId: params.id };
            }
          }
          return domain;
        })
      );
    } catch (error) {
      console.error('Error updating analyzed domains:', error);
    }
  };

  const startBulkDataForSeoAnalysis = async () => {
    console.log('startBulkDataForSeoAnalysis called');
    console.log('selectedDomains.size:', selectedDomains.size);
    console.log('keywordInputMode:', keywordInputMode);

    if (selectedDomains.size === 0) {
      setMessage('Please select domains to analyze');
      return;
    }

    // Get keywords based on current mode
    let keywords: string[] = [];
    if (keywordInputMode === 'manual' && manualKeywords.trim()) {
      keywords = manualKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      console.log('Manual keywords found:', keywords);
    } else if (keywordInputMode === 'target-pages') {
      // Get keywords from domains' target pages
      const selectedDomainsList = domains.filter(d => selectedDomains.has(d.id));
      const keywordSet = new Set<string>();
      
      // Collect keywords from each domain's target pages
      selectedDomainsList.forEach(domain => {
        if (domain.targetPageIds && domain.targetPageIds.length > 0) {
          // Get keywords from this domain's target pages
          const domainTargetPages = targetPages.filter(p => domain.targetPageIds.includes(p.id));
          domainTargetPages.forEach(page => {
            const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
            pageKeywords.forEach((k: string) => keywordSet.add(k));
          });
        }
      });
      
      // If no keywords found from domains' target pages, use all target pages' keywords
      if (keywordSet.size === 0 && targetPages.length > 0) {
        console.log('No keywords from domain target pages, using all target pages');
        targetPages.forEach(page => {
          const pageKeywords = (page as any).keywords?.split(',').map((k: string) => k.trim()) || [];
          pageKeywords.forEach((k: string) => keywordSet.add(k));
        });
      }
      
      keywords = Array.from(keywordSet);
      console.log('Target page keywords found:', keywords);
    }

    if (keywords.length === 0) {
      console.log('No keywords found!');
      setMessage('No keywords found. Please ensure target pages have keywords or enter manual keywords.');
      return;
    }

    // Group keywords by topic
    const groups = groupKeywordsByTopic(keywords);
    const clustersWithSelection = groups.map(group => ({
      ...group,
      selected: true // Default all clusters to selected
    }));
    
    console.log('Keyword clusters:', clustersWithSelection);
    setKeywordClusters(clustersWithSelection);
    setShowKeywordClusters(true);
    setMessage(`Found ${keywords.length} keywords grouped into ${groups.length} clusters`);
  };

  const executeDataForSeoAnalysis = async () => {
    // Get selected keywords from clusters
    const selectedKeywords = keywordClusters
      .filter(cluster => cluster.selected)
      .flatMap(cluster => cluster.keywords);

    if (selectedKeywords.length === 0) {
      setMessage('Please select at least one keyword cluster');
      return;
    }

    setShowKeywordClusters(false);
    setMessage(`🚀 Starting analysis for ${selectedDomains.size} domains with ${selectedKeywords.length} keywords...`);
    setBulkAnalysisRunning(true);
    setBulkProgress({ current: 0, total: selectedDomains.size });

    try {
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/dataforseo/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domainIds: Array.from(selectedDomains),
          keywords: selectedKeywords,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start bulk analysis');
      }

      const { jobId, totalDomains } = await response.json();
      
      // Ensure progress bar stays visible
      setMessage(`⏳ Analyzing ${totalDomains} domains...`);
      setBulkProgress({ current: 0, total: totalDomains });
      
      // Start polling for job status
      pollJobStatus(jobId);
      
    } catch (error: any) {
      console.error('Bulk analysis error:', error);
      setMessage(`❌ Bulk analysis failed: ${error.message}`);
      setBulkAnalysisRunning(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/clients/${params.id}/bulk-analysis/dataforseo/batch?jobId=${jobId}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        const { job, items } = data;

        // Update progress
        console.log('Job status update:', {
          status: job.status,
          processedDomains: job.processedDomains,
          totalDomains: job.totalDomains,
          bulkAnalysisRunning
        });
        setBulkProgress({
          current: job.processedDomains || 0,
          total: job.totalDomains || 0
        });

        // Update message
        if (job.status === 'processing') {
          setMessage(`⏳ Processing: ${job.processedDomains}/${job.totalDomains} domains analyzed`);
        } else if (job.status === 'completed') {
          clearInterval(pollInterval);
          
          // Store analyzed domains BEFORE clearing selection
          const analyzedDomainIds = new Set(Array.from(selectedDomains));
          const analyzedDomains = domains.filter(d => analyzedDomainIds.has(d.id)).map(d => ({ id: d.id, domain: d.domain }));
          
          setMessage(
            `✅ Analysis complete! Analyzed ${job.totalKeywordsAnalyzed} keywords, found ${job.totalRankingsFound} rankings.`
          );
          setBulkAnalysisRunning(false);
          setCompletedJobId(jobId);
          
          setBulkResultsModal({ isOpen: false, jobId, analyzedDomains });
          clearSelection();
          
          // Instead of reloading all domains, just update the analyzed ones
          // This preserves the current order and prevents "jumping"
          updateAnalyzedDomainsOnly(analyzedDomainIds);
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setMessage(`❌ Bulk analysis failed`);
          setBulkAnalysisRunning(false);
        }
      } catch (error: any) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
        setBulkAnalysisRunning(false);
      }
    }, 2000); // Poll every 2 seconds

    // Store interval ID for cleanup
    return () => clearInterval(pollInterval);
  };

  const analyzeWithDataForSeo = async (domain: BulkAnalysisDomain) => {
    console.log('DataForSEO button clicked for domain:', domain);
    
    setLoading(true);
    setMessage('🔄 Analyzing with DataForSEO...');
    
    try {
      // Include manual keywords if in manual mode
      const manualKeywordArray = keywordInputMode === 'manual' 
        ? manualKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : undefined;
      
      const payload = {
        domainId: domain.id,
        locationCode: 2840, // USA
        languageCode: 'en',
        ...(manualKeywordArray && { manualKeywords: manualKeywordArray })
      };
      
      console.log('Sending request to:', `/api/clients/${params.id}/bulk-analysis/analyze-dataforseo`);
      console.log('Request payload:', payload);
      
      const response = await fetch(`/api/clients/${params.id}/bulk-analysis/analyze-dataforseo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      if (response.ok) {
        console.log('DataForSEO analysis successful:', data);
        
        if (!data.result) {
          console.error('No result in response:', data);
          setMessage('❌ No results returned from DataForSEO');
          return;
        }
        
        setDataForSeoModal({
          isOpen: true,
          domainId: domain.id,
          domain: domain.domain,
          clientId: params.id as string,
          initialResults: data.result.keywords || [],
          totalFound: data.result.totalFound || 0,
          taskId: data.result.taskId,
          cacheInfo: data.result.cacheInfo
        });
        setMessage('');
      } else {
        console.error('DataForSEO API error:', data);
        setMessage(`❌ DataForSEO error: ${data.details || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('DataForSEO analysis error:', error);
      setMessage(`❌ Failed to analyze with DataForSEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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

          {/* Tutorial Video */}
          <BulkAnalysisTutorial />

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Projects View */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showArchivedProjects}
                    onChange={(e) => setShowArchivedProjects(e.target.checked)}
                    className="mr-2 rounded"
                  />
                  Show archived
                </label>
              </div>
              <button
                onClick={() => setShowProjectForm(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>

            {/* New Project Form */}
            {showProjectForm && (
              <div className="mb-6 p-6 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Create New Project</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., Tech Blogs Q1 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Add a description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                      <input
                        type="text"
                        value={newProjectIcon}
                        onChange={(e) => setNewProjectIcon(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="color"
                        value={newProjectColor}
                        onChange={(e) => setNewProjectColor(e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={createProject}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Project
                    </button>
                    <button
                      onClick={() => {
                        setShowProjectForm(false);
                        setNewProjectName('');
                        setNewProjectDescription('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Grid */}
            {(() => {
              const filteredProjects = showArchivedProjects 
                ? projects 
                : projects.filter(p => p.status !== 'archived');
              
              return filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      clientId={params.id as string}
                      onEdit={(project) => {
                        setMessage('🚧 Edit functionality coming soon');
                      }}
                      onDelete={deleteProject}
                      onArchive={archiveProject}
                      onUnarchive={unarchiveProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">
                    {showArchivedProjects && projects.length > 0 
                      ? 'No archived projects' 
                      : 'No projects yet. Create your first project to get started.'}
                  </p>
                </div>
              );
            })()}

          </div>

          {/* Legacy Results Grid - Hidden */}
          {false && domains.length > 0 && (
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
              
              {/* Filter Controls */}
              <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-gray-500" />
                    Search & Filter Domains
                  </h3>
                  {(searchQuery || statusFilter !== 'all' || workflowFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setWorkflowFilter('all');
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
                
                {/* Search Bar */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by domain name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Experimental Features Toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!hideExperimentalFeatures}
                      onChange={(e) => {
                        const hide = !e.target.checked;
                        setHideExperimentalFeatures(hide);
                        localStorage.setItem('hideExperimentalFeatures', hide.toString());
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Show Experimental Features</span>
                  </label>
                  {!hideExperimentalFeatures && (
                    <span className="text-xs text-gray-500">
                      Enables DataForSEO keyword analysis
                    </span>
                  )}
                </div>

                {/* Filter Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Filters */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-gray-500" />
                      Filter by Qualification Status
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All Domains', count: domains.length, color: 'gray' },
                        { value: 'pending', label: 'Pending Review', count: domains.filter(d => d.qualificationStatus === 'pending').length, color: 'gray' },
                        { value: 'high_quality', label: 'High Quality', count: domains.filter(d => d.qualificationStatus === 'high_quality').length, color: 'green' },
                        { value: 'average_quality', label: 'Average Quality', count: domains.filter(d => d.qualificationStatus === 'average_quality').length, color: 'yellow' },
                        { value: 'disqualified', label: 'Disqualified', count: domains.filter(d => d.qualificationStatus === 'disqualified').length, color: 'red' }
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setStatusFilter(filter.value as any)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                            statusFilter === filter.value
                              ? filter.color === 'green' ? 'bg-green-600 text-white border-green-600' :
                                filter.color === 'yellow' ? 'bg-yellow-600 text-white border-yellow-600' :
                                filter.color === 'red' ? 'bg-red-600 text-white border-red-600' :
                                'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-sm'
                          }`}
                        >
                          {filter.label} 
                          <span className={`ml-1 ${statusFilter === filter.value ? 'text-white/80' : 'text-gray-500'}`}>
                            ({filter.count})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Filters */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-500" />
                      Filter by Workflow Status
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All', count: domains.length, icon: null },
                        { value: 'has_workflow', label: 'Has Workflow', count: domains.filter(d => d.hasWorkflow).length, icon: CheckCircle },
                        { value: 'no_workflow', label: 'No Workflow', count: domains.filter(d => !d.hasWorkflow).length, icon: XCircle }
                      ].map((filter) => {
                        const Icon = filter.icon;
                        return (
                          <button
                            key={filter.value}
                            onClick={() => setWorkflowFilter(filter.value as any)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-all flex items-center ${
                              workflowFilter === filter.value
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                          >
                            {Icon && <Icon className={`w-4 h-4 mr-1 ${workflowFilter === filter.value ? 'text-white' : 'text-gray-500'}`} />}
                            {filter.label} 
                            <span className={`ml-1 ${workflowFilter === filter.value ? 'text-white/80' : 'text-gray-500'}`}>
                              ({filter.count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedDomains.size > 0 && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedDomains.size} domain{selectedDomains.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={clearSelection}
                        className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {!hideExperimentalFeatures && (
                        <>
                          <button
                            onClick={startBulkDataForSeoAnalysis}
                            disabled={bulkAnalysisRunning}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            {bulkAnalysisRunning ? 'Analyzing...' : 'Analyze Selected with DataForSEO'}
                          </button>
                          <button
                            onClick={startAIQualification}
                            disabled={bulkAnalysisRunning}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Qualify Selected
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setMessage('🚧 Export selected domains coming soon!');
                        }}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyword Cluster Selection Modal */}
              {showKeywordClusters && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="p-6 border-b">
                      <h2 className="text-xl font-semibold">Select Keyword Clusters for Analysis</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Keywords have been grouped into topical clusters. Select which clusters to analyze with DataForSEO.
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                        {/* Select All/None buttons */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-gray-600">
                            {keywordClusters.filter(c => c.selected).length} of {keywordClusters.length} clusters selected • 
                            {' '}{keywordClusters.filter(c => c.selected).flatMap(c => c.keywords).length} keywords
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setKeywordClusters(clusters => 
                                clusters.map(c => ({ ...c, selected: true }))
                              )}
                              className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => setKeywordClusters(clusters => 
                                clusters.map(c => ({ ...c, selected: false }))
                              )}
                              className="text-sm px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        {/* Cluster list */}
                        {keywordClusters.map((cluster, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cluster.selected}
                                onChange={(e) => {
                                  setKeywordClusters(clusters => 
                                    clusters.map((c, i) => 
                                      i === index ? { ...c, selected: e.target.checked } : c
                                    )
                                  );
                                }}
                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{cluster.name}</h3>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    cluster.relevance === 'core' 
                                      ? 'bg-green-100 text-green-800' 
                                      : cluster.relevance === 'related'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {cluster.relevance === 'core' ? 'Premium' : 
                                     cluster.relevance === 'related' ? 'Good' : 'Standard'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {cluster.keywords.length} keywords
                                  </span>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  <div className="line-clamp-2">
                                    {cluster.keywords.slice(0, 5).join(', ')}
                                    {cluster.keywords.length > 5 && ` +${cluster.keywords.length - 5} more`}
                                  </div>
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-6 border-t bg-gray-50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setShowKeywordClusters(false);
                            setKeywordClusters([]);
                          }}
                          className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeDataForSeoAnalysis}
                          disabled={!keywordClusters.some(c => c.selected)}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Analyze Selected Clusters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Domain Table */}
              {(() => {
                const filteredDomains = domains.filter(domain => {
                  // Status filter
                  if (statusFilter !== 'all' && domain.qualificationStatus !== statusFilter) return false;
                  
                  // Workflow filter
                  if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
                  if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
                  
                  // Search filter
                  if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  
                  return true;
                });
                
                const paginatedDomains = filteredDomains.slice(0, displayLimit);
                const hasMore = filteredDomains.length > displayLimit;
                
                return (
                  <>
                    {/* Quick Actions when no domains selected */}
                    {selectedDomains.size === 0 && filteredDomains.length > 0 && !hideExperimentalFeatures && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-purple-800">
                            <strong>Tip:</strong> Select domains to qualify them with AI
                          </p>
                          <button
                            onClick={() => selectAll(filteredDomains.map(d => d.id))}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Select All {filteredDomains.length} Domains
                          </button>
                        </div>
                      </div>
                    )}

                    <BulkAnalysisTable
                      domains={paginatedDomains}
                      targetPages={targetPages}
                      selectedDomains={selectedDomains}
                      recentlyAnalyzedDomains={recentlyAnalyzedDomains}
                      onToggleSelection={toggleDomainSelection}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      onUpdateStatus={updateQualificationStatus}
                      onCreateWorkflow={createWorkflow}
                      onDeleteDomain={deleteDomain}
                      onAnalyzeWithDataForSeo={analyzeWithDataForSeo}
                      onUpdateNotes={async (domainId, notes) => {
                        // Save notes
                        try {
                          const session = AuthService.getSession();
                          if (!session) {
                            console.error('No user session found');
                            return;
                          }

                          const domain = domains.find(d => d.id === domainId);
                          if (!domain) return;

                          const response = await fetch(`/api/clients/${params.id}/bulk-analysis/${domainId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              status: domain.qualificationStatus, 
                              userId: session.userId, 
                              notes: notes 
                            })
                          });

                          if (response.ok) {
                            setDomains(prevDomains => 
                              prevDomains.map(d => 
                                d.id === domainId 
                                  ? { ...d, notes }
                                  : d
                              )
                            );
                            setMessage('✅ Notes saved');
                          } else {
                            const errorData = await response.json();
                            console.error('Error saving notes:', errorData);
                            setMessage(`❌ Error saving notes: ${errorData.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Error saving notes:', error);
                          setMessage('❌ Failed to save notes');
                        }
                      }}
                      onAIQualifySingle={aiQualifySingleDomain}
                      selectedPositionRange={selectedPositionRange}
                      hideExperimentalFeatures={hideExperimentalFeatures}
                      loading={loading}
                      keywordInputMode={keywordInputMode}
                      manualKeywords={manualKeywords}
                      triageMode={triageMode}
                      onToggleTriageMode={() => setShowGuidedTriage(true)}
                      onBulkCreateWorkflows={bulkCreateWorkflows}
                      bulkWorkflowCreating={bulkWorkflowCreating}
                    />
                    
                    {/* Show More Button */}
                    {hasMore && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setDisplayLimit(displayLimit + ITEMS_PER_PAGE)}
                          className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Show More ({filteredDomains.length - paginatedDomains.length} remaining)
                        </button>
                      </div>
                    )}
                    
                    {/* Results Summary */}
                    <div className="mt-4 text-center">
                      <div className="text-sm text-gray-600">
                        Showing {paginatedDomains.length} of {filteredDomains.length} domains
                        {filteredDomains.length < domains.length && (
                          <span className="text-indigo-600 ml-1">
                            (filtered from {domains.length} total)
                          </span>
                        )}
                      </div>
                      
                      {/* Active Filters Summary */}
                      {(searchQuery || statusFilter !== 'all' || workflowFilter !== 'all') && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                          <span className="text-gray-500">Active filters:</span>
                          {searchQuery && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              Search: "{searchQuery}"
                            </span>
                          )}
                          {statusFilter !== 'all' && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                              Status: {statusFilter.replace('_', ' ')}
                            </span>
                          )}
                          {workflowFilter !== 'all' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              {workflowFilter === 'has_workflow' ? 'Has workflow' : 'No workflow'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

            </div>
          )}
        </div>
      </div>
      
      {/* DataForSEO Results Modal */}
      {dataForSeoModal.isOpen && (
        <DataForSeoResultsModal
          isOpen={dataForSeoModal.isOpen}
          onClose={() => setDataForSeoModal({ isOpen: false, domainId: '', domain: '', clientId: '', initialResults: [], totalFound: 0 })}
          domainId={dataForSeoModal.domainId}
          domain={dataForSeoModal.domain}
          clientId={dataForSeoModal.clientId}
          initialResults={dataForSeoModal.initialResults}
          totalFound={dataForSeoModal.totalFound}
          taskId={dataForSeoModal.taskId}
          cacheInfo={dataForSeoModal.cacheInfo}
        />
      )}
      
      {/* Bulk Analysis Results Modal */}
      {bulkResultsModal.isOpen && (
        <BulkAnalysisResultsModal
          isOpen={bulkResultsModal.isOpen}
          onClose={() => setBulkResultsModal({ isOpen: false, jobId: '', analyzedDomains: [] })}
          jobId={bulkResultsModal.jobId}
          domains={bulkResultsModal.analyzedDomains}
        />
      )}

      {/* AI Qualification Modal */}
      {showAIQualification && (
        <AIQualificationModal
          isOpen={showAIQualification}
          onClose={() => setShowAIQualification(false)}
          clientId={params.id as string}
          domains={aiQualificationDomains}
          onComplete={handleAIQualificationComplete}
        />
      )}

      {/* Guided Triage Flow */}
      {showGuidedTriage && (
        <GuidedTriageFlow
          domains={domains.filter(domain => {
            // Status filter
            if (statusFilter !== 'all' && domain.qualificationStatus !== statusFilter) return false;
            
            // Workflow filter
            if (workflowFilter === 'has_workflow' && !domain.hasWorkflow) return false;
            if (workflowFilter === 'no_workflow' && domain.hasWorkflow) return false;
            
            // Search filter
            if (searchQuery && !domain.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            
            return true;
          })}
          targetPages={targetPages}
          onClose={() => {
            setShowGuidedTriage(false);
          }}
          onUpdateStatus={updateQualificationStatus}
          onAnalyzeWithDataForSeo={analyzeWithDataForSeo}
          keywordInputMode={keywordInputMode}
          manualKeywords={manualKeywords}
          userId={AuthService.getSession()?.userId || ''}
        />
      )}
    </AuthWrapper>
  );
}