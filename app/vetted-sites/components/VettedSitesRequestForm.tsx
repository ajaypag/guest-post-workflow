'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VettedSitesRequestFormProps {
  availableClients: Array<{ id: string; name: string; accountId?: string }>;
  onSubmit: (data: VettedSitesRequestData) => Promise<void>;
  isSubmitting: boolean;
  userType: 'internal' | 'account';
}

interface VettedSitesRequestData {
  targetUrls: string[];
  filters: {
    minDa?: number;
    maxCost?: number;
    topics?: string[];
    keywords?: string[];
    excludeDomains?: string[];
    includeOnlyDomains?: string[];
  };
  notes?: string;
  clientIds?: string[];
}

export default function VettedSitesRequestForm({
  availableClients,
  onSubmit,
  isSubmitting,
  userType
}: VettedSitesRequestFormProps) {
  const [targetUrls, setTargetUrls] = useState<string[]>(['']);
  const [filters, setFilters] = useState({
    minDa: undefined as number | undefined,
    maxCost: undefined as number | undefined,
    topics: [] as string[],
    keywords: [] as string[],
    excludeDomains: [] as string[],
    includeOnlyDomains: [] as string[],
  });
  const [notes, setNotes] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentExcludeDomain, setCurrentExcludeDomain] = useState('');
  const [currentIncludeDomain, setCurrentIncludeDomain] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Add target URL
  const addTargetUrl = () => {
    setTargetUrls([...targetUrls, '']);
  };

  // Remove target URL
  const removeTargetUrl = (index: number) => {
    const newUrls = targetUrls.filter((_, i) => i !== index);
    setTargetUrls(newUrls.length === 0 ? [''] : newUrls);
  };

  // Update target URL
  const updateTargetUrl = (index: number, value: string) => {
    const newUrls = [...targetUrls];
    newUrls[index] = value;
    setTargetUrls(newUrls);
  };

  // Add filter arrays
  const addTopic = () => {
    if (currentTopic.trim() && !filters.topics.includes(currentTopic.trim())) {
      setFilters(prev => ({
        ...prev,
        topics: [...prev.topics, currentTopic.trim()]
      }));
      setCurrentTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setFilters(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topic)
    }));
  };

  const addKeyword = () => {
    if (currentKeyword.trim() && !filters.keywords.includes(currentKeyword.trim())) {
      setFilters(prev => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()]
      }));
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addExcludeDomain = () => {
    if (currentExcludeDomain.trim() && !filters.excludeDomains.includes(currentExcludeDomain.trim())) {
      setFilters(prev => ({
        ...prev,
        excludeDomains: [...prev.excludeDomains, currentExcludeDomain.trim()]
      }));
      setCurrentExcludeDomain('');
    }
  };

  const removeExcludeDomain = (domain: string) => {
    setFilters(prev => ({
      ...prev,
      excludeDomains: prev.excludeDomains.filter(d => d !== domain)
    }));
  };

  const addIncludeDomain = () => {
    if (currentIncludeDomain.trim() && !filters.includeOnlyDomains.includes(currentIncludeDomain.trim())) {
      setFilters(prev => ({
        ...prev,
        includeOnlyDomains: [...prev.includeOnlyDomains, currentIncludeDomain.trim()]
      }));
      setCurrentIncludeDomain('');
    }
  };

  const removeIncludeDomain = (domain: string) => {
    setFilters(prev => ({
      ...prev,
      includeOnlyDomains: prev.includeOnlyDomains.filter(d => d !== domain)
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate target URLs
    const validUrls = targetUrls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) {
      newErrors.push('At least one target URL is required');
    }

    // Validate URL format
    validUrls.forEach((url, index) => {
      try {
        new URL(url.trim());
      } catch {
        newErrors.push(`Target URL ${index + 1} is not a valid URL`);
      }
    });

    // Validate DA range
    if (filters.minDa !== undefined && (filters.minDa < 0 || filters.minDa > 100)) {
      newErrors.push('Minimum DA must be between 0 and 100');
    }

    // Validate cost
    if (filters.maxCost !== undefined && filters.maxCost < 0) {
      newErrors.push('Maximum cost must be positive');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const validUrls = targetUrls.filter(url => url.trim() !== '');
    
    const requestData: VettedSitesRequestData = {
      targetUrls: validUrls,
      filters: {
        minDa: filters.minDa || undefined,
        maxCost: filters.maxCost || undefined,
        topics: filters.topics.length > 0 ? filters.topics : undefined,
        keywords: filters.keywords.length > 0 ? filters.keywords : undefined,
        excludeDomains: filters.excludeDomains.length > 0 ? filters.excludeDomains : undefined,
        includeOnlyDomains: filters.includeOnlyDomains.length > 0 ? filters.includeOnlyDomains : undefined,
      },
      notes: notes.trim() || undefined,
      clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
    };

    await onSubmit(requestData);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Request Vetted Sites Analysis
        </CardTitle>
        <CardDescription>
          Submit your target URLs to get a curated list of high-quality guest post opportunities
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Target URLs */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Target URLs *</Label>
            <p className="text-sm text-gray-600">
              Add the pages you want to promote. We'll find relevant guest post sites for each one.
            </p>
            
            {targetUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://example.com/your-target-page"
                  value={url}
                  onChange={(e) => updateTargetUrl(index, e.target.value)}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                {targetUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTargetUrl(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTargetUrl}
              className="w-fit"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another URL
            </Button>
          </div>

          {/* Client Selection (for internal users with multiple clients) */}
          {userType === 'internal' && availableClients.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Associate with Clients (Optional)</Label>
              <select
                value={selectedClientIds[0] || ''}
                onChange={(e) => setSelectedClientIds(e.target.value ? [e.target.value] : [])}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No specific client</option>
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Quality & Cost Filters</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDa" className="text-sm">Minimum Domain Authority</Label>
                <Input
                  id="minDa"
                  type="number"
                  placeholder="e.g. 30"
                  min="0"
                  max="100"
                  value={filters.minDa || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minDa: e.target.value ? parseInt(e.target.value) : undefined }))}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxCost" className="text-sm">Maximum Cost ($)</Label>
                <Input
                  id="maxCost"
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  value={filters.maxCost || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxCost: e.target.value ? parseInt(e.target.value) : undefined }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Topics of Interest</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Technology, Marketing, Health"
                value={currentTopic}
                onChange={(e) => setCurrentTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTopic}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.topics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-sm">
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-1"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Target Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. SEO tools, content marketing"
                value={currentKeyword}
                onChange={(e) => setCurrentKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addKeyword}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-sm">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-1"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Domain Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exclude Domains */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Exclude Domains</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. competitor.com"
                  value={currentExcludeDomain}
                  onChange={(e) => setCurrentExcludeDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludeDomain())}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addExcludeDomain}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.excludeDomains.map((domain) => (
                  <Badge key={domain} variant="destructive" className="text-sm">
                    {domain}
                    <button
                      type="button"
                      onClick={() => removeExcludeDomain(domain)}
                      className="ml-1 hover:bg-red-600 rounded-full p-1"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Include Only Domains */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Include Only Domains</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. industry-blog.com"
                  value={currentIncludeDomain}
                  onChange={(e) => setCurrentIncludeDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIncludeDomain())}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addIncludeDomain}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.includeOnlyDomains.map((domain) => (
                  <Badge key={domain} variant="outline" className="text-sm">
                    {domain}
                    <button
                      type="button"
                      onClick={() => removeIncludeDomain(domain)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-1"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
            <textarea
              id="notes"
              placeholder="Any specific requirements, preferences, or context about your request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Submitting Request...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}