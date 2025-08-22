import { Page } from '@playwright/test';

/**
 * Test data helper for creating realistic bulk analysis domain data
 */

export interface TestDomain {
  id: string;
  domain: string;
  qualificationStatus: 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified' | 'pending';
  suggestedTargetUrl?: string;
  targetMatchData?: {
    target_analysis: Array<{
      target_url: string;
      overlap_status: 'direct' | 'related' | 'both' | 'none';
      strength_direct: 'strong' | 'moderate' | 'weak' | 'n/a';
      strength_related: 'strong' | 'moderate' | 'weak' | 'n/a';
      match_quality: 'excellent' | 'good' | 'fair' | 'poor';
      evidence: {
        direct_count: number;
        direct_median_position: number | null;
        direct_keywords: string[];
        related_count: number;
        related_median_position: number | null;
        related_keywords: string[];
      };
      reasoning: string;
    }>;
    best_target_url: string;
    recommendation_summary: string;
  };
  targetMatchedAt?: string;
  targetPageIds: string[];
  aiQualificationReasoning?: string;
}

export interface TestProject {
  id: string;
  name: string;
  clientId: string;
  domains: TestDomain[];
}

export interface TestClient {
  id: string;
  name: string;
  targetPages: Array<{
    id: string;
    url: string;
    keywords: string[];
    description?: string;
  }>;
  projects: TestProject[];
}

/**
 * Generate realistic test domains with various states
 */
