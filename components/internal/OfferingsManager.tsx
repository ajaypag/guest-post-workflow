import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagSelector } from '@/components/ui/TagSelector';
import { 
  DollarSign, 
  Clock, 
  FileText, 
  Zap, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save,
  X,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

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

interface OfferingsManagerProps {
  offerings: PublisherOffering[];
  onUpdate: (offerings: PublisherOffering[]) => void;
  availableNiches?: string[];
  className?: string;
}

export function OfferingsManager({
  offerings,
  onUpdate,
  availableNiches = [],
  className = ''
}: OfferingsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<PublisherOffering>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleEdit = (offering: PublisherOffering) => {
    // Ensure prohibitedTopics is an array when editing
    const editData = {
      ...offering,
      attributes: {
        ...offering.attributes,
        prohibitedTopics: offering.attributes?.prohibitedTopics
          ? Array.isArray(offering.attributes.prohibitedTopics)
            ? offering.attributes.prohibitedTopics
            : typeof offering.attributes.prohibitedTopics === 'string'
            ? offering.attributes.prohibitedTopics.split(',').map((t: string) => t.trim()).filter(Boolean)
            : []
          : []
      }
    };
    
    setEditingId(offering.id);
    setEditingData(editData);
    setExpandedId(offering.id); // Auto-expand when editing
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    setSavingId(editingId);
    try {
      // Call API to persist changes
      const response = await fetch(`/api/internal/offerings/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingData),
      });

      if (!response.ok) {
        throw new Error('Failed to update offering');
      }

      const result = await response.json();
      
      // Update local state with the returned offering
      const updatedOfferings = offerings.map(offering => 
        offering.id === editingId ? { ...offering, ...result.offering } : offering
      );
      
      onUpdate(updatedOfferings);
      setEditingId(null);
      setEditingData({});
    } catch (error) {
      console.error('Error saving offering:', error);
      alert('Failed to save offering. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleToggleActive = async (id: string) => {
    const offering = offerings.find(o => o.id === id);
    if (!offering) return;

    try {
      const response = await fetch(`/api/internal/offerings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...offering,
          isActive: !offering.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle offering status');
      }

      const result = await response.json();
      
      const updatedOfferings = offerings.map(o =>
        o.id === id ? { ...o, ...result.offering } : o
      );
      onUpdate(updatedOfferings);
    } catch (error) {
      console.error('Error toggling offering status:', error);
      alert('Failed to update offering status. Please try again.');
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100); // Convert from cents
  };

  const getOfferingTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'guest_post':
        return <FileText className="w-4 h-4" />;
      case 'link_insertion':
        return <Globe className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getAvailabilityBadge = (availability: string) => {
    switch (availability.toLowerCase()) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'limited':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Limited</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Unavailable</Badge>;
      default:
        return <Badge variant="secondary">{availability}</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Offerings Management ({offerings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offerings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No offerings found</p>
            <p className="text-sm">Publisher offerings will appear here when available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offerings.map((offering) => (
              <div
                key={offering.id}
                className={`border rounded-lg p-4 transition-all ${
                  !offering.isActive ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getOfferingTypeIcon(offering.offeringType)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {offering.offeringName || offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(offering.basePrice, offering.currency)}
                        </span>
                        {getAvailabilityBadge(offering.currentAvailability)}
                        {!offering.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === offering.id ? null : offering.id)}
                    >
                      {expandedId === offering.id ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(offering.id)}
                      className={offering.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {offering.isActive ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                    {editingId === offering.id ? (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleSave}
                          disabled={savingId === offering.id}
                        >
                          {savingId === offering.id ? (
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancel}
                          disabled={savingId === offering.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(offering)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{offering.turnaroundDays} days</span>
                  </div>

                  {offering.offeringType === 'guest_post' && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>{offering.minWordCount}-{offering.maxWordCount} words</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>{offering.languages?.join(', ') || 'English'}</span>
                  </div>

                  {offering.expressAvailable && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-700 font-medium">
                        Express: {offering.expressPrice ? formatPrice(offering.expressPrice) : 'N/A'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Publisher: {offering.publisherName}
                </div>

                {/* Expanded Details */}
                {expandedId === offering.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {editingId === offering.id ? (
                      <div className="space-y-6">
                        {/* Basic Pricing */}
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Pricing & Availability
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs">Base Price ($)</Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={(editingData.basePrice || 0) / 100}
                                  onChange={(e) => setEditingData({ 
                                    ...editingData, 
                                    basePrice: Math.round(parseFloat(e.target.value) * 100) || 0 
                                  })}
                                  className="h-8 text-sm pl-6"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Currency</Label>
                              <select
                                value={editingData.currency || 'USD'}
                                onChange={(e) => setEditingData({ ...editingData, currency: e.target.value })}
                                className="w-full h-8 text-sm border border-gray-300 rounded-md px-2"
                              >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                              </select>
                            </div>

                            <div>
                              <Label className="text-xs">Availability</Label>
                              <select
                                value={editingData.currentAvailability || 'available'}
                                onChange={(e) => setEditingData({ ...editingData, currentAvailability: e.target.value })}
                                className="w-full h-8 text-sm border border-gray-300 rounded-md px-2"
                              >
                                <option value="available">Available</option>
                                <option value="limited">Limited</option>
                                <option value="unavailable">Unavailable</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Timing */}
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Timing
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Standard Turnaround (days)</Label>
                              <Input
                                type="number"
                                value={editingData.turnaroundDays || ''}
                                onChange={(e) => setEditingData({ ...editingData, turnaroundDays: parseInt(e.target.value) || 0 })}
                                className="h-8 text-sm"
                                placeholder="7"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="expressAvailable"
                                checked={editingData.expressAvailable || false}
                                onChange={(e) => setEditingData({ ...editingData, expressAvailable: e.target.checked })}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor="expressAvailable" className="text-xs flex items-center gap-2 cursor-pointer">
                                <Zap className="w-3 h-3 text-yellow-500" />
                                Express Service Available
                              </Label>
                            </div>

                            {editingData.expressAvailable && (
                              <>
                                <div>
                                  <Label className="text-xs">Express Price ($)</Label>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">+$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={(editingData.expressPrice || 0) / 100}
                                      onChange={(e) => setEditingData({ 
                                        ...editingData, 
                                        expressPrice: Math.round(parseFloat(e.target.value) * 100) || 0 
                                      })}
                                      className="h-8 text-sm pl-7"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs">Express Turnaround (days)</Label>
                                  <Input
                                    type="number"
                                    value={editingData.expressDays || ''}
                                    onChange={(e) => setEditingData({ ...editingData, expressDays: parseInt(e.target.value) || 0 })}
                                    className="h-8 text-sm"
                                    placeholder="2"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Content Requirements (for guest posts) */}
                        {editingData.offeringType === 'guest_post' && (
                          <div>
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Content Requirements
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Min Word Count</Label>
                                <Input
                                  type="number"
                                  value={editingData.minWordCount || ''}
                                  onChange={(e) => setEditingData({ ...editingData, minWordCount: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                  placeholder="500"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Max Word Count</Label>
                                <Input
                                  type="number"
                                  value={editingData.maxWordCount || ''}
                                  onChange={(e) => setEditingData({ ...editingData, maxWordCount: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-sm"
                                  placeholder="2000"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prohibited Content */}
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            Prohibited Topics & Content
                          </h4>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {[
                                'CBD', 'Cannabis', 'Casino', 'Gambling', 'Adult Content', 'Pornography',
                                'Cryptocurrency', 'Binary Options', 'Forex Trading', 'Get Rich Quick',
                                'MLM', 'Weight Loss Pills', 'Pharmaceuticals', 'Payday Loans',
                                'Weapons', 'Violence', 'Hate Speech', 'Political Content'
                              ].map(topic => {
                                const isSelected = editingData.attributes?.prohibitedTopics?.includes(topic);
                                return (
                                  <button
                                    key={topic}
                                    type="button"
                                    onClick={() => {
                                      const currentTopics = editingData.attributes?.prohibitedTopics || [];
                                      const updatedTopics = isSelected
                                        ? currentTopics.filter((t: string) => t !== topic)
                                        : [...currentTopics, topic];
                                      setEditingData({
                                        ...editingData,
                                        attributes: {
                                          ...editingData.attributes,
                                          prohibitedTopics: updatedTopics
                                        }
                                      });
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                      isSelected
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {topic}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-500">
                              Click topics to mark them as prohibited for this offering
                            </p>
                          </div>
                        </div>

                        {/* Languages */}
                        <div>
                          <h4 className="font-medium text-sm mb-3">Accepted Languages</h4>
                          <div className="flex flex-wrap gap-2">
                            {['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ar'].map(lang => (
                              <label key={lang} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={(editingData.languages || []).includes(lang)}
                                  onChange={(e) => {
                                    const languages = editingData.languages || [];
                                    if (e.target.checked) {
                                      setEditingData({ ...editingData, languages: [...languages, lang] });
                                    } else {
                                      setEditingData({ ...editingData, languages: languages.filter(l => l !== lang) });
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm">{lang.toUpperCase()}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Prohibited Topics */}
                        {offering.attributes?.prohibitedTopics && offering.attributes.prohibitedTopics.length > 0 && (
                          <div>
                            <Label className="text-xs text-gray-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              Prohibited Topics:
                            </Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(Array.isArray(offering.attributes.prohibitedTopics) 
                                ? offering.attributes.prohibitedTopics 
                                : [offering.attributes.prohibitedTopics]
                              ).map((topic: string, idx: number) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {offering.languages && offering.languages.length > 0 && (
                          <div>
                            <Label className="text-xs text-gray-600">Accepted Languages:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {offering.languages.map(lang => (
                                <Badge key={lang} variant="outline" className="text-xs">
                                  {lang.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {offering.expressAvailable && (
                          <div>
                            <Label className="text-xs text-gray-600">Express Service:</Label>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm">
                                Price: {offering.expressPrice ? formatPrice(offering.expressPrice) : 'Not set'}
                              </span>
                              <span className="text-sm">
                                Days: {offering.expressDays || 'Not set'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Other Attributes (excluding prohibitedTopics) */}
                        {offering.attributes && Object.keys(offering.attributes).filter(k => k !== 'prohibitedTopics').length > 0 && (
                          <div>
                            <Label className="text-xs text-gray-600">Additional Settings:</Label>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(
                                Object.fromEntries(
                                  Object.entries(offering.attributes).filter(([k]) => k !== 'prohibitedTopics')
                                ), 
                                null, 
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Total: {offerings.length} offerings • 
            Active: {offerings.filter(o => o.isActive).length} • 
            Guest Posts: {offerings.filter(o => o.offeringType === 'guest_post').length} • 
            Link Insertions: {offerings.filter(o => o.offeringType === 'link_insertion').length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}