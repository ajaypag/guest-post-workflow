'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagSelector } from '@/components/ui/TagSelector';
import { PublisherContactsManager } from '@/components/internal/PublisherContactsManager';
import { OfferingsManager } from '@/components/internal/OfferingsManager';
// Using native select elements instead of custom Select component

interface WebsiteMetadata {
  categories: string[];
  niches: string[];
  websiteTypes: string[];
}

interface PublisherOffering {
  id: string;
  offeringType: string;
  offeringName: string;
  basePrice: number;
  currency: string;
  turnaroundDays: number;
  minWordCount: number;
  maxWordCount: number;
  niches: string[];
  languages: string[];
  currentAvailability: string;
  expressAvailable: boolean;
  expressPrice: number | null;
  expressDays: number | null;
  attributes: any;
  isActive: boolean;
  publisherId: string;
  publisherName: string;
}

interface PublisherRelationship {
  id: string;
  publisherId: string;
  isActive: boolean;
  isPrimary: boolean;
  relationshipType: string;
  verificationStatus: string;
  publisherEmail: string;
  publisherName: string;
  publisherCompany: string;
  publisherPhone: string;
  publisherPaymentEmail: string;
  publisherPaymentMethod: string;
  publisherAccountStatus: string;
}

interface Website {
  id: string;
  domain: string;
  domainRating?: number;
  totalTraffic?: number;
  categories?: string[];
  niche?: string[];
  type?: string[];
  websiteType?: string[];
  status?: string;
  hasGuestPost?: boolean;
  hasLinkInsert?: boolean;
  publishedOpportunities?: string;
  overallQuality?: string;
  publisherTier?: string;
  preferredContentTypes?: string[];
  editorialCalendarUrl?: string;
  contentGuidelinesUrl?: string;
  websiteLanguage?: string;
  targetAudience?: string;
  internalNotes?: string;
}

