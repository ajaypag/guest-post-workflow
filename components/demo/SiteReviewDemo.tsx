'use client';

import { useState } from 'react';
import { Check, X, Info, Target, TrendingUp, DollarSign, ExternalLink } from 'lucide-react';

const sampleSites = [
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
    status: 'pending'
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
    status: 'pending'
  },
  {
    id: '3',
    domain: 'innovationhub.net',
    dr: 45,
    traffic: '12.3K',
    price: 145,
    qualification: 'good_quality',
    overlap: 'Related',
    authorityDirect: 'N/A',
    reasoning: 'Related industry authority, good for broader tech topics.',
    status: 'pending'
  }
];

export default function SiteReviewDemo() {
  const [sites, setSites] = useState(sampleSites);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const handleApprove = (siteId: string) => {
    setSites(prev => prev.map(site => 
      site.id === siteId ? { ...site, status: 'approved' } : site
    ));
  };

  const handleReject = (siteId: string) => {
    setSites(prev => prev.map(site => 
      site.id === siteId ? { ...site, status: 'rejected' } : site
    ));
  };

  const handleBulkApprove = () => {
    setSites(prev => prev.map(site => ({ ...site, status: 'approved' })));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Site Recommendations</h3>
              <p className="text-sm text-gray-600 mt-1">
                These sites passed 5D AI analysis and expert review
              </p>
            </div>
            <button 
              onClick={handleBulkApprove}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve All
            </button>
          </div>
        </div>

        {/* Sites Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Analysis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sites.map(site => (
                <tr 
                  key={site.id}
                  className={`
                    transition-colors
                    ${site.status === 'approved' ? 'bg-green-50' : 
                      site.status === 'rejected' ? 'bg-red-50' : 
                      'hover:bg-gray-50'}
                  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <a 
                        href="#" 
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        onMouseEnter={() => setSelectedSite(site.id)}
                        onMouseLeave={() => setSelectedSite(null)}
                      >
                        {site.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {selectedSite === site.id && (
                        <Info className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">DR:</span>
                        <span className="font-semibold text-gray-900">{site.dr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Traffic:</span>
                        <span className="font-semibold text-gray-900">{site.traffic}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${site.qualification === 'high_quality' ? 'bg-green-100 text-green-700' : 
                            'bg-yellow-100 text-yellow-700'}
                        `}>
                          <Target className="w-3 h-3 mr-1" />
                          {site.overlap}
                        </span>
                        {site.authorityDirect !== 'N/A' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {site.authorityDirect}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 max-w-xs">
                        {site.reasoning}
                      </p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900">
                      ${site.price}
                    </div>
                    <div className="text-xs text-gray-500">
                      + $79 content
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {site.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleApprove(site.id)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleReject(site.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : site.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
                        <Check className="w-4 h-4" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
                        <X className="w-4 h-4" />
                        Rejected
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">3 sites</span> recommended • 
              <span className="font-semibold text-green-600 ml-2">
                {sites.filter(s => s.status === 'approved').length} approved
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Total cost: </span>
              <span className="font-bold text-gray-900">
                ${sites.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.price + 79, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}