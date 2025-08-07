'use client';

import { useState } from 'react';
import { Check, X, Info, Target, TrendingUp, DollarSign, ExternalLink, ChevronDown, ChevronRight, Users, Sparkles, RefreshCw } from 'lucide-react';

// Order groups to show the grouping functionality
const orderGroups = [
  {
    id: 'group-1',
    clientName: 'TechFlow Solutions',
    linkCount: 2,
    sites: [
      {
        id: '1',
        domain: 'techinsights.io',
        dr: 68,
        traffic: '45.2K',
        price: 285,
        qualification: 'high_quality',
        overlap: 'Both',
        authorityDirect: 'Strong',
        reasoning: 'Ranks positions 1-30 for "AI automation" and related terms. Strong topical authority.',
        status: 'pending',
        targetPage: 'https://techflow.com/ai-automation',
        anchorText: 'AI automation platform'
      },
      {
        id: '2',
        domain: 'cloudcomputing.blog',
        dr: 52,
        traffic: '28.7K',
        price: 195,
        qualification: 'high_quality',
        overlap: 'Direct',
        authorityDirect: 'Moderate',
        reasoning: 'Direct match for cloud computing keywords, positions 31-60.',
        status: 'pending',
        targetPage: 'https://techflow.com/cloud-solutions',
        anchorText: 'cloud migration services'
      }
    ],
    alternatives: [
      { id: 'alt-1', domain: 'enterprisetech.net', dr: 61, traffic: '32.1K', price: 245 },
      { id: 'alt-2', domain: 'aiweekly.com', dr: 55, traffic: '28.9K', price: 215 },
      { id: 'alt-3', domain: 'techtrends.io', dr: 49, traffic: '19.3K', price: 175 }
    ]
  },
  {
    id: 'group-2',
    clientName: 'HealthHub Wellness',
    linkCount: 1,
    sites: [
      {
        id: '3',
        domain: 'wellnessjournal.org',
        dr: 58,
        traffic: '38.7K',
        price: 225,
        qualification: 'high_quality',
        overlap: 'Both',
        authorityDirect: 'Strong',
        reasoning: 'Strong authority in health and wellness niche. Perfect match.',
        status: 'pending',
        targetPage: 'https://healthhub.com/nutrition-guide',
        anchorText: 'nutrition planning guide'
      }
    ],
    alternatives: [
      { id: 'alt-4', domain: 'healthylivingmag.com', dr: 52, traffic: '25.4K', price: 195 },
      { id: 'alt-5', domain: 'nutritioninsights.net', dr: 47, traffic: '18.2K', price: 165 }
    ]
  }
];

