'use client';

import { useState, useEffect } from 'react';
import { X, Globe, TrendingUp, DollarSign, Mail, Calendar, Tag, Link2, CheckCircle, XCircle, FileText, Users, Clock, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Contact {
  id: string;
  email: string;
  isPrimary: boolean;
  hasPaidGuestPost: boolean;
  hasSwapOption: boolean;
  guestPostCost: number | null;
  requirement: string | null;
  createdAt: string;
}

interface Qualification {
  id: string;
  clientId: string;
  clientName: string;
  qualifiedAt: string;
  qualifiedBy: string;
  qualifiedByName: string;
  status: string;
  notes: string | null;
}

interface Project {
  id: string;
  name: string;
  clientName: string;
  addedAt: string;
  analysisStatus: string;
}

interface Website {
  id: string;
  airtableId: string;
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: number | null;
  categories: string[];
  type: string[];
  status: string;
  hasGuestPost: boolean;
  hasLinkInsert: boolean;
  publishedOpportunities: number;
  overallQuality: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields from Airtable
  domainAuthority?: number | null;
  spamScore?: number | null;
  organicKeywords?: number | null;
  organicTraffic?: number | null;
  referringDomains?: number | null;
  language?: string | null;
  country?: string | null;
  notes?: string | null;
  lastOutreachDate?: string | null;
  // Relations
  contacts: Contact[];
  qualifications: Qualification[];
  projects: Project[];
}

interface WebsiteDetailModalProps {
  websiteId: string;
  isOpen: boolean;
  onClose: () => void;
  onQualify?: (websiteId: string) => void;
}

export default function WebsiteDetailModal({
  websiteId,
  isOpen,
  onClose,
  onQualify
}: WebsiteDetailModalProps) {
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'qualifications' | 'usage'>('overview');

  useEffect(() => {
    if (isOpen && websiteId) {
      loadWebsiteDetails();
    }
  }, [isOpen, websiteId]);

  const loadWebsiteDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/websites/${websiteId}`);
      if (response.ok) {
        const data = await response.json();
        setWebsite(data);
      }
    } catch (error) {
      console.error('Failed to load website details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrafficDisplay = (traffic: number | null) => {
    if (!traffic) return '-';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  };

  const getQualityColor = (quality: string | null) => {
    switch (quality?.toLowerCase()) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-xl pointer-events-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : website ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{website.domain}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-sm px-2 py-1 rounded ${website.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {website.status}
                  </span>
                  {website.overallQuality && (
                    <span className={`text-sm px-2 py-1 rounded ${getQualityColor(website.overallQuality)}`}>
                      {website.overallQuality} Quality
                    </span>
                  )}
                  <a
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Site
                  </a>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'contacts'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Contacts
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {website.contacts.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('qualifications')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'qualifications'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Qualifications
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {website.qualifications.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'usage'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Usage
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {website.projects.length}
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">Domain Rating</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {website.domainRating || '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Monthly Traffic</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {getTrafficDisplay(website.totalTraffic)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Guest Post Cost</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {website.guestPostCost ? `$${website.guestPostCost}` : '-'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Link2 className="w-4 h-4" />
                        <span className="text-sm">Opportunities</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {website.publishedOpportunities}
                      </div>
                    </div>
                  </div>

                  {/* Categories & Access */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {website.categories.length > 0 ? (
                          website.categories.map((cat, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">No categories specified</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Access Types</h3>
                      <div className="flex gap-3">
                        <div className={`flex items-center gap-2 ${website.hasGuestPost ? 'text-green-600' : 'text-gray-400'}`}>
                          {website.hasGuestPost ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          <span>Guest Post</span>
                        </div>
                        <div className={`flex items-center gap-2 ${website.hasLinkInsert ? 'text-green-600' : 'text-gray-400'}`}>
                          {website.hasLinkInsert ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          <span>Link Insert</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  {(website.domainAuthority || website.spamScore || website.organicKeywords) && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Additional Metrics</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {website.domainAuthority && (
                          <div>
                            <span className="text-sm text-gray-600">Domain Authority</span>
                            <div className="text-lg font-medium">{website.domainAuthority}</div>
                          </div>
                        )}
                        {website.spamScore !== null && website.spamScore !== undefined && (
                          <div>
                            <span className="text-sm text-gray-600">Spam Score</span>
                            <div className="text-lg font-medium">{website.spamScore}%</div>
                          </div>
                        )}
                        {website.organicKeywords && (
                          <div>
                            <span className="text-sm text-gray-600">Organic Keywords</span>
                            <div className="text-lg font-medium">{website.organicKeywords.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {website.notes && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Notes</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{website.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Last synced: {format(new Date(website.lastSyncedAt), 'PPp')}</div>
                    <div>Added to database: {format(new Date(website.createdAt), 'PP')}</div>
                  </div>
                </div>
              )}

              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  {website.contacts.length > 0 ? (
                    website.contacts.map((contact) => (
                      <div key={contact.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <Mail className="w-5 h-5 text-gray-400" />
                              <a href={`mailto:${contact.email}`} className="font-medium text-blue-600 hover:text-blue-700">
                                {contact.email}
                              </a>
                              {contact.isPrimary && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="ml-8 mt-2 space-y-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className={`flex items-center gap-1 ${contact.hasPaidGuestPost ? 'text-green-600' : 'text-gray-400'}`}>
                                  {contact.hasPaidGuestPost ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                  Paid Guest Post
                                </span>
                                <span className={`flex items-center gap-1 ${contact.hasSwapOption ? 'text-green-600' : 'text-gray-400'}`}>
                                  {contact.hasSwapOption ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                  Swap Option
                                </span>
                              </div>
                              {contact.guestPostCost && (
                                <div className="text-sm text-gray-600">
                                  Guest Post Cost: <span className="font-medium">${contact.guestPostCost}</span>
                                </div>
                              )}
                              {contact.requirement && (
                                <div className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Requirements:</span> {contact.requirement}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(contact.createdAt), 'PP')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No contacts found for this website
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'qualifications' && (
                <div className="space-y-4">
                  {website.qualifications.length > 0 ? (
                    website.qualifications.map((qual) => (
                      <div key={qual.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-gray-400" />
                              <span className="font-medium">{qual.clientName}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                qual.status === 'qualified' ? 'bg-green-100 text-green-700' :
                                qual.status === 'disqualified' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {qual.status}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              Qualified by {qual.qualifiedByName} on {format(new Date(qual.qualifiedAt), 'PP')}
                            </div>
                            {qual.notes && (
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                {qual.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">This website has not been qualified for any clients yet</p>
                      {onQualify && (
                        <button
                          onClick={() => onQualify(website.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Qualify for Client
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Used in Projects</h3>
                  {website.projects.length > 0 ? (
                    website.projects.map((project) => (
                      <div key={project.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-sm text-gray-600">{project.clientName}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded inline-block ${
                              project.analysisStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              project.analysisStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {project.analysisStatus}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Added {format(new Date(project.addedAt), 'PP')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      This website has not been used in any projects yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Website not found</p>
          </div>
        )}
      </div>
    </div>
  );
}