export function generateTestDomains(count: number = 10): TestDomain[] {
  const domains: TestDomain[] = [];
  const qualificationStates: TestDomain['qualificationStatus'][] = [
    'high_quality', 'good_quality', 'marginal_quality', 'disqualified', 'pending'
  ];
  
  const sampleDomains = [
    'mothersalwaysright.com',
    'digsdigs.com', 
    'thespruce.com',
    'apartmenttherapy.com',
    'housebeautiful.com',
    'elledecor.com',
    'architecturaldigest.com',
    'bhg.com',
    'countryliving.com',
    'goodhousekeeping.com'
  ];
  
  for (let i = 0; i < count; i++) {
    const qualificationStatus = qualificationStates[i % qualificationStates.length];
    const domainName = i < sampleDomains.length ? sampleDomains[i] : `test-domain-${i + 1}.com`;
    
    const domain: TestDomain = {
      id: `domain-${i + 1}`,
      domain: domainName,
      qualificationStatus,
      targetPageIds: ['target-1', 'target-2'],
      aiQualificationReasoning: generateQualificationReasoning(qualificationStatus)
    };
    
    // Add target matching data for qualified domains
    if (qualificationStatus === 'high_quality' || qualificationStatus === 'good_quality') {
      if (Math.random() > 0.5) { // 50% chance of having target matching data
        domain.suggestedTargetUrl = `https://client.com/target-page-${Math.ceil(Math.random() * 3)}`;
        domain.targetMatchData = generateTargetMatchData(domain.suggestedTargetUrl);
        domain.targetMatchedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    
    domains.push(domain);
  }
  
  return domains;
}

/**
 * Generate realistic target match data
 */
function generateTargetMatchData(targetUrl: string) {
  const matchQualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor'];
  const overlapStatuses: Array<'direct' | 'related' | 'both' | 'none'> = ['direct', 'related', 'both', 'none'];
  const strengths: Array<'strong' | 'moderate' | 'weak' | 'n/a'> = ['strong', 'moderate', 'weak', 'n/a'];
  
  const quality = matchQualities[Math.floor(Math.random() * matchQualities.length)];
  const overlapStatus = overlapStatuses[Math.floor(Math.random() * overlapStatuses.length)];
  
  return {
    target_analysis: [{
      target_url: targetUrl,
      overlap_status: overlapStatus,
      strength_direct: overlapStatus === 'direct' || overlapStatus === 'both' 
        ? strengths[Math.floor(Math.random() * 3)] // exclude 'n/a'
        : 'n/a',
      strength_related: overlapStatus === 'related' || overlapStatus === 'both'
        ? strengths[Math.floor(Math.random() * 3)] // exclude 'n/a'  
        : 'n/a',
      match_quality: quality,
      evidence: {
        direct_count: Math.floor(Math.random() * 20) + 1,
        direct_median_position: Math.floor(Math.random() * 50) + 1,
        direct_keywords: [
          `keyword1 (pos #${Math.floor(Math.random() * 30) + 1})`,
          `keyword2 (pos #${Math.floor(Math.random() * 30) + 1})`
        ],
        related_count: Math.floor(Math.random() * 15) + 1,
        related_median_position: Math.floor(Math.random() * 60) + 20,
        related_keywords: [
          `related1 (pos #${Math.floor(Math.random() * 40) + 20})`,
          `related2 (pos #${Math.floor(Math.random() * 40) + 20})`
        ]
      },
      reasoning: generateMatchReasoning(quality, overlapStatus)
    }],
    best_target_url: targetUrl,
    recommendation_summary: generateRecommendationSummary(quality)
  };
}

/**
 * Generate qualification reasoning based on status
 */
function generateQualificationReasoning(status: TestDomain['qualificationStatus']): string {
  switch (status) {
    case 'high_quality':
      return 'Excellent domain authority with strong keyword overlap and high-quality content relevant to target audience.';
    case 'good_quality':
      return 'Good domain metrics with moderate keyword relevance and decent traffic potential.';
    case 'marginal_quality':
      return 'Below-average domain authority but some relevant content that could provide value.';
    case 'disqualified':
      return 'Poor domain metrics, low relevance, or content quality issues make this unsuitable.';
    case 'pending':
      return 'Domain analysis in progress, waiting for keyword and authority evaluation.';
    default:
      return 'Status not evaluated yet.';
  }
}

/**
 * Generate match reasoning based on quality and overlap
 */
function generateMatchReasoning(quality: string, overlapStatus: string): string {
  const reasons = {
    excellent: {
      direct: 'Perfect keyword overlap with excellent ranking positions for target keywords.',
      related: 'Strong semantic relevance with high-authority related keyword rankings.',
      both: 'Exceptional match with both direct and related keyword coverage.',
      none: 'High domain authority compensates for limited keyword overlap.'
    },
    good: {
      direct: 'Good direct keyword match with decent ranking positions.',
      related: 'Solid related keyword coverage in relevant topic areas.',
      both: 'Balanced coverage of both direct and related target keywords.',
      none: 'Domain authority and topic relevance make this a viable option.'
    },
    fair: {
      direct: 'Limited direct keyword overlap but some relevant rankings.',
      related: 'Moderate related keyword coverage with room for improvement.',
      both: 'Mixed keyword coverage with both strengths and gaps.',
      none: 'Minimal keyword overlap but domain has potential value.'
    },
    poor: {
      direct: 'Weak direct keyword alignment with low ranking positions.',
      related: 'Poor related keyword coverage and topic relevance.',
      both: 'Insufficient keyword coverage across all target areas.',
      none: 'Limited keyword relevance and poor domain metrics.'
    }
  };
  
  return reasons[quality as keyof typeof reasons][overlapStatus as keyof typeof reasons.excellent] || 'Analysis pending.';
}

/**
 * Generate recommendation summary based on quality
 */
function generateRecommendationSummary(quality: string): string {
  switch (quality) {
    case 'excellent':
      return 'Highly recommended - this domain offers exceptional value for your target URL.';
    case 'good':
      return 'Good choice - solid match that should provide meaningful results.';
    case 'fair':
      return 'Reasonable option - may provide value but monitor performance closely.';
    case 'poor':
      return 'Not recommended - consider other domains with better keyword alignment.';
    default:
      return 'Evaluation in progress.';
  }
}

/**
 * Generate test client with projects and domains
 */
export function generateTestClient(clientId: string, name: string): TestClient {
  return {
    id: clientId,
    name: name,
    targetPages: [
      {
        id: 'target-1',
        url: 'https://client.com/services/digital-marketing',
        keywords: ['digital marketing', 'online marketing', 'marketing services'],
        description: 'Digital marketing services page'
      },
      {
        id: 'target-2', 
        url: 'https://client.com/blog/seo-guide',
        keywords: ['seo', 'search engine optimization', 'seo guide'],
        description: 'SEO guide blog post'
      },
      {
        id: 'target-3',
        url: 'https://client.com/products/analytics-tool',
        keywords: ['analytics', 'web analytics', 'data analysis'],
        description: 'Analytics tool product page'
      }
    ],
    projects: [
      {
        id: 'project-1',
        name: 'Q1 Link Building Campaign',
        clientId: clientId,
        domains: generateTestDomains(25)
      },
      {
        id: 'project-2',
        name: 'Content Marketing Outreach',
        clientId: clientId,
        domains: generateTestDomains(15)
      }
    ]
  };
}

/**
 * Mock API responses with test data
 */
export async function mockBulkAnalysisAPI(page: Page, testClient: TestClient) {
  // Mock client data
  await page.route(`**/api/clients/${testClient.id}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        client: {
          id: testClient.id,
          name: testClient.name,
          targetPages: testClient.targetPages
        }
      })
    });
  });
  
  // Mock project list
  await page.route(`**/api/clients/${testClient.id}/bulk-analysis/projects`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: testClient.projects.map(p => ({
          id: p.id,
          name: p.name,
          domainCount: p.domains.length,
          qualificationStats: getQualificationStats(p.domains)
        }))
      })
    });
  });
  
  // Mock domain data for each project
  testClient.projects.forEach(project => {
    page.route(`**/api/clients/${testClient.id}/bulk-analysis/projects/${project.id}/domains`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          domains: project.domains,
          pagination: {
            page: 1,
            limit: 50,
            total: project.domains.length,
            totalPages: 1
          }
        })
      });
    });
  });
  
  // Mock target matching API
  await page.route(`**/api/clients/${testClient.id}/bulk-analysis/target-match`, async route => {
    const requestData = await route.request().postDataJSON();
    const domainIds = requestData.domainIds || [];
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        totalQualified: domainIds.length,
        totalMatched: domainIds.length,
        matchDistribution: {
          excellent: Math.floor(domainIds.length * 0.3),
          good: Math.floor(domainIds.length * 0.4),
          fair: Math.floor(domainIds.length * 0.2),
          poor: Math.floor(domainIds.length * 0.1)
        },
        targetPageCoverage: testClient.targetPages.map(page => ({
          url: page.url,
          assignedDomains: Math.floor(Math.random() * 5) + 1
        })),
        updatedDomains: domainIds,
        failedUpdates: []
      })
    });
  });
}

/**
 * Get qualification statistics for a set of domains
 */
function getQualificationStats(domains: TestDomain[]) {
  const stats = {
    high_quality: 0,
    good_quality: 0,
    marginal_quality: 0,
    disqualified: 0,
    pending: 0
  };
  
  domains.forEach(domain => {
    stats[domain.qualificationStatus]++;
  });
  
  return stats;
}

/**
 * Real client IDs and data for integration testing
 */
export const REAL_TEST_DATA = {
  clients: {
    outreachLabs: {
      id: '99f819ed-9118-4e08-8802-2df99492d1c5',
      name: 'Outreach Labs',
      expectedDomains: 2380
    },
    squareFootHome: {
      id: '9d99bcdf-8e15-444c-9c4e-c9c31f4c2b5a',
      name: 'Square Foot Home', 
      expectedDomains: 1092
    }
  },
  knownDomains: [
    'mothersalwaysright.com', // 2,519 keywords
    'digsdigs.com', // 2,467 keywords
    'thespruce.com',
    'apartmenttherapy.com'
  ]
};

/**
 * Check if we should use real data based on environment
 */
export function shouldUseRealData(): boolean {
  return process.env.USE_REAL_DATA === 'true' || process.env.CI !== 'true';
}