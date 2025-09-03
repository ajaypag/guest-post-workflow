'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  Code,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Draft {
  id: string;
  email_log_id?: string;
  parsed_data: any;
  edited_data?: any;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  created_at: string;
  email_from: string;
  email_subject: string;
  campaign_name: string;
  raw_content?: string;
  html_content?: string;
}

interface DraftEditorProps {
  draft: Draft;
  onUpdate: (updates: any) => void;
  onReprocess: () => void;
  onDelete?: () => void;
}

export function DraftEditor({ draft, onUpdate, onReprocess, onDelete }: DraftEditorProps) {
  const [editedData, setEditedData] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState(draft.review_notes || '');
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditValue, setJsonEditValue] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showRawEmail, setShowRawEmail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [newOffering, setNewOffering] = useState({
    name: '',
    type: 'Guest Post',
    basePrice: '',
    description: '',
    requirements: ''
  });

  useEffect(() => {
    setEditedData(draft.edited_data || draft.parsed_data);
    setReviewNotes(draft.review_notes || '');
  }, [draft]);

  const data = editedData || draft.parsed_data;

  const handleSave = () => {
    onUpdate({
      editedData: editedData,
      status: draft.status,
      reviewNotes: reviewNotes
    });
  };

  const handleApprove = () => {
    onUpdate({
      editedData: editedData,
      status: 'approved',
      reviewNotes: reviewNotes
    });
  };

  const handleReject = () => {
    onUpdate({
      editedData: editedData,
      status: 'rejected',
      reviewNotes: reviewNotes
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/manyreach/drafts?draftId=${draft.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      // Call the onDelete callback to update the UI
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft. Please try again.');
    }
  };

  const openJsonEditor = () => {
    setJsonEditValue(JSON.stringify(data, null, 2));
    setJsonError('');
    setShowJsonEditor(true);
  };

  const saveJsonEdit = () => {
    try {
      const parsed = JSON.parse(jsonEditValue);
      setEditedData(parsed);
      setShowJsonEditor(false);
      setJsonError('');
    } catch (error) {
      setJsonError('Invalid JSON: ' + (error as Error).message);
    }
  };

  const addOffering = () => {
    if (!newOffering.name) return;
    
    const offering = {
      ...newOffering,
      basePrice: newOffering.basePrice ? parseFloat(newOffering.basePrice) : null,
      requirements: newOffering.requirements.split(',').map(r => r.trim()).filter(Boolean)
    };
    
    const updatedData = {
      ...data,
      hasOffer: true,
      offerings: [...(data.offerings || []), offering]
    };
    
    setEditedData(updatedData);
    setNewOffering({
      name: '',
      type: 'Guest Post',
      basePrice: '',
      description: '',
      requirements: ''
    });
    setShowManualEntry(false);
  };

  const removeOffering = (index: number) => {
    const updatedOfferings = [...data.offerings];
    updatedOfferings.splice(index, 1);
    
    setEditedData({
      ...data,
      offerings: updatedOfferings,
      hasOffer: updatedOfferings.length > 0
    });
  };

  const updateDomain = (index: number, value: string) => {
    const updatedWebsites = [...(data.websites || [])];
    updatedWebsites[index] = { ...updatedWebsites[index], domain: value };
    setEditedData({ ...data, websites: updatedWebsites });
  };

  const addDomain = () => {
    setEditedData({
      ...data,
      websites: [...(data.websites || []), { domain: '', metrics: {} }]
    });
  };

  const removeDomain = (index: number) => {
    const updatedWebsites = [...(data.websites || [])];
    updatedWebsites.splice(index, 1);
    setEditedData({ ...data, websites: updatedWebsites });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Draft Editor</CardTitle>
            <CardDescription>
              Review and edit extracted publisher information
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={openJsonEditor}
              variant="outline"
              size="sm"
            >
              <Code className="mr-2 h-4 w-4" />
              JSON Editor
            </Button>
            <Button
              onClick={onReprocess}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reprocess
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="extracted" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
            <TabsTrigger value="offerings">Offerings</TabsTrigger>
            <TabsTrigger value="websites">Websites</TabsTrigger>
            <TabsTrigger value="raw">Raw Email</TabsTrigger>
          </TabsList>

          <TabsContent value="extracted" className="space-y-4">
            {/* Publisher Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Publisher Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={data.publisher?.companyName || ''}
                    onChange={(e) => setEditedData({
                      ...data,
                      publisher: { ...data.publisher, companyName: e.target.value }
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Name</label>
                  <Input
                    value={data.publisher?.contactName || ''}
                    onChange={(e) => setEditedData({
                      ...data,
                      publisher: { ...data.publisher, contactName: e.target.value }
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={data.publisher?.email || draft.email_from}
                    onChange={(e) => setEditedData({
                      ...data,
                      publisher: { ...data.publisher, email: e.target.value }
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Input
                    value={data.publisher?.role || ''}
                    onChange={(e) => setEditedData({
                      ...data,
                      publisher: { ...data.publisher, role: e.target.value }
                    })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Offer Status */}
            <div className="space-y-2">
              <h3 className="font-semibold">Offer Status</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.hasOffer}
                    onChange={(e) => setEditedData({ ...data, hasOffer: e.target.checked })}
                    className="mr-2"
                  />
                  Has Offer
                </label>
                {data.hasOffer && (
                  <Badge variant="default" className="bg-green-600">
                    ✅ Publisher Interested
                  </Badge>
                )}
                {!data.hasOffer && (
                  <Badge variant="outline" className="text-yellow-600">
                    ⚠️ No Clear Offer
                  </Badge>
                )}
              </div>
            </div>

            {/* Extraction Metadata */}
            {data.extractionMetadata && (
              <div className="space-y-2">
                <h3 className="font-semibold">Extraction Details</h3>
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  <div>Confidence: {Math.round(data.extractionMetadata.confidence * 100)}%</div>
                  <div>Model: {data.extractionMetadata.model}</div>
                  {data.extractionMetadata.extractionNotes && (
                    <div className="mt-2 text-gray-600">
                      Notes: {data.extractionMetadata.extractionNotes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="offerings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Offerings ({data.offerings?.length || 0})</h3>
              <Button
                onClick={() => setShowManualEntry(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Offering
              </Button>
            </div>
            
            {data.offerings?.map((offering: any, index: number) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div className="font-medium">{offering.name || 'Unnamed Offering'}</div>
                      <div className="text-sm text-gray-600">Type: {offering.type}</div>
                      {offering.basePrice !== null && offering.basePrice !== undefined ? (
                        <Badge variant="outline" className="text-green-600">
                          ${offering.basePrice}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          Price TBD
                        </Badge>
                      )}
                      {offering.description && (
                        <p className="text-sm">{offering.description}</p>
                      )}
                      {offering.requirements?.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Requirements:</span>
                          <ul className="list-disc list-inside mt-1">
                            {offering.requirements.map((req: string, i: number) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => removeOffering(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!data.offerings || data.offerings.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No offerings found. Click "Add Offering" to manually add one.
              </div>
            )}
          </TabsContent>

          <TabsContent value="websites" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Websites ({data.websites?.length || 0})</h3>
              <Button
                onClick={addDomain}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Website
              </Button>
            </div>
            
            {data.websites?.map((website: any, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                <Input
                  value={website.domain || ''}
                  onChange={(e) => updateDomain(index, e.target.value)}
                  placeholder="example.com"
                  className="flex-1"
                />
                <Button
                  onClick={() => removeDomain(index)}
                  size="sm"
                  variant="destructive"
                  title="Remove this domain"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
            
            {(!data.websites || data.websites.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No websites found. Click "Add Website" to manually add one.
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Raw Email Content</h3>
              <Button
                onClick={() => copyToClipboard(draft.raw_content || draft.html_content || '')}
                size="sm"
                variant="outline"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              <pre className="text-xs whitespace-pre-wrap">
                {draft.raw_content || draft.html_content || 'No raw content available'}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Review Notes */}
        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium">Review Notes</label>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add any notes about this draft..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Draft
              </Button>
            )}
            <Button
              onClick={handleReject}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>

      {/* JSON Editor Dialog */}
      <Dialog open={showJsonEditor} onOpenChange={setShowJsonEditor}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>JSON Editor</DialogTitle>
            <DialogDescription>
              Edit the raw JSON data. Be careful - invalid JSON will be rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={jsonEditValue}
              onChange={(e) => setJsonEditValue(e.target.value)}
              className="font-mono text-xs h-96"
            />
            {jsonError && (
              <div className="text-red-600 text-sm">{jsonError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJsonEditor(false)}>
              Cancel
            </Button>
            <Button onClick={saveJsonEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Offering Manually</DialogTitle>
            <DialogDescription>
              Manually add an offering when AI extraction fails
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newOffering.name}
                onChange={(e) => setNewOffering({ ...newOffering, name: e.target.value })}
                placeholder="e.g., Guest Post on Tech Blog"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={newOffering.type}
                onValueChange={(value) => setNewOffering({ ...newOffering, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Guest Post">Guest Post</SelectItem>
                  <SelectItem value="Link Insertion">Link Insertion</SelectItem>
                  <SelectItem value="Sponsored Content">Sponsored Content</SelectItem>
                  <SelectItem value="Banner Ad">Banner Ad</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Base Price (optional)</label>
              <Input
                type="number"
                value={newOffering.basePrice}
                onChange={(e) => setNewOffering({ ...newOffering, basePrice: e.target.value })}
                placeholder="e.g., 150"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newOffering.description}
                onChange={(e) => setNewOffering({ ...newOffering, description: e.target.value })}
                placeholder="Describe the offering..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Requirements (comma-separated)</label>
              <Input
                value={newOffering.requirements}
                onChange={(e) => setNewOffering({ ...newOffering, requirements: e.target.value })}
                placeholder="e.g., 500+ words, 2 backlinks max, tech niche"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>
              Cancel
            </Button>
            <Button onClick={addOffering}>
              Add Offering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}