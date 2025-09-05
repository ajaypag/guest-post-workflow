import { NextRequest, NextResponse } from 'next/server';

// Demo endpoint that returns enriched line items data for testing the UI
export async function GET(request: NextRequest) {
  // Sample enriched line items data
  const enrichedLineItems = [
    {
      id: 'demo-1',
      orderId: '19139665-daf4-45d0-b4b5-c773cb63814d',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        name: 'Acme Corp',
        website: 'acmecorp.com'
      },
      targetPageUrl: 'https://acmecorp.com/products',
      anchorText: 'best enterprise solutions',
      status: 'assigned',
      assignedDomain: 'techinsights.com',
      assignedDomainId: 'domain-1',
      estimatedPrice: 45000,
      addedAt: '2024-12-15T10:00:00Z',
      domainData: {
        domainRating: 72,
        totalTraffic: 1250000,
        categories: ['Technology', 'Business', 'Enterprise'],
        niche: ['B2B Software', 'SaaS'],
        overallQuality: 'Excellent',
        qualificationStatus: 'qualified',
        aiQualificationReasoning: 'Domain exhibits excellent authority metrics with DR 72 and consistent ranking patterns across target keywords. The site maintains high-quality editorial standards and shows strong topical relevance in the technology and business niches. Content velocity is moderate with regular publishing schedule. No signs of AI-generated content detected.',
        overlapStatus: 'direct',
        authorityDirect: 'strong',
        authorityRelated: 'moderate',
        topicScope: 'short_tail',
        topicReasoning: 'This domain shows strong topical relevance with short-tail keywords. Focus on comprehensive guides and authoritative content to match the domain\'s existing authority profile. Recommended approach: Create in-depth technical guides and thought leadership pieces.',
        evidence: {
          direct_count: 45,
          direct_median_position: 12,
          related_count: 128,
          related_median_position: 18
        },
        hasAiContent: false,
        aiContentTags: [],
        notes: 'Premium publisher with strict editorial guidelines'
      }
    },
    {
      id: 'demo-2',
      orderId: '19139665-daf4-45d0-b4b5-c773cb63814d',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        name: 'Acme Corp',
        website: 'acmecorp.com'
      },
      targetPageUrl: 'https://acmecorp.com/solutions',
      anchorText: 'cloud infrastructure platform',
      status: 'assigned',
      assignedDomain: 'digitalmarketingblog.net',
      assignedDomainId: 'domain-2',
      estimatedPrice: 32000,
      addedAt: '2024-12-15T10:00:00Z',
      domainData: {
        domainRating: 65,
        totalTraffic: 450000,
        categories: ['Marketing', 'Technology', 'Digital'],
        niche: ['Content Marketing', 'SEO'],
        overallQuality: 'High Quality',
        qualificationStatus: 'high_quality',
        aiQualificationReasoning: 'High-quality domain with DR 65+ showing strong performance in related keywords. The site has established authority in digital marketing topics and maintains consistent content quality. Some AI-generated content detected but well-edited and integrated into natural content flow.',
        overlapStatus: 'both',
        authorityDirect: 'moderate',
        authorityRelated: 'strong',
        topicScope: 'long_tail',
        topicReasoning: 'Domain excels in long-tail keyword targeting. Recommend focusing on detailed, specific topics that align with their content strategy. Best for how-to guides and detailed tutorials.',
        evidence: {
          direct_count: 23,
          direct_median_position: 25,
          related_count: 89,
          related_median_position: 8
        },
        hasAiContent: true,
        aiContentTags: ['AI-Assisted', 'High Quality AI'],
        notes: 'Uses AI tools but maintains editorial oversight'
      }
    },
    {
      id: 'demo-3',
      orderId: '19139665-daf4-45d0-b4b5-c773cb63814d',
      clientId: 'client-1',
      client: {
        id: 'client-1',
        name: 'Acme Corp',
        website: 'acmecorp.com'
      },
      targetPageUrl: 'https://acmecorp.com/pricing',
      anchorText: 'affordable enterprise software',
      status: 'assigned',
      assignedDomain: 'businessweekly.org',
      assignedDomainId: 'domain-3',
      estimatedPrice: 28000,
      addedAt: '2024-12-15T10:00:00Z',
      domainData: {
        domainRating: 48,
        totalTraffic: 125000,
        categories: ['Business', 'Finance', 'Management'],
        niche: ['Small Business', 'Startups'],
        overallQuality: 'Good',
        qualificationStatus: 'good_quality',
        aiQualificationReasoning: 'Good quality domain with emerging authority. DR 48 with improving metrics. Site shows potential for growth in business and finance niches. Mixed content quality with some sections showing AI content patterns. Suitable for informational and commercial content.',
        overlapStatus: 'related',
        authorityDirect: 'weak',
        authorityRelated: 'moderate',
        topicScope: 'ultra_long_tail',
        topicReasoning: 'Best suited for ultra-specific, niche topics. Target low-competition keywords with high commercial intent. Focus on buyer-intent keywords and comparison articles.',
        evidence: {
          direct_count: 8,
          direct_median_position: 45,
          related_count: 34,
          related_median_position: 22
        },
        hasAiContent: true,
        aiContentTags: ['Mixed Quality AI', 'Needs Review'],
        notes: 'Budget-friendly option with reasonable metrics'
      }
    }
  ];

  return NextResponse.json({
    success: true,
    lineItems: enrichedLineItems
  });
}