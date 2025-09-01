'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // Workspace and email processing controls
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('workspace-1');
  const [emailLimit, setEmailLimit] = useState<number>(10);
  const [onlyReplied, setOnlyReplied] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchDrafts();
  }, [selectedWorkspace]); // Re-fetch when workspace changes

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
          workspace: selectedWorkspace,
          limit: emailLimit,
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
                  <option value="workspace-1">Primary Workspace (Default)</option>
                  <option value="workspace-2">Secondary Workspace (900b0cdf...)</option>
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
              <p className="text-xs text-gray-500 mt-1">Select which ManyReach workspace to import from</p>
            </div>

            {/* Email Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Limit</label>
              <input
                type="number"
                min="1"
                max="1000"
                className="w-full p-2 border rounded-md"
                value={emailLimit}
                onChange={(e) => setEmailLimit(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of emails to process per campaign</p>
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
                : `Processing up to ${emailLimit} emails per campaign × ${selectedCampaigns.length || campaigns.length} campaigns`
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts {Array.isArray(drafts) && drafts.length > 0 && <Badge className="ml-2">{drafts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

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
            {/* Draft List */}
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Draft Publishers</CardTitle>
                  <CardDescription>Review and approve imported data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(drafts) && drafts.map((draft) => {
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
                            
                            {data.hasOffer && (
                              <Badge variant="outline" className="text-green-600 bg-green-50">
                                💰 Has Pricing
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DraftEditor({ draft, onUpdate }: { draft: Draft; onUpdate: (updates: any) => void }) {
  const [editedData, setEditedData] = useState(draft.edited_data || draft.parsed_data);
  const [showEmail, setShowEmail] = useState(false);

  const handleSave = () => {
    onUpdate({ editedData, status: 'reviewing' });
  };

  const handleApprove = () => {
    onUpdate({ editedData, status: 'approved' });
  };

  const handleReject = () => {
    onUpdate({ status: 'rejected' });
  };

  return (
    <div className="space-y-4">
      {/* Email Preview Toggle */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Review Draft</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmail(!showEmail)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showEmail ? 'Hide' : 'Show'} Original Email
            </Button>
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

      {/* Extracted Data Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Information</CardTitle>
          <CardDescription>Edit the parsed data before approving</CardDescription>
        </CardHeader>
        <CardContent>
        {editedData && (
          <div className="space-y-4">
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
                        <label className="text-sm font-medium">Monthly Traffic</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={website.totalTraffic || ''}
                          onChange={(e) => {
                            const newWebsites = [...editedData.websites];
                            newWebsites[index] = { ...website, totalTraffic: parseInt(e.target.value) || null };
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
                      <span className="font-medium text-blue-900">
                        {offering.offeringType === 'guest_post' ? '📝 Guest Post' : '🔗 Link Insertion'}
                      </span>
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
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Base Price</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={offering.basePrice || ''}
                            placeholder="150"
                            onChange={(e) => {
                              const newOfferings = [...editedData.offerings];
                              newOfferings[index] = { ...offering, basePrice: parseFloat(e.target.value) || null };
                              setEditedData({ ...editedData, offerings: newOfferings });
                            }}
                          />
                          <select
                            className="p-2 border rounded"
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
                              value={offering.requirements?.acceptsDoFollow ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, acceptsDoFollow: e.target.value === 'true' }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
                              <option value="true">✅ Yes</option>
                              <option value="false">❌ No</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium">Author Bio Required</label>
                            <select
                              className="w-full p-2 border rounded text-sm"
                              value={offering.requirements?.requiresAuthorBio ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, requiresAuthorBio: e.target.value === 'true' }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
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
                              value={offering.requirements?.imagesRequired ? 'true' : 'false'}
                              onChange={(e) => {
                                const newOfferings = [...editedData.offerings];
                                newOfferings[index] = { 
                                  ...offering, 
                                  requirements: { ...offering.requirements, imagesRequired: e.target.value === 'true' }
                                };
                                setEditedData({ ...editedData, offerings: newOfferings });
                              }}
                            >
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
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save as Draft
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
    </div>
  );
}