'use client';

import { useState } from 'react';
import UnifiedOrderTable from '@/components/orders/UnifiedOrderTable';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

// Mock data for testing
const mockOrderGroups = [
  {
    id: 'group-1',
    clientId: 'client-1',
    client: {
      id: 'client-1',
      name: 'Link Building Co.',
      website: 'https://linkbuilding.com'
    },
    linkCount: 3,
    targetPages: [
      { id: 'page-1', url: '/best-link-building-services/' },
      { id: 'page-2', url: '/link-building-strategies/' },
      { id: 'page-3', url: '/quality-backlinks/' }
    ],
    anchorTexts: ['best link building', 'link building strategies', 'quality backlinks'],
    packageType: 'better',
    packagePrice: 279
  },
  {
    id: 'group-2', 
    clientId: 'client-2',
    client: {
      id: 'client-2',
      name: 'SEO Agency',
      website: 'https://seoagency.com'
    },
    linkCount: 2,
    targetPages: [
      { id: 'page-4', url: '/seo-services/' },
      { id: 'page-5', url: '/content-marketing/' }
    ],
    anchorTexts: ['SEO services', 'content marketing'],
    packageType: 'best',
    packagePrice: 349
  }
];

const mockSiteSubmissions = {
  'group-1': [
    {
      id: 'sub-1',
      orderGroupId: 'group-1',
      domainId: 'domain-1',
      domain: { id: 'domain-1', domain: 'example.com' },
      domainRating: 65,
      traffic: 50000,
      price: 279,
      status: 'pending' as const,
      selectionPool: 'primary' as const,
      poolRank: 1,
      metadata: { targetPageUrl: '/best-link-building-services/' }
    },
    {
      id: 'sub-2',
      orderGroupId: 'group-1', 
      domainId: 'domain-2',
      domain: { id: 'domain-2', domain: 'alternative.com' },
      domainRating: 58,
      traffic: 35000,
      price: 250,
      status: 'pending' as const,
      selectionPool: 'alternative' as const,
      poolRank: 1,
      metadata: { targetPageUrl: '/best-link-building-services/' }
    }
  ]
};

export default function TestUnifiedTablePage() {
  const [orderState, setOrderState] = useState<'draft' | 'site_review' | 'in_progress'>('draft');
  const [userType, setUserType] = useState<'internal' | 'external'>('external');
  const [isPaid, setIsPaid] = useState(false);
  const [orderGroups, setOrderGroups] = useState(mockOrderGroups);

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Unified Order Table Test</h1>
            
            {/* Test Controls */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-3">Test Configuration:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order State</label>
                  <select
                    value={orderState}
                    onChange={(e) => setOrderState(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="draft">Draft</option>
                    <option value="site_review">Site Review</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Order Paid</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Table */}
          <UnifiedOrderTable
            orderGroups={orderGroups}
            siteSubmissions={orderState === 'site_review' ? mockSiteSubmissions : {}}
            userType={userType}
            orderStatus="confirmed"
            orderState={orderState}
            isPaid={isPaid}
            onUpdateGroup={(groupId, updates) => {
              console.log('Update group:', groupId, updates);
              setOrderGroups(prev => prev.map(group => 
                group.id === groupId ? { ...group, ...updates } : group
              ));
            }}
            onAddRow={(clientId) => {
              console.log('Add row for client:', clientId);
              // Find the group and add a link
              setOrderGroups(prev => prev.map(group => {
                if (group.clientId === clientId) {
                  return {
                    ...group,
                    linkCount: group.linkCount + 1,
                    targetPages: [...(group.targetPages || []), { id: `new-${Date.now()}`, url: '' }],
                    anchorTexts: [...(group.anchorTexts || []), '']
                  };
                }
                return group;
              }));
            }}
            onRemoveRow={(groupId, linkIndex) => {
              console.log('Remove row:', groupId, linkIndex);
              setOrderGroups(prev => prev.map(group => {
                if (group.id === groupId) {
                  const newTargetPages = [...(group.targetPages || [])];
                  const newAnchorTexts = [...(group.anchorTexts || [])];
                  newTargetPages.splice(linkIndex, 1);
                  newAnchorTexts.splice(linkIndex, 1);
                  
                  return {
                    ...group,
                    linkCount: Math.max(1, group.linkCount - 1),
                    targetPages: newTargetPages,
                    anchorTexts: newAnchorTexts
                  };
                }
                return group;
              }));
            }}
            onSwitchDomain={(submissionId, groupId) => {
              console.log('Switch domain:', submissionId, groupId);
              // Mock domain switching logic
              alert(`Would switch domain ${submissionId} in group ${groupId}`);
            }}
          />
          
          {/* Debug Info */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600">
              {JSON.stringify({ orderState, userType, isPaid, linkCount: orderGroups.reduce((sum, g) => sum + g.linkCount, 0) }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}