'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, Clock, Activity, ChevronLeft, Mail, Key, FileText, BarChart } from 'lucide-react';
import { CampaignStatusView } from '@/components/manyreach/CampaignStatusView';
import { DraftsListInfinite } from '@/components/manyreach/DraftsListInfinite';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Simple toast notification
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    if (variant === 'destructive') {
      console.error(`${title}: ${description}`);
      alert(`Error: ${description}`);
    } else {
      console.log(`${title}: ${description}`);
      // For success messages, just log to console
      console.log(`✅ ${title}: ${description}`);
    }
  }
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalProspects: number;
  sentCount: number;
  repliedCount: number;
  importedCount: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
}

interface Draft {
  id: string;
  email_log_id: string;
  parsed_data: any;
  edited_data?: any;
  status: string;
  review_notes?: string;
  created_at: string;
  email_from: string;
  email_subject: string;
  campaign_name: string;
  raw_content: string;
  html_content: string;
}

export default function ManyReachImportPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  
  // Workspace and email processing controls
  const [workspaces, setWorkspaces] = useState<{workspace_name: string; is_active: boolean}[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('main');
  const [emailLimit, setEmailLimit] = useState<number>(10);
  const [unlimitedEmails, setUnlimitedEmails] = useState<boolean>(false);
  const [onlyReplied, setOnlyReplied] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  // Draft filtering
  const [showOnlyWithOffers, setShowOnlyWithOffers] = useState<boolean>(false);
  const [showOnlyWithPricing, setShowOnlyWithPricing] = useState<boolean>(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaces();
    fetchDrafts();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchCampaigns();
    }
  }, [selectedWorkspace]); // Re-fetch when workspace changes
  
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/admin/manyreach-keys');
      const data = await response.json();
      const activeWorkspaces = (data.workspaces || []).filter((ws: any) => ws.is_active);
      setWorkspaces(activeWorkspaces);
      
      // Set default workspace if available
      if (activeWorkspaces.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(activeWorkspaces[0].workspace_name);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/admin/manyreach/campaigns?workspace=${selectedWorkspace}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/admin/manyreach/drafts');
      if (!response.ok) throw new Error('Failed to fetch drafts');
      const data = await response.json();
      const draftsArray = Array.isArray(data.drafts) ? data.drafts : [];
      setDrafts(draftsArray);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setDrafts([]); // Ensure drafts is always an array
    }
  };

  const importCampaign = async (campaignId: string) => {
    setImporting(campaignId);
    try {
      const response = await fetch('/api/admin/manyreach/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId,
          workspaceName: selectedWorkspace,
          limit: unlimitedEmails ? null : emailLimit,
          onlyReplied,
          previewMode
        })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const data = await response.json();
      
      toast({
        title: 'Import Complete',
        description: `Imported ${data.result.imported} replies, skipped ${data.result.skipped}`,
      });
      
      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setImporting(null);
    }
  };

  const updateDraft = async (draftId: string, updates: any) => {
    try {
      const response = await fetch('/api/admin/manyreach/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, ...updates })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      toast({
        title: 'Draft Updated',
        description: 'Changes saved successfully',
      });
      
      await fetchDrafts();
      
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const clearTestData = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/admin/manyreach/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Clear failed');
      
      toast({
        title: 'Data Cleared',
        description: 'All test data has been cleared. You can now import fresh data.',
      });
      
      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();
      setSelectedDraft(null);
      
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: 'Clear Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setClearing(false);
    }
  };

  const reprocessDraft = async (draftId: string) => {
    try {
      const response = await fetch('/api/admin/manyreach/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      });
      
      if (!response.ok) throw new Error('Failed to reprocess draft');
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Draft re-processed with updated extraction',
      });
      
      // Update the draft in the list
      setDrafts(prevDrafts => 
        prevDrafts.map(d => 
          d.id === draftId 
            ? { ...d, parsed_data: result.parsedData, edited_data: null }
            : d
        )
      );
      
      // Update selected draft if it's the one being reprocessed
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({
          ...selectedDraft,
          parsed_data: result.parsedData,
          edited_data: null
        });
      }
      
    } catch (error) {
      console.error('Error reprocessing draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to reprocess draft',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">ManyReach Import V3</h1>
              <p className="text-gray-600 mt-2">Import publisher replies and create draft records for review</p>
            </div>
          <Button
            onClick={clearTestData}
            disabled={clearing}
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {clearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Test Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace and Processing Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Settings</CardTitle>
          <CardDescription>Configure workspace and email processing options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Workspace Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Workspace</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded-md"
                  value={selectedWorkspace}
                  onChange={(e) => {
                    setSelectedWorkspace(e.target.value);
                    // Campaigns will auto-refresh due to useEffect
                  }}
                >
                  {workspaces.length === 0 ? (
                    <option value="">No workspaces configured</option>
                  ) : (
                    workspaces.map(ws => (
                      <option key={ws.workspace_name} value={ws.workspace_name}>
                        {ws.workspace_name}
                      </option>
                    ))
                  )}
                </select>
                <Button
                  onClick={() => {
                    setLoading(true);
                    fetchCampaigns();
                  }}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄 Refresh'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select which ManyReach workspace to import from
                {workspaces.length === 0 && (
                  <span> • <a href="/admin/manyreach-keys" className="text-blue-600 hover:underline">Configure API keys</a></span>
                )}
              </p>
            </div>

            {/* Email Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Limit</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="flex-1 p-2 border rounded-md disabled:bg-gray-100"
                    value={emailLimit}
                    onChange={(e) => setEmailLimit(parseInt(e.target.value) || 10)}
                    disabled={unlimitedEmails}
                  />
                  <label className="flex items-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={unlimitedEmails}
                      onChange={(e) => setUnlimitedEmails(e.target.checked)}
                    />
                    <span className="text-sm">Process All</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  {unlimitedEmails 
                    ? '⚠️ Will process ALL emails (may incur high API costs)'
                    : 'Maximum number of emails to process per campaign'
                  }
                </p>
              </div>
            </div>

            {/* Processing Options */}
            <div>
              <label className="block text-sm font-medium mb-2">Processing Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={onlyReplied}
                    onChange={(e) => setOnlyReplied(e.target.checked)}
                  />
                  <span className="text-sm">Only process replied prospects</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                  />
                  <span className="text-sm">Preview mode (dry run without saving)</span>
                </label>
              </div>
            </div>

            {/* Campaign Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Filter</label>
              <div className="text-sm text-gray-600">
                {selectedCampaigns.length > 0 
                  ? `Processing ${selectedCampaigns.length} selected campaigns`
                  : 'Processing all campaigns'
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">Select specific campaigns from the list below</p>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-900">
              Estimated Processing Cost
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {previewMode 
                ? 'Preview mode - No API costs will be incurred'
                : unlimitedEmails
                ? `⚠️ Processing ALL emails from ${selectedCampaigns.length || campaigns.length} campaigns - costs may be significant`
                : `Processing up to ${emailLimit} emails per campaign × ${selectedCampaigns.length || campaigns.length} campaigns`
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">
            <Activity className="mr-2 h-4 w-4" />
            Status Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts {Array.isArray(drafts) && drafts.length > 0 && <Badge className="ml-2">{drafts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <CampaignStatusView workspace={selectedWorkspace} />
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>ManyReach Campaigns</CardTitle>
              <CardDescription>Import replies from your email campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            <span>Sent: {campaign.sentCount}</span>
                            <span>Replied: {campaign.repliedCount}</span>
                            <span>Imported: {campaign.importedCount}</span>
                            <span>Drafts: {campaign.draftCount}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          <Button
                            onClick={() => importCampaign(campaign.id)}
                            disabled={importing === campaign.id}
                            size="sm"
                          >
                            {importing === campaign.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Import Replies
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {campaign.pendingCount > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-orange-600">
                            {campaign.pendingCount} pending review
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {campaigns.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No campaigns found. Check your ManyReach API key configuration.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts">
          <div className="grid grid-cols-12 gap-4">
            {/* Use new infinite scroll component */}
            <div className="col-span-4">
              <DraftsListInfinite 
                onDraftSelect={setSelectedDraft}
                onDraftUpdate={fetchDrafts}
              />
            </div>
            
            {/* Draft Editor - restored from original */}
            <div className="col-span-8">
              {selectedDraft ? (
                <DraftEditor
                  draft={selectedDraft}
                  onUpdate={(updates) => updateDraft(selectedDraft.id, updates)}
                  onReprocess={() => reprocessDraft(selectedDraft.id)}
                />
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-gray-500">
                      Select a draft to review
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          {/* OLD CONTENT BELOW - HIDDEN */}
          <div style={{ display: 'none' }}>
          {/* Draft Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{drafts.length}</div>
                <div className="text-sm text-gray-600">Total Drafts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {drafts.filter(d => (d.edited_data || d.parsed_data).hasOffer).length}
                </div>
                <div className="text-sm text-gray-600">With Offers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {drafts.filter(d => {
                    const data = d.edited_data || d.parsed_data;
                    return data.offerings?.some((o: any) => o.basePrice !== null && o.basePrice !== undefined);
                  }).length}
                </div>
                <div className="text-sm text-gray-600">With Pricing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {drafts.filter(d => {
                    const data = d.edited_data || d.parsed_data;
                    return data.hasOffer && data.offerings?.some((o: any) => 
                      o.basePrice === null || o.basePrice === undefined
                    );
                  }).length}
                </div>
                <div className="text-sm text-gray-600">Need Price Info</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Draft Filters */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Filter Drafts</CardTitle>
              <CardDescription>Show only relevant drafts for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={showOnlyWithOffers}
                    onChange={(e) => setShowOnlyWithOffers(e.target.checked)}
                  />
                  <span className="text-sm">Only drafts with offers</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={showOnlyWithPricing}
                    onChange={(e) => setShowOnlyWithPricing(e.target.checked)}
                  />
                  <span className="text-sm">Only drafts with pricing</span>
                </label>
                <div className="ml-auto text-sm text-gray-600">
                  Showing {(() => {
                    const filtered = drafts.filter(draft => {
                      const data = draft.edited_data || draft.parsed_data;
                      if (showOnlyWithOffers && !data.hasOffer) return false;
                      if (showOnlyWithPricing) {
                        const hasPrice = data.offerings?.some((o: any) => 
                          o.basePrice !== null && o.basePrice !== undefined
                        );
                        if (!hasPrice) return false;
                      }
                      return true;
                    });
                    return filtered.length;
                  })()} of {drafts.length} drafts
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-12 gap-4">
            {/* Draft List */}
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Draft Publishers</CardTitle>
                  <CardDescription>Review and approve imported data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(drafts) && drafts.filter((draft) => {
                      const data = draft.edited_data || draft.parsed_data;
                      // Apply filters
                      if (showOnlyWithOffers && !data.hasOffer) return false;
                      if (showOnlyWithPricing) {
                        const hasPrice = data.offerings?.some((o: any) => 
                          o.basePrice !== null && o.basePrice !== undefined
                        );
                        if (!hasPrice) return false;
                      }
                      return true;
                    }).map((draft) => {
                      const data = draft.edited_data || draft.parsed_data;
                      return (
                        <div
                          key={draft.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                            selectedDraft?.id === draft.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedDraft(draft)}
                        >
                          <div className="font-medium">
                            {data.publisher?.companyName || 'Unknown Publisher'}
                            {data.extractionMetadata && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-1 rounded">V3 Simplified</span>
                            )}
                          </div>
                          {data.publisher?.contactName && (
                            <div className="text-sm text-gray-700">Contact: {data.publisher.contactName}</div>
                          )}
                          <div className="text-sm text-gray-600">{draft.email_from}</div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {draft.status === 'pending' && (
                              <Badge variant="outline" className="text-orange-600">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {draft.status === 'approved' && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {draft.status === 'rejected' && (
                              <Badge variant="outline" className="text-red-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            
                            {data.hasOffer ? (
                              <>
                                <Badge variant="outline" className="text-blue-600 bg-blue-50">
                                  ✅ Has Offer
                                </Badge>
                                {data.offerings?.some((o: any) => o.basePrice !== null && o.basePrice !== undefined) && (
                                  <Badge variant="outline" className="text-green-600 bg-green-50">
                                    💰 Has Pricing
                                  </Badge>
                                )}
                                {data.offerings?.some((o: any) => o.basePrice === null || o.basePrice === undefined) && (
                                  <Badge variant="outline" className="text-orange-600 bg-orange-50">
                                    ❓ Needs Price Info
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                                ⚠️ No Offer
                              </Badge>
                            )}
                            
                            {!data.hasOffer && data.extractionMetadata?.extractionNotes && (
                              <Badge variant="outline" className="text-gray-600" title={data.extractionMetadata.extractionNotes}>
                                📝 {data.extractionMetadata.extractionNotes.substring(0, 30)}...
                              </Badge>
                            )}
                            
                            {data.websites?.length > 0 && (
                              <Badge variant="outline" className="text-blue-600">
                                {data.websites.length} Website{data.websites.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            
                            {data.extractionMetadata?.confidence > 0 && (
                              <Badge variant="outline" className="text-gray-600">
                                {Math.round(data.extractionMetadata.confidence * 100)}% Confidence
                              </Badge>
                            )}
                          </div>
                          
                          {data.extractionMetadata?.keyQuotes?.[0] && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              "{data.extractionMetadata.keyQuotes[0].substring(0, 50)}..."
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {(!Array.isArray(drafts) || drafts.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No drafts yet. Import some campaigns first.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Draft Editor */}
            <div className="col-span-8">
              {selectedDraft ? (
                <DraftEditor
                  draft={selectedDraft}
                  onUpdate={(updates) => updateDraft(selectedDraft.id, updates)}
                  onReprocess={() => reprocessDraft(selectedDraft.id)}
                />
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-gray-500">
                      Select a draft to review
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          </div> {/* Close hidden div */}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DraftEditor({ draft, onUpdate, onReprocess }: { 
  draft: Draft; 
  onUpdate: (updates: any) => void;
  onReprocess: () => void;
}) {
  const [editedData, setEditedData] = useState(draft.edited_data || draft.parsed_data);
  const [showEmail, setShowEmail] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const handleSave = () => {
    onUpdate({ editedData, status: 'reviewing' });
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      // First, call the approve endpoint to create records
      const response = await fetch('/api/admin/manyreach/draft-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the draft status to approved
        await onUpdate({ editedData, status: 'approved' });
        
        // Show success message with details
        const message = `✅ Created: ${result.created.publisherId ? '1 publisher, ' : ''}${result.created.websiteIds.length} website(s), ${result.created.offeringIds.length} offering(s)`;
        alert(message);
        
        // Trigger a refresh of the drafts list
        if (onReprocess) {
          onReprocess(); // This will refresh the parent component
        }
      } else {
        alert(`❌ Approval failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve and create records');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    onUpdate({ status: 'rejected' });
  };
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [approving, setApproving] = useState(false);
  
  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await fetch('/api/admin/manyreach/draft-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id })
      });
      
      const result = await response.json();
      if (result.success) {
        setPreviewData(result.preview);
        setShowPreview(true);
      } else {
        alert(`Preview failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    await onReprocess();
    setReprocessing(false);
    // Reset edited data to the new parsed data
    setEditedData(draft.parsed_data);
  };

  // Update editedData when draft changes (after reprocessing)
  React.useEffect(() => {
    setEditedData(draft.edited_data || draft.parsed_data);
  }, [draft.id, draft.parsed_data]);

  return (
    <div className="space-y-4">
      {/* Email Preview Toggle */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Review Draft</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessing}
              >
                {reprocessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Re-processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-process with Updated AI
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmail(!showEmail)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showEmail ? 'Hide' : 'Show'} Original Email
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Original Email */}
      {showEmail && (
        <Card>
          <CardHeader>
            <CardTitle>Original Email</CardTitle>
            <CardDescription>
              From: {draft.email_from} | {new Date(draft.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: draft.html_content }}
            />
          </CardContent>
        </Card>
      )}

      {/* No Offer Warning */}
      {!editedData?.hasOffer && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">⚠️ No Concrete Offer Detected</CardTitle>
            <CardDescription className="text-yellow-700">
              This email was marked as having no offer. Common reasons:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
              <li>Auto-reply or out-of-office message</li>
              <li>Internal forward without an actual offer</li>
              <li>Link exchange request instead of paid service</li>
              <li>Simple acknowledgment without pricing details</li>
              <li>Rejection of our outreach</li>
            </ul>
            {editedData?.extractionMetadata?.extractionNotes && (
              <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
                <span className="font-medium">AI Analysis: </span>
                {editedData.extractionMetadata.extractionNotes}
              </div>
            )}
            {editedData?.extractionMetadata?.keyQuotes && editedData.extractionMetadata.keyQuotes.length > 0 && (
              <div className="mt-3">
                <span className="font-medium">Key Quotes from Email:</span>
                <ul className="mt-1 space-y-1">
                  {editedData.extractionMetadata.keyQuotes.map((quote: string, i: number) => (
                    <li key={i} className="text-sm italic">"{quote}"</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Information</CardTitle>
          <CardDescription>Edit the parsed data before approving</CardDescription>
        </CardHeader>
        <CardContent>
        {editedData && (
          <div className="space-y-4">
            {/* Has Offer Toggle */}
            <div>
              <h3 className="font-semibold mb-2">Offer Status</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={editedData.hasOffer}
                    onChange={(e) => setEditedData({ ...editedData, hasOffer: e.target.checked })}
                  />
                  <span className={editedData.hasOffer ? 'text-green-700 font-medium' : 'text-gray-500'}>
                    {editedData.hasOffer ? '✅ Has Concrete Offer' : '❌ No Concrete Offer'}
                  </span>
                </label>
                {!editedData.hasOffer && (
                  <span className="text-sm text-gray-500">
                    (Toggle this if the AI incorrectly marked as no offer)
                  </span>
                )}
              </div>
            </div>

            {/* Publisher Info */}
            <div>
              <h3 className="font-semibold mb-2">Publisher</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editedData.publisher?.companyName || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { ...editedData.publisher, companyName: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editedData.publisher?.contactName || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { ...editedData.publisher, contactName: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded"
                    value={editedData.publisher?.email || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { ...editedData.publisher, email: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Email</label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded"
                    placeholder="Only if different from main email"
                    value={editedData.publisher?.paymentEmail || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { ...editedData.publisher, paymentEmail: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Methods</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="e.g. paypal, wise, bank_transfer"
                    value={editedData.publisher?.paymentMethods?.join(', ') || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { 
                        ...editedData.publisher, 
                        paymentMethods: e.target.value.split(',').map(m => m.trim()).filter(m => m)
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Terms</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="e.g. 7 days post-completion, payment on delivery"
                    value={editedData.publisher?.paymentTerms || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      publisher: { ...editedData.publisher, paymentTerms: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Primary Website</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editedData.websites?.[0]?.domain || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      websites: [{ ...editedData.websites?.[0], domain: e.target.value }]
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Websites */}
            {editedData.websites && editedData.websites.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Websites (Table 2)</h3>
                {editedData.websites.map((website: any, index: number) => (
                  <div key={index} className="p-3 border rounded mb-2">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="text-sm font-medium">Domain</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={website.domain || ''}
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { ...website, domain: e.target.value };
                            setEditedData({ ...editedData, websites: newWebsites });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Domain Rating</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={website.domainRating || ''}
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { ...website, domainRating: parseInt(e.target.value) || null };
                            setEditedData({ ...editedData, websites: newWebsites });
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Categories</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={website.categories?.join(', ') || ''}
                          placeholder="Technology, Business, Marketing..."
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { 
                              ...website, 
                              categories: e.target.value.split(',').map(n => n.trim()).filter(n => n) 
                            };
                            setEditedData({ ...editedData, websites: newWebsites });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Niche</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={website.niche?.join(', ') || ''}
                          placeholder="SaaS, B2B, eCommerce..."
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { 
                              ...website, 
                              niche: e.target.value.split(',').map(n => n.trim()).filter(n => n) 
                            };
                            setEditedData({ ...editedData, websites: newWebsites });
                          }}
                        />
                      </div>
                      {website.suggestedNewNiches && website.suggestedNewNiches.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-purple-600">Suggested New Niches</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="w-full p-2 border border-purple-300 rounded bg-purple-50"
                              value={website.suggestedNewNiches?.join(', ') || ''}
                              placeholder="New niches to add to database..."
                              onChange={(e) => {
                                const newWebsites = [...editedData.websites];
                                newWebsites[index] = { 
                                  ...website, 
                                  suggestedNewNiches: e.target.value.split(',').map(n => n.trim()).filter(n => n) 
                                };
                                setEditedData({ ...editedData, websites: newWebsites });
                              }}
                            />
                            <span className="text-xs text-purple-600">💡 New!</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium">Website Type</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded"
                          value={website.websiteType?.join(', ') || ''}
                          placeholder="Blog, News, Magazine..."
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { 
                              ...website, 
                              websiteType: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                            };
                            setEditedData({ ...editedData, websites: newWebsites });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Offerings (Table 3) */}
            {editedData.offerings && editedData.offerings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Offerings (Table 3) - Services & Pricing</h3>
                {editedData.offerings.map((offering: any, index: number) => (
                  <div key={index} className="p-3 border rounded mb-2 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-3 items-center">
                        <select
                          className="font-medium text-blue-900 bg-transparent border border-blue-300 rounded px-2 py-1"
                          value={offering.offeringType}
                          onChange={(e) => {
                            const newOfferings = [...editedData.offerings];
                            newOfferings[index] = { ...offering, offeringType: e.target.value };
                            setEditedData({ ...editedData, offerings: newOfferings });
                          }}
                        >
                          <option value="guest_post">📝 Guest Post</option>
                          <option value="link_insertion">🔗 Link Insertion</option>
                          <option value="link_exchange">🔄 Link Exchange</option>
                        </select>
                        <div>
                          <label className="text-xs text-gray-600">Website</label>
                          <input
                            type="text"
                            className="block w-40 text-sm p-1 border rounded"
                            value={offering.websiteDomain || ''}
                            placeholder="domain.com"
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { ...offering, websiteDomain: e.target.value };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newOfferings = editedData.offerings.filter((_: any, i: number) => i !== index);
                          setEditedData({ ...editedData, offerings: newOfferings });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium">Base Price</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            className="w-24 p-2 border rounded"
                            value={offering.basePrice || ''}
                            placeholder="150"
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { ...offering, basePrice: parseFloat(e.target.value) || null };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                          <select
                            className="p-2 border rounded text-sm"
                            value={offering.currency || 'USD'}
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { ...offering, currency: e.target.value };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Availability Status</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={offering.currentAvailability || 'available'}
                          onChange={(e) => {
                            const newOfferings = [...editedData.offerings];
                            newOfferings[index] = { ...offering, currentAvailability: e.target.value };
                            setEditedData({ ...editedData, offerings: newOfferings });
                          }}
                        >
                          <option value="available">✅ Available</option>
                          <option value="needs_info">❓ Needs Info</option>
                          <option value="limited">⚠️ Limited</option>
                          <option value="paused">⏸️ Paused</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Turnaround (days)</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={offering.turnaroundDays || ''}
                          placeholder="7"
                          onChange={(e) => {
                            const newOfferings = [...editedData.offerings];
                            newOfferings[index] = { ...offering, turnaroundDays: parseInt(e.target.value) || null };
                            setEditedData({ ...editedData, offerings: newOfferings });
                          }}
                        />
                      </div>
                      
                      {offering.offeringType === 'guest_post' && (
                        <div>
                          <label className="text-sm font-medium">Word Count</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={offering.minWordCount || ''}
                              placeholder="Min"
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { ...offering, minWordCount: parseInt(e.target.value) || null };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            />
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={offering.maxWordCount || ''}
                              placeholder="Max"
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { ...offering, maxWordCount: parseInt(e.target.value) || null };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Requirements */}
                    {offering.requirements && (
                      <div className="mt-3 space-y-3">
                        <div className="font-medium text-sm">Requirements</div>
                        
                        {/* Basic Requirements */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium">DoFollow Links</label>
                            <select
                              className="w-full p-2 border rounded text-sm"
                              value={offering.requirements?.acceptsDoFollow === null ? 'unknown' : offering.requirements?.acceptsDoFollow ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                const value = e.target.value === 'unknown' ? null : e.target.value === 'true';
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, acceptsDoFollow: value }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
                              <option value="unknown">❓ Not Specified</option>
                              <option value="true">✅ Yes</option>
                              <option value="false">❌ No</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium">Author Bio Required</label>
                            <select
                              className="w-full p-2 border rounded text-sm"
                              value={offering.requirements?.requiresAuthorBio === null ? 'unknown' : offering.requirements?.requiresAuthorBio ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                const value = e.target.value === 'unknown' ? null : e.target.value === 'true';
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, requiresAuthorBio: value }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
                              <option value="unknown">❓ Not Specified</option>
                              <option value="true">✅ Required</option>
                              <option value="false">❌ Not Required</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium">Max Links Per Post</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded text-sm"
                              value={offering.requirements?.maxLinksPerPost || ''}
                              placeholder="2"
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, maxLinksPerPost: parseInt(e.target.value) || null }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium">Images Required</label>
                            <select
                              className="w-full p-2 border rounded text-sm"
                              value={offering.requirements?.imagesRequired === null ? 'unknown' : offering.requirements?.imagesRequired ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                const value = e.target.value === 'unknown' ? null : e.target.value === 'true';
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, imagesRequired: value }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
                              <option value="unknown">❓ Not Specified</option>
                              <option value="false">❌ No</option>
                              <option value="true">✅ Yes</option>
                            </select>
                          </div>
                          
                          {offering.requirements?.imagesRequired && (
                            <div>
                              <label className="text-xs font-medium">Min Images</label>
                              <input
                                type="number"
                                className="w-full p-2 border rounded text-sm"
                                value={offering.requirements?.minImages || ''}
                                placeholder="1"
                                onChange={(e) => {
                                  const newOfferings = [...editedData.offerings];
                                  newOfferings[index] = { 
                                    ...offering, 
                                    requirements: { ...offering.requirements, minImages: parseInt(e.target.value) || null }
                                  };
                                  setEditedData({ ...editedData, offerings: newOfferings });
                                }}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Content Requirements */}
                        <div>
                          <label className="text-xs font-medium">Content Requirements</label>
                          <textarea
                            className="w-full p-2 border rounded text-sm mt-1"
                            rows={2}
                            value={offering.requirements?.contentRequirements || ''}
                            placeholder="E.g., Original content only, well-researched, AP style guide..."
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { 
                                ...offering, 
                                requirements: { ...offering.requirements, contentRequirements: e.target.value }
                              };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                        
                        {/* Author Bio Requirements */}
                        <div>
                          <label className="text-xs font-medium">Author Bio Requirements</label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm mt-1"
                            value={offering.requirements?.authorBioRequirements || ''}
                            placeholder="E.g., Max 100 words, include social links..."
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { 
                                ...offering, 
                                requirements: { ...offering.requirements, authorBioRequirements: e.target.value }
                              };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                        
                        {/* Link Requirements */}
                        <div>
                          <label className="text-xs font-medium">Link Requirements</label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm mt-1"
                            value={offering.requirements?.linkRequirements || ''}
                            placeholder="E.g., Contextual links only, no affiliates, natural anchor text..."
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { 
                                ...offering, 
                                requirements: { ...offering.requirements, linkRequirements: e.target.value }
                              };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                        
                        {/* Sample Post URL */}
                        <div>
                          <label className="text-xs font-medium">Sample Post URL</label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm mt-1"
                            value={offering.requirements?.samplePostUrl || ''}
                            placeholder="https://example.com/sample-post"
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { 
                                ...offering, 
                                requirements: { ...offering.requirements, samplePostUrl: e.target.value }
                              };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                        
                        {/* Prohibited Topics */}
                        <div>
                          <label className="text-xs font-medium">Prohibited Topics</label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm mt-1"
                            value={offering.requirements?.prohibitedTopics || ''}
                            placeholder="E.g., CBD, Gambling, Adult Content..."
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { 
                                ...offering, 
                                requirements: { ...offering.requirements, prohibitedTopics: e.target.value }
                              };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Extraction Metadata */}
            {editedData.extractionMetadata && (
              <div>
                <h3 className="font-semibold mb-2">Extraction Metadata</h3>
                <div className="p-3 border rounded bg-gray-50">
                  {editedData.extractionMetadata.confidence !== undefined && (
                    <div className="mb-2">
                      <span className="font-medium">Confidence: </span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        editedData.extractionMetadata.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                        editedData.extractionMetadata.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(editedData.extractionMetadata.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {editedData.extractionMetadata.extractionNotes && (
                    <div className="mb-2">
                      <span className="font-medium">Notes: </span>
                      {editedData.extractionMetadata.extractionNotes}
                    </div>
                  )}
                  {editedData.extractionMetadata.keyQuotes && editedData.extractionMetadata.keyQuotes.length > 0 && (
                    <div>
                      <span className="font-medium">Key Quotes:</span>
                      <ul className="mt-1 space-y-1">
                        {editedData.extractionMetadata.keyQuotes.map((quote: string, i: number) => (
                          <li key={i} className="text-sm italic text-gray-600">"{quote}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {editedData && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingPreview ? 'Loading...' : '👁️ Preview Impact'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save as Draft
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {approving ? '⏳ Creating Records...' : '✅ Approve & Create Records'}
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ❌ Reject
            </button>
            <button
              onClick={() => setEditedData(null)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
        </CardContent>
      </Card>
      
      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6 w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">📋 Draft Approval Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Impact Summary */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Estimated Impact</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {previewData.estimatedImpact.newPublishers}
                  </div>
                  <div className="text-sm text-gray-600">New Publishers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {previewData.estimatedImpact.newWebsites}
                  </div>
                  <div className="text-sm text-gray-600">New Websites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {previewData.estimatedImpact.newOfferings}
                  </div>
                  <div className="text-sm text-gray-600">New Offerings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {previewData.estimatedImpact.updatedRecords}
                  </div>
                  <div className="text-sm text-gray-600">Updates</div>
                </div>
              </div>
            </div>
            
            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Warnings</h3>
                <ul className="list-disc list-inside space-y-1">
                  {previewData.warnings.map((warning: string, i: number) => (
                    <li key={i} className="text-sm text-yellow-800">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Publisher Action */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">👤 Publisher Action</h3>
              <div className="border rounded-lg p-4">
                {previewData.proposedActions.publisherAction === 'create' ? (
                  <div>
                    <Badge className="bg-green-100 text-green-800 mb-2">New Publisher</Badge>
                    <div className="space-y-1 text-sm">
                      <div><strong>Email:</strong> {previewData.proposedActions.publisherDetails?.email}</div>
                      <div><strong>Contact:</strong> {previewData.proposedActions.publisherDetails?.contactName}</div>
                      <div><strong>Company:</strong> {previewData.proposedActions.publisherDetails?.companyName || 'N/A'}</div>
                      <div><strong>Status:</strong> Shadow (unclaimed)</div>
                    </div>
                  </div>
                ) : previewData.proposedActions.publisherAction === 'update' ? (
                  <div>
                    <Badge className="bg-blue-100 text-blue-800 mb-2">Update Existing</Badge>
                    <div className="space-y-1 text-sm">
                      <div><strong>Current:</strong> {previewData.currentState.publisher?.email}</div>
                      <div><strong>Updates:</strong></div>
                      <pre className="bg-gray-50 p-2 rounded text-xs">
                        {JSON.stringify(previewData.proposedActions.publisherDetails?.updates, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No publisher will be created</div>
                )}
              </div>
            </div>
            
            {/* Website Actions */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">🌐 Website Actions</h3>
              <div className="space-y-2">
                {previewData.proposedActions.websiteActions.map((action: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <strong>{action.domain}</strong>
                        {action.action === 'create' && (
                          <Badge className="ml-2 bg-green-100 text-green-800">New</Badge>
                        )}
                        {action.action === 'exists' && (
                          <Badge className="ml-2 bg-gray-100 text-gray-800">Exists</Badge>
                        )}
                        {action.action === 'update' && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800">Update</Badge>
                        )}
                      </div>
                    </div>
                    {action.details && (
                      <div className="mt-2 text-sm text-gray-600">
                        {action.details.categories && (
                          <div>Categories: {action.details.categories.join(', ')}</div>
                        )}
                        {action.details.niche && (
                          <div>Niches: {action.details.niche.join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Offering Actions */}
            {previewData.proposedActions.offeringActions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">💰 Offering Actions</h3>
                <div className="space-y-2">
                  {previewData.proposedActions.offeringActions.map((offering: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <strong>{offering.type}</strong> for <strong>{offering.websiteDomain}</strong>
                          {offering.action === 'create' && (
                            <Badge className="ml-2 bg-green-100 text-green-800">New</Badge>
                          )}
                          {offering.action === 'skip' && (
                            <Badge className="ml-2 bg-yellow-100 text-yellow-800">Skip</Badge>
                          )}
                        </div>
                      </div>
                      {offering.details && offering.details.basePrice !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Price: ${offering.details.basePrice} {offering.details.currency}
                          {offering.details.turnaroundDays && ` • ${offering.details.turnaroundDays} days`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleApprove();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✅ Proceed with Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}