export default function SiteReviewDemo() {
  const [groups, setGroups] = useState(orderGroups);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('group-1');
  const [showAlternatives, setShowAlternatives] = useState<{ [key: string]: boolean }>({});
  const [selectedAlternative, setSelectedAlternative] = useState<{ [key: string]: string }>({});

  const handleApprove = (groupId: string, siteId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            sites: group.sites.map(site => 
              site.id === siteId ? { ...site, status: 'approved' } : site
            )
          }
        : group
    ));
  };

  const handleReject = (groupId: string, siteId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            sites: group.sites.map(site => 
              site.id === siteId ? { ...site, status: 'rejected' } : site
            )
          }
        : group
    ));
    // Show alternatives dropdown when rejecting
    setShowAlternatives(prev => ({ ...prev, [siteId]: true }));
  };

  const handleSelectAlternative = (groupId: string, siteId: string, altDomain: string) => {
    setSelectedAlternative(prev => ({ ...prev, [siteId]: altDomain }));
    // Simulate replacing the site
    setTimeout(() => {
      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? {
              ...group,
              sites: group.sites.map(site => 
                site.id === siteId 
                  ? { ...site, domain: altDomain, status: 'approved' } 
                  : site
              )
            }
          : group
      ));
      setShowAlternatives(prev => ({ ...prev, [siteId]: false }));
    }, 500);
  };

  const getTotalApproved = () => {
    return groups.reduce((sum, group) => 
      sum + group.sites.filter(s => s.status === 'approved').length, 0
    );
  };

  const getTotalCost = () => {
    return groups.reduce((sum, group) => 
      sum + group.sites.filter(s => s.status === 'approved').reduce((gSum, site) => gSum + site.price + 79, 0), 0
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Review by Client</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sites grouped by client with alternatives available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{getTotalApproved()}</span> of{' '}
                <span className="font-semibold">{groups.reduce((sum, g) => sum + g.linkCount, 0)}</span> approved
              </span>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
                <Check className="w-4 h-4" />
                Approve All
              </button>
            </div>
          </div>
        </div>

        {/* Order Groups */}
        <div className="divide-y divide-gray-200">
          {groups.map(group => (
            <div key={group.id} className="bg-white">
              {/* Group Header */}
              <div 
                className="px-6 py-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedGroup === group.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-semibold text-gray-900">{group.clientName}</span>
                    <span className="ml-3 text-sm text-gray-500">
                      {group.linkCount} {group.linkCount === 1 ? 'link' : 'links'} ordered
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    Package price: <span className="font-semibold text-gray-900">${group.sites[0].price + 79}</span>
                  </span>
                  {group.sites.every(s => s.status === 'approved') && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Check className="w-3 h-3" />
                      All Approved
                    </span>
                  )}
                </div>
              </div>

              {/* Group Sites */}
              {expandedGroup === group.id && (
                <div className="px-6 py-4 space-y-4">
                  {group.sites.map((site, index) => (
                    <div key={site.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Link Details */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">Link {index + 1}:</span>
                            <span className="text-sm text-blue-600">{site.targetPage}</span>
                            <span className="text-sm text-gray-400">→</span>
                            <span className="text-sm text-gray-700 italic">"{site.anchorText}"</span>
                          </div>

                          {/* Site Info */}
                          <div className="flex items-center gap-4 mb-3">
                            <a href="#" className="text-lg font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              {site.domain}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <span className="text-sm text-gray-500">DR: {site.dr}</span>
                            <span className="text-sm text-gray-500">Traffic: {site.traffic}</span>
                            <span className="text-sm font-semibold text-gray-900">${site.price}</span>
                          </div>

                          {/* AI Analysis */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                              ${site.qualification === 'high_quality' ? 'bg-green-100 text-green-700' : 
                                'bg-yellow-100 text-yellow-700'}
                            `}>
                              <Target className="w-3 h-3 mr-1" />
                              {site.overlap} overlap
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {site.authorityDirect} authority
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Qualified
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{site.reasoning}</p>

                          {/* Alternatives Dropdown */}
                          {showAlternatives[site.id] && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <RefreshCw className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">
                                  Select an alternative site:
                                </span>
                              </div>
                              <select 
                                className="w-full text-sm border-gray-300 rounded-md"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSelectAlternative(group.id, site.id, e.target.value);
                                  }
                                }}
                                value={selectedAlternative[site.id] || ''}
                              >
                                <option value="">Choose from {group.alternatives.length} alternatives...</option>
                                {group.alternatives.map(alt => (
                                  <option key={alt.id} value={alt.domain}>
                                    {alt.domain} (DR: {alt.dr}, Traffic: {alt.traffic}, ${alt.price})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="ml-4">
                          {site.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleApprove(group.id, site.id)}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                title="Approve this site"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleReject(group.id, site.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Reject and see alternatives"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : site.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm">
                              <Check className="w-4 h-4" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium text-sm">
                              <X className="w-4 h-4" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{groups.length} clients</span> • 
              <span className="font-semibold text-green-600 ml-2">
                {getTotalApproved()} sites approved
              </span> • 
              <span className="font-semibold text-yellow-600 ml-2">
                {groups.reduce((sum, g) => sum + g.alternatives.length, 0)} alternatives available
              </span>
            </div>
            <div className="text-lg">
              <span className="text-gray-600">Total cost: </span>
              <span className="font-bold text-gray-900">${getTotalCost()}</span>
              <span className="text-sm text-gray-500 ml-2">(includes $79 content per link)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Callout */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">Granular Control with Alternatives</h4>
            <p className="text-sm text-purple-700">
              Don't like a recommendation? Reject it and instantly see alternatives from the same pool. 
              Every alternative has already passed AI qualification - you're choosing between winners, not gambling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}