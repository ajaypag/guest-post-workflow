import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { websites, publisherWebsites } from '@/lib/db/schema';
import { publisherOfferingRelationships, publisherOfferings } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/schema';
import { emailProcessingLogs, publisherAutomationLogs, manyreachCampaignImports } from '@/lib/db/emailProcessingSchema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, Users, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, Edit, ExternalLink, Package, Clock, FileText, Mail, Bot, TrendingUp } from 'lucide-react';
import PublisherActions from './PublisherActions';

interface OfferingAttributes {
  acceptsDoFollow?: boolean;
  requiresAuthorBio?: boolean;
  maxLinksPerPost?: number;
  contentRequirements?: string;
  prohibitedTopics?: string;
  requiredElements?: string[];
  samplePostUrl?: string;
  authorBioRequirements?: string;
  linkRequirements?: string;
  imagesRequired?: boolean;
  minImages?: number;
}

async function getWebsiteDetails(id: string) {
  const website = await db
    .select()
    .from(websites)
    .where(eq(websites.id, id))
    .limit(1);

  if (!website.length) {
    return null;
  }

  // Get unique publisher relationships for this website (using publisher_websites to avoid duplicates)
  const publisherRelationships = await db
    .selectDistinctOn([publisherWebsites.publisherId], {
      relationshipId: publisherWebsites.id,
      publisherId: publisherWebsites.publisherId,
      publisherName: publishers.companyName,
      publisherEmail: publishers.email,
      relationshipType: publisherOfferingRelationships.relationshipType,
      verificationStatus: publisherOfferingRelationships.verificationStatus,
      priorityRank: publisherOfferingRelationships.priorityRank,
      isPreferred: publisherOfferingRelationships.isPreferred,
      createdAt: publisherWebsites.addedAt,
    })
    .from(publisherWebsites)
    .leftJoin(publishers, eq(publisherWebsites.publisherId, publishers.id))
    .leftJoin(
      publisherOfferingRelationships,
      and(
        eq(publisherWebsites.publisherId, publisherOfferingRelationships.publisherId),
        eq(publisherWebsites.websiteId, publisherOfferingRelationships.websiteId)
      )
    )
    .where(eq(publisherWebsites.websiteId, id))
    .orderBy(publisherWebsites.publisherId, publisherWebsites.addedAt);

  // Get offerings for this website with complete data
  const offerings = await db
    .select({
      id: publisherOfferings.id,
      offeringType: publisherOfferings.offeringType,
      offeringName: publisherOfferings.offeringName,
      basePrice: publisherOfferings.basePrice,
      currency: publisherOfferings.currency,
      turnaroundDays: publisherOfferings.turnaroundDays,
      minWordCount: publisherOfferings.minWordCount,
      maxWordCount: publisherOfferings.maxWordCount,
      niches: publisherOfferings.niches,
      languages: publisherOfferings.languages,
      currentAvailability: publisherOfferings.currentAvailability,
      expressAvailable: publisherOfferings.expressAvailable,
      expressPrice: publisherOfferings.expressPrice,
      expressDays: publisherOfferings.expressDays,
      attributes: publisherOfferings.attributes,
      isActive: publisherOfferings.isActive,
      publisherId: publisherOfferings.publisherId,
      publisherName: publishers.companyName,
    })
    .from(publisherOfferings)
    .innerJoin(
      publisherOfferingRelationships,
      eq(publisherOfferings.id, publisherOfferingRelationships.offeringId)
    )
    .leftJoin(
      publishers,
      eq(publisherOfferings.publisherId, publishers.id)
    )
    .where(eq(publisherOfferingRelationships.websiteId, id));

  // Get automation insights for this website
  const emailLogs = await db
    .select({
      id: emailProcessingLogs.id,
      campaignName: emailProcessingLogs.campaignName,
      emailFrom: emailProcessingLogs.emailFrom,
      emailSubject: emailProcessingLogs.emailSubject,
      status: emailProcessingLogs.status,
      qualificationStatus: emailProcessingLogs.qualificationStatus,
      receivedAt: emailProcessingLogs.receivedAt,
      confidenceScore: emailProcessingLogs.confidenceScore,
      rawContent: emailProcessingLogs.rawContent,
      htmlContent: emailProcessingLogs.htmlContent,
      parsedData: emailProcessingLogs.parsedData,
    })
    .from(emailProcessingLogs)
    .where(sql`LOWER(${emailProcessingLogs.emailFrom}) LIKE '%' || LOWER(${website[0]?.domain}) || '%'`)
    .orderBy(desc(emailProcessingLogs.receivedAt))
    .limit(10);

  // Get ManyReach campaign imports related to this domain
  const campaignImports = await db
    .select({
      id: manyreachCampaignImports.id,
      campaignName: manyreachCampaignImports.campaignName,
      workspaceName: manyreachCampaignImports.workspaceName,
      lastImportAt: manyreachCampaignImports.lastImportAt,
      totalReplied: manyreachCampaignImports.totalReplied,
      totalImported: manyreachCampaignImports.totalImported,
    })
    .from(manyreachCampaignImports)
    .orderBy(desc(manyreachCampaignImports.lastImportAt))
    .limit(5);

  return {
    website: website[0],
    publishers: publisherRelationships,
    offerings,
    emailLogs,
    campaignImports,
  };
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    verified: { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'Verified' },
    claimed: { icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800', label: 'Claimed' },
    pending: { icon: AlertCircle, className: 'bg-orange-100 text-orange-800', label: 'Pending' },
    rejected: { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Rejected' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RelationshipTypeBadge({ type }: { type: string }) {
  const typeConfig = {
    owner: { className: 'bg-purple-100 text-purple-800', label: 'Owner' },
    editor: { className: 'bg-blue-100 text-blue-800', label: 'Editor' },
    contributor: { className: 'bg-indigo-100 text-indigo-800', label: 'Contributor' },
    contact: { className: 'bg-gray-100 text-gray-800', label: 'Contact' },
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.contact;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default async function WebsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWebsiteDetails(id);

  if (!data) {
    notFound();
  }

  const { website, publishers, offerings, emailLogs, campaignImports } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/internal/websites"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Websites
          </Link>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Website Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{website.domain}</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href={`/internal/websites/${id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
                <a
                  href={`https://${website.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Site
                </a>
              </div>
            </div>
          </div>

          {/* Offerings Section */}
          {offerings && offerings.length > 0 ? (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Offerings ({offerings.length})</h2>
              <div className="space-y-6">
                {offerings.map((offering) => (
                  <div key={offering.id} className="border rounded-lg p-6">
                    {/* Offering Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Package className="w-5 h-5 text-gray-400" />
                          <h3 className="font-semibold text-lg text-gray-900">
                            {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          {offering.isActive === false && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        {offering.offeringName && (
                          <p className="text-sm text-gray-600">{offering.offeringName}</p>
                        )}
                        {offering.publisherName && (
                          <p className="text-xs text-gray-500 mt-1">by {offering.publisherName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {offering.basePrice ? `$${(offering.basePrice / 100).toFixed(2)}` : 'Price on request'}
                        </p>
                        <p className="text-xs text-gray-500">{offering.currency || 'USD'}</p>
                      </div>
                    </div>
                    
                    {/* Core Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Turnaround Time</dt>
                        <dd className="text-sm font-medium text-gray-900">{offering.turnaroundDays || 'N/A'} days</dd>
                      </div>
                      
                      {offering.minWordCount && (
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Word Count</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {offering.minWordCount}
                            {offering.maxWordCount ? ` - ${offering.maxWordCount}` : '+'} words
                          </dd>
                        </div>
                      )}
                      
                      <div>
                        <dt className="text-xs font-medium text-gray-500">Availability</dt>
                        <dd className="text-sm font-medium text-gray-900 capitalize">
                          {offering.currentAvailability || 'Available'}
                        </dd>
                      </div>
                      
                      {offering.languages && offering.languages.length > 0 && (
                        <div>
                          <dt className="text-xs font-medium text-gray-500">Languages</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {offering.languages.join(', ').toUpperCase()}
                          </dd>
                        </div>
                      )}
                    </div>
                    
                    {/* Niches */}
                    {offering.niches && offering.niches.length > 0 && (
                      <div className="mb-4">
                        <dt className="text-xs font-medium text-gray-500 mb-2">Specializes In</dt>
                        <dd className="flex flex-wrap gap-2">
                          {offering.niches.map((niche, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {niche}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                    
                    {/* Express Service */}
                    {offering.expressAvailable && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-orange-800">Express Service Available</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-orange-700">
                              +${offering.expressPrice ? (offering.expressPrice / 100).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-xs text-orange-600">{offering.expressDays || 'N/A'} days</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Rich Attributes */}
                    {(() => {
                      const attrs = offering.attributes as OfferingAttributes;
                      if (!attrs || Object.keys(attrs).length === 0) return null;
                      
                      return (
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Content Requirements & Guidelines</h4>
                          
                          {/* Quick Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {attrs.acceptsDoFollow && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ DoFollow Links
                              </span>
                            )}
                            {attrs.requiresAuthorBio && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ✓ Author Bio Required
                              </span>
                            )}
                            {attrs.imagesRequired && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                📷 Images Required
                              </span>
                            )}
                            {attrs.maxLinksPerPost && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Max {attrs.maxLinksPerPost} links
                              </span>
                            )}
                          </div>
                          
                          {/* Detailed Requirements */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {attrs.contentRequirements && (
                              <div>
                                <dt className="font-medium text-gray-700">Content Requirements</dt>
                                <dd className="text-gray-600 mt-1">{attrs.contentRequirements}</dd>
                              </div>
                            )}
                            {attrs.prohibitedTopics && (
                              <div>
                                <dt className="font-medium text-gray-700">Prohibited Topics</dt>
                                <dd className="text-gray-600 mt-1">{attrs.prohibitedTopics}</dd>
                              </div>
                            )}
                            {attrs.linkRequirements && (
                              <div>
                                <dt className="font-medium text-gray-700">Link Guidelines</dt>
                                <dd className="text-gray-600 mt-1">{attrs.linkRequirements}</dd>
                              </div>
                            )}
                            {attrs.authorBioRequirements && (
                              <div>
                                <dt className="font-medium text-gray-700">Author Bio</dt>
                                <dd className="text-gray-600 mt-1">{attrs.authorBioRequirements}</dd>
                              </div>
                            )}
                            {attrs.minImages && (
                              <div>
                                <dt className="font-medium text-gray-700">Images</dt>
                                <dd className="text-gray-600 mt-1">Minimum {attrs.minImages} images required</dd>
                              </div>
                            )}
                            {attrs.samplePostUrl && (
                              <div>
                                <dt className="font-medium text-gray-700">Sample Post</dt>
                                <dd className="text-gray-600 mt-1">
                                  <a href={attrs.samplePostUrl} target="_blank" rel="noopener noreferrer" 
                                     className="text-blue-600 hover:text-blue-700 underline">
                                    View example →
                                  </a>
                                </dd>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 border-b border-gray-200 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Offerings Available</h3>
              <p className="text-gray-500">Offerings will appear here once publishers create them for this website</p>
            </div>
          )}

          {/* Automation Insights Section */}
          {(emailLogs.length > 0 || campaignImports.length > 0) && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bot className="w-5 h-5 mr-2 text-blue-500" />
                Automation Insights
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Processing Activity */}
                {emailLogs.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Recent Email Activity ({emailLogs.length})
                    </h3>
                    <div className="space-y-3">
                      {emailLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start justify-between p-3 bg-white rounded border">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">
                                {log.emailFrom}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.status === 'parsed' ? 'bg-green-100 text-green-800' :
                                log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                              {log.qualificationStatus && log.qualificationStatus !== 'pending' && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  log.qualificationStatus === 'qualified' ? 'bg-blue-100 text-blue-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {log.qualificationStatus}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                              {log.campaignName && (
                                <span>Campaign: {log.campaignName}</span>
                              )}
                              {log.receivedAt && (
                                <span>{new Date(log.receivedAt).toLocaleDateString()}</span>
                              )}
                              {log.confidenceScore && (
                                <span>Confidence: {Math.round(parseFloat(log.confidenceScore) * 100)}%</span>
                              )}
                            </div>
                            {log.emailSubject && (
                              <div className="text-xs text-gray-700 mb-2">
                                <strong>Subject:</strong> {log.emailSubject}
                              </div>
                            )}
                            {log.rawContent && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                  View Email Content
                                </summary>
                                <div className="mt-2 p-3 bg-gray-50 border rounded text-xs">
                                  <div className="mb-3">
                                    <div className="font-medium text-gray-900 mb-2">Raw Content:</div>
                                    <pre className="whitespace-pre-wrap text-xs text-gray-700 max-h-40 overflow-y-auto">
                                      {log.rawContent}
                                    </pre>
                                  </div>
                                  {log.parsedData && log.parsedData !== '{}' && (
                                    <div className="border-t pt-3">
                                      <div className="font-medium text-gray-900 mb-2">AI Extracted Data:</div>
                                      <pre className="whitespace-pre-wrap text-xs text-gray-700 max-h-40 overflow-y-auto">
                                        {JSON.stringify(
                                          typeof log.parsedData === 'string' ? JSON.parse(log.parsedData) : log.parsedData, 
                                          null, 
                                          2
                                        )}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                      {emailLogs.length > 5 && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500">+{emailLogs.length - 5} more emails</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ManyReach Campaign Imports */}
                {campaignImports.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      ManyReach Import History ({campaignImports.length})
                    </h3>
                    <div className="space-y-3">
                      {campaignImports.map((campaign) => (
                        <div key={campaign.id} className="p-3 bg-white rounded border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {campaign.campaignName || 'Unnamed Campaign'}
                              </p>
                              <p className="text-xs text-gray-500">{campaign.workspaceName}</p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {campaign.lastImportAt ? new Date(campaign.lastImportAt).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="text-center">
                              <p className="text-lg font-semibold text-blue-600">{campaign.totalReplied || 0}</p>
                              <p className="text-xs text-gray-500">Replied</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-green-600">{campaign.totalImported || 0}</p>
                              <p className="text-xs text-gray-500">Imported</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              {(emailLogs.length > 0 || campaignImports.length > 0) && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{emailLogs.length}</p>
                      <p className="text-xs text-gray-500">Email Interactions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {emailLogs.filter(log => log.qualificationStatus === 'qualified').length}
                      </p>
                      <p className="text-xs text-gray-500">Qualified Leads</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{campaignImports.length}</p>
                      <p className="text-xs text-gray-500">Active Campaigns</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {campaignImports.reduce((sum, c) => sum + (c.totalImported || 0), 0)}
                      </p>
                      <p className="text-xs text-gray-500">Total Imported</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metrics Grid */}
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Domain Rating</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.domainRating || '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Traffic</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.totalTraffic ? website.totalTraffic.toLocaleString() : '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.guestPostCost ? `$${(website.guestPostCost / 100).toFixed(2)}` : '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Publisher Tier</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.publisherTier || 'Standard'}
              </dd>
            </div>
          </div>

          {/* Website Details */}
          <div className="px-6 py-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Website Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {website.categories && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Categories</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {Array.isArray(website.categories) ? website.categories.join(', ') : website.categories}
                  </dd>
                </div>
              )}
              {website.niche && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Niches</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(website.niche) ? website.niche.map((n, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {n}
                        </span>
                      )) : (
                        <span className="text-sm text-gray-900">{website.niche}</span>
                      )}
                      {Array.isArray(website.niche) && website.niche.length > 3 && (
                        <span className="text-xs text-gray-500">+{website.niche.length - 3} more</span>
                      )}
                    </div>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Language</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.websiteLanguage || 'English'}
                </dd>
              </div>
              {website.targetAudience && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Target Audience</dt>
                  <dd className="mt-1 text-sm text-gray-900">{website.targetAudience}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    website.status === 'active' ? 'bg-green-100 text-green-800' :
                    website.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {website.status || 'Unknown'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Added Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(website.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
            
            {/* Content Guidelines URLs */}
            {(website.editorialCalendarUrl || website.contentGuidelinesUrl) && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Content Guidelines</h3>
                <div className="flex flex-wrap gap-3">
                  {website.editorialCalendarUrl && (
                    <a href={website.editorialCalendarUrl} target="_blank" rel="noopener noreferrer" 
                       className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      <Calendar className="w-4 h-4 mr-2" />
                      Editorial Calendar
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  )}
                  {website.contentGuidelinesUrl && (
                    <a href={website.contentGuidelinesUrl} target="_blank" rel="noopener noreferrer" 
                       className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                      <FileText className="w-4 h-4 mr-2" />
                      Content Guidelines
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Publisher Relationships */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Publisher Relationships ({publishers.length})
              </h2>
              <Link
                href={`/internal/relationships/assign?websiteId=${id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Users className="w-3 h-3 mr-1" />
                Assign Publisher
              </Link>
            </div>

            {publishers.length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Publisher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {publishers.map((pub) => (
                      <tr key={pub.relationshipId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pub.publisherName || 'Unknown Publisher'}
                            </div>
                            <div className="text-sm text-gray-500">{pub.publisherEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <RelationshipTypeBadge type={pub.relationshipType || 'contact'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={pub.verificationStatus || 'pending'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {pub.isPreferred && (
                              <span className="mr-2 text-yellow-500">★</span>
                            )}
                            {pub.priorityRank || 100}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pub.createdAt
                            ? new Date(pub.createdAt).toLocaleDateString()
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <PublisherActions 
                            relationshipId={pub.relationshipId}
                            publisherId={pub.publisherId || ''}
                            publisherName={pub.publisherName || 'Unknown Publisher'}
                            websiteId={id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No publishers assigned to this website</p>
                <p className="text-sm">Assign a publisher to manage this website's content</p>
              </div>
            )}
          </div>

          {/* Internal Notes */}
          {website.internalNotes && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Internal Notes</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-gray-700">{website.internalNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}