export default function EditWebsitePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [website, setWebsite] = useState<Website | null>(null);
  const [offerings, setOfferings] = useState<PublisherOffering[]>([]);
  const [publisherRelationships, setPublisherRelationships] = useState<PublisherRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);

  // Metadata options from internal systems
  const [metadata, setMetadata] = useState<WebsiteMetadata>({
    categories: [],
    niches: [],
    websiteTypes: []
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Website>>({});

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params;
      setWebsiteId(resolvedParams.id);
    };
    initParams();
  }, [params]);

  useEffect(() => {
    if (websiteId) {
      loadWebsite();
    }
  }, [websiteId]);

  const loadWebsite = async () => {
    if (!websiteId) return;
    
    try {
      const response = await fetch(`/api/internal/websites/${websiteId}`);
      if (!response.ok) {
        throw new Error('Failed to load website');
      }
      const data = await response.json();
      setWebsite(data.website);
      setOfferings(data.offerings || []);
      setPublisherRelationships(data.publisherRelationships || []);
      setMetadata(data.metadata || { categories: [], niches: [], websiteTypes: [] });
      setFormData(data.website);
    } catch (err) {
      setError('Failed to load website data');
      console.error('Error loading website:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!websiteId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/internal/websites/${websiteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update website');
      }

      router.push(`/internal/websites/${websiteId}`);
    } catch (err) {
      setError('Failed to save changes');
      console.error('Error saving website:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof Website, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle tag selector changes
  const handleTagSelectorChange = (field: keyof Website, tags: string[]) => {
    updateFormData(field, tags);
  };

  // Handle publisher relationships update
  const handlePublisherRelationshipsUpdate = (updatedRelationships: PublisherRelationship[]) => {
    setPublisherRelationships(updatedRelationships);
  };

  // Handle offerings update
  const handleOfferingsUpdate = (updatedOfferings: PublisherOffering[]) => {
    setOfferings(updatedOfferings);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading website data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/internal/websites/${websiteId}`}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Website</h1>
            <p className="text-gray-600">{website?.domain}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link href={`/internal/websites/${websiteId}`}>
            <Button variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core website details and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain || ''}
                  onChange={(e) => updateFormData('domain', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status || 'active'}
                  onChange={(e) => updateFormData('status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domainRating">Domain Rating</Label>
                <Input
                  id="domainRating"
                  type="number"
                  value={formData.domainRating || ''}
                  onChange={(e) => updateFormData('domainRating', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div>
                <Label htmlFor="totalTraffic">Monthly Traffic</Label>
                <Input
                  id="totalTraffic"
                  type="number"
                  value={formData.totalTraffic || ''}
                  onChange={(e) => updateFormData('totalTraffic', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories & Niches */}
        <Card>
          <CardHeader>
            <CardTitle>Categories & Niches</CardTitle>
            <CardDescription>Website categorization and topic specialization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="categories">Categories</Label>
              <div className="mt-2">
                <TagSelector
                  availableTags={metadata.categories}
                  selectedTags={Array.isArray(formData.categories) ? formData.categories : []}
                  onChange={(tags) => handleTagSelectorChange('categories', tags)}
                  label="categories"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Connected to internal systems • {metadata.categories.length} options available
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="niche">Niches</Label>
              <div className="mt-2">
                <TagSelector
                  availableTags={metadata.niches}
                  selectedTags={Array.isArray(formData.niche) ? formData.niche : []}
                  onChange={(tags) => handleTagSelectorChange('niche', tags)}
                  label="niches"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Connected to internal systems • {metadata.niches.length} options available
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="websiteType">Website Types</Label>
              <div className="mt-2">
                <TagSelector
                  availableTags={metadata.websiteTypes}
                  selectedTags={Array.isArray(formData.websiteType) ? formData.websiteType : []}
                  onChange={(tags) => handleTagSelectorChange('websiteType', tags)}
                  label="website types"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Connected to internal systems • {metadata.websiteTypes.length} options available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Audience */}
        <Card>
          <CardHeader>
            <CardTitle>Content & Audience</CardTitle>
            <CardDescription>Website content details and audience information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="websiteLanguage">Website Language</Label>
              <Input
                id="websiteLanguage"
                value={formData.websiteLanguage || ''}
                onChange={(e) => updateFormData('websiteLanguage', e.target.value)}
                placeholder="e.g., English, Spanish"
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                value={formData.targetAudience || ''}
                onChange={(e) => updateFormData('targetAudience', e.target.value)}
                placeholder="e.g., Small business owners, Tech enthusiasts"
              />
            </div>

            <div>
              <Label htmlFor="publisherTier">Publisher Tier</Label>
              <select
                id="publisherTier"
                value={formData.publisherTier || 'standard'}
                onChange={(e) => updateFormData('publisherTier', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
                <option value="basic">Basic</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Content Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Content Guidelines</CardTitle>
            <CardDescription>Links to guidelines and editorial information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="editorialCalendarUrl">Editorial Calendar URL</Label>
              <Input
                id="editorialCalendarUrl"
                type="url"
                value={formData.editorialCalendarUrl || ''}
                onChange={(e) => updateFormData('editorialCalendarUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="contentGuidelinesUrl">Content Guidelines URL</Label>
              <Input
                id="contentGuidelinesUrl"
                type="url"
                value={formData.contentGuidelinesUrl || ''}
                onChange={(e) => updateFormData('contentGuidelinesUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Publisher Contacts */}
        <PublisherContactsManager
          publisherRelationships={publisherRelationships}
          onUpdate={handlePublisherRelationshipsUpdate}
        />

        {/* Offerings Management */}
        <OfferingsManager
          offerings={offerings}
          onUpdate={handleOfferingsUpdate}
          availableNiches={metadata.niches}
        />

        {/* Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
            <CardDescription>Internal team notes and observations</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.internalNotes || ''}
              onChange={(e) => updateFormData('internalNotes', e.target.value)}
              placeholder="Add internal notes about this website..."
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}