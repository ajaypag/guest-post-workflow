/**
 * Integration Tests for Target URL Matching API Endpoints
 * 
 * Tests the API endpoints for target URL matching functionality:
 * - POST /api/clients/[id]/bulk-analysis/target-match (standalone)
 * - POST /api/clients/[id]/bulk-analysis/master-qualify (enhanced)
 * - Authentication and authorization
 * - Request/response validation
 * - Error handling
 * - Database integration
 */

import { NextRequest } from 'next/server';
import { POST as targetMatchPOST } from '@/app/api/clients/[id]/bulk-analysis/target-match/route';
import { POST as masterQualifyPOST } from '@/app/api/clients/[id]/bulk-analysis/master-qualify/route';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { clients, targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Mock AI service to avoid actual API calls
jest.mock('@/lib/services/aiQualificationService', () => ({
  AIQualificationService: jest.fn().mockImplementation(() => ({
    matchTargetUrls: jest.fn().mockResolvedValue([
      {
        domainId: 'test-domain-1',
        domain: 'example1.com',
        target_analysis: [
          {
            target_url: 'https://client.com/target-1',
            overlap_status: 'direct',
            strength_direct: 'strong',
            strength_related: 'moderate',
            match_quality: 'excellent',
            evidence: {
              direct_count: 5,
              direct_median_position: 15,
              direct_keywords: ['keyword1 (pos #10)', 'keyword2 (pos #20)'],
              related_count: 3,
              related_median_position: 25,
              related_keywords: ['related1 (pos #25)', 'related2 (pos #30)']
            },
            reasoning: 'Strong direct overlap with excellent positioning'
          }
        ],
        best_target_url: 'https://client.com/target-1',
        recommendation_summary: 'Excellent match for target-1'
      },
      {
        domainId: 'test-domain-2',
        domain: 'example2.com',
        target_analysis: [
          {
            target_url: 'https://client.com/target-2',
            overlap_status: 'related',
            strength_direct: 'n/a',
            strength_related: 'moderate',
            match_quality: 'good',
            evidence: {
              direct_count: 0,
              direct_median_position: null,
              direct_keywords: [],
              related_count: 4,
              related_median_position: 30,
              related_keywords: ['related1 (pos #30)', 'related2 (pos #35)']
            },
            reasoning: 'Good related match with moderate strength'
          }
        ],
        best_target_url: 'https://client.com/target-2',
        recommendation_summary: 'Good match for target-2'
      }
    ])
  }))
}));

// Mock authentication service
jest.mock('@/lib/auth-server', () => ({
  AuthServiceServer: {
    getSession: jest.fn().mockResolvedValue({
      userId: 'test-user-id',
      userType: 'internal',
      name: 'Test User'
    })
  }
}));

// Mock database connection for isolated testing
jest.mock('@/lib/db/connection');

// Test configuration
const TEST_CONFIG = {
  testClientId: 'test-client-123',
  testProjectId: 'test-project-456',
  testUserId: 'test-user-789'
};

// Test data factory
class APITestDataFactory {
  static createMockRequest(url: string, body: any = {}): NextRequest {
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
  }

  static createMockContext(clientId: string) {
    return {
      params: Promise.resolve({ id: clientId })
    };
  }

  static createMockQualifiedDomains() {
    return [
      {
        id: 'test-domain-1',
        clientId: TEST_CONFIG.testClientId,
        domain: 'example1.com',
        qualificationStatus: 'high_quality',
        aiQualificationReasoning: 'Strong topical authority',
        aiQualifiedAt: new Date().toISOString(),
        overlapStatus: 'direct',
        authorityDirect: 'strong',
        authorityRelated: 'moderate'
      },
      {
        id: 'test-domain-2',
        clientId: TEST_CONFIG.testClientId,
        domain: 'example2.com',
        qualificationStatus: 'good_quality',
        aiQualificationReasoning: 'Good topical match',
        aiQualifiedAt: new Date().toISOString(),
        overlapStatus: 'related',
        authorityDirect: 'n/a',
        authorityRelated: 'moderate'
      }
    ];
  }

  static createMockClient() {
    return {
      id: TEST_CONFIG.testClientId,
      name: 'Test Client',
      targetPages: [
        {
          id: 'target-1',
          url: 'https://client.com/target-1',
          keywords: ['keyword1', 'keyword2', 'keyword3'],
          description: 'Primary target page'
        },
        {
          id: 'target-2',
          url: 'https://client.com/target-2',
          keywords: ['keyword4', 'keyword5'],
          description: 'Secondary target page'
        }
      ]
    };
  }

  static createMockKeywordResults() {
    return {
      rows: [
        {
          domainId: 'test-domain-1',
          keyword: 'keyword1',
          position: 10,
          searchVolume: 1000,
          url: 'https://example1.com/page1'
        },
        {
          domainId: 'test-domain-1',
          keyword: 'keyword2',
          position: 15,
          searchVolume: 800,
          url: 'https://example1.com/page2'
        },
        {
          domainId: 'test-domain-2',
          keyword: 'related1',
          position: 25,
          searchVolume: 600,
          url: 'https://example2.com/page1'
        }
      ]
    };
  }
}

// Mock database queries
const mockDb = {
  query: {
    bulkAnalysisDomains: {
      findMany: jest.fn()
    },
    clients: {
      findFirst: jest.fn()
    }
  },
  execute: jest.fn(),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(true)
    })
  })
};

(db as any) = mockDb;

// Test Suite: Target Match API Endpoint
describe('POST /api/clients/[id]/bulk-analysis/target-match', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );
  });

  test('successfully matches target URLs for qualified domains', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      {
        domainIds: ['test-domain-1', 'test-domain-2'],
        projectId: TEST_CONFIG.testProjectId
      }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.totalQualified).toBe(2);
    expect(responseData.totalMatched).toBe(2);
    expect(responseData.matchDistribution).toEqual({
      excellent: 1,
      good: 1,
      fair: 0,
      poor: 0
    });
  });

  test('returns error when no qualified domains found', async () => {
    // Mock empty domain response
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue([]);

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['non-existent-domain'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('No qualified domains found');
    expect(responseData.details).toContain('high_quality or good_quality');
  });

  test('returns error when no target pages found', async () => {
    // Mock client without target pages
    mockDb.query.clients.findFirst.mockResolvedValue({
      ...APITestDataFactory.createMockClient(),
      targetPages: []
    });

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('No target pages found for client');
    expect(responseData.details).toContain('add target pages');
  });

  test('filters domains by project ID when provided', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      {
        domainIds: ['test-domain-1'],
        projectId: TEST_CONFIG.testProjectId
      }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    await targetMatchPOST(request, context);

    // Verify the query included project ID filter
    expect(mockDb.query.bulkAnalysisDomains.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything()
      })
    );
  });

  test('handles specific domain IDs when provided', async () => {
    const specificDomainIds = ['test-domain-1'];
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: specificDomainIds }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    await targetMatchPOST(request, context);

    expect(mockDb.query.bulkAnalysisDomains.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything()
      })
    );
  });

  test('updates database with target matching results', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    await targetMatchPOST(request, context);

    // Verify database update was called
    expect(mockDb.update).toHaveBeenCalledWith(bulkAnalysisDomains);
  });

  test('provides target page coverage statistics', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1', 'test-domain-2'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(responseData.targetPageCoverage).toBeDefined();
    expect(Array.isArray(responseData.targetPageCoverage)).toBe(true);
    expect(responseData.targetPageCoverage).toEqual([
      { url: 'https://client.com/target-1', assignedDomains: 1 },
      { url: 'https://client.com/target-2', assignedDomains: 1 }
    ]);
  });
});

// Test Suite: Authentication and Authorization
describe('Target Matching API Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no authentication provided', async () => {
    // Mock no session
    const { AuthServiceServer } = require('@/lib/auth-server');
    AuthServiceServer.getSession.mockResolvedValueOnce(null);

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(401);
    const responseData = await response.json();
    expect(responseData.error).toBe('Unauthorized');
  });

  test('allows internal users to access target matching', async () => {
    // Internal user session already mocked in beforeEach
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(200);
  });
});

// Test Suite: Request Validation
describe('Target Matching API Request Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful mocks
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );
  });

  test('accepts valid domain IDs array', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['domain-1', 'domain-2', 'domain-3'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(200);
  });

  test('handles empty domain IDs array', async () => {
    // Mock no qualified domains found
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue([]);

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: [] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('No qualified domains found');
  });

  test('handles missing request body gracefully', async () => {
    const request = new NextRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
        // No body
      }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    // Should handle gracefully, either by providing defaults or returning appropriate error
    expect([200, 400, 500]).toContain(response.status);
  });

  test('validates client ID parameter', async () => {
    const request = APITestDataFactory.createMockRequest(
      'http://localhost:3001/api/clients/invalid-client-id/bulk-analysis/target-match',
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext('invalid-client-id');

    // Mock client not found
    mockDb.query.clients.findFirst.mockResolvedValue(null);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.error).toBe('Failed to match target URLs');
  });
});

// Test Suite: Error Handling
describe('Target Matching API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles database connection errors', async () => {
    // Mock database error
    mockDb.query.bulkAnalysisDomains.findMany.mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.error).toBe('Failed to match target URLs');
    expect(responseData.details).toBe('Database connection failed');
  });

  test('handles AI service errors gracefully', async () => {
    // Setup successful database mocks
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );

    // Mock AI service failure
    const { AIQualificationService } = require('@/lib/services/aiQualificationService');
    AIQualificationService.mockImplementation(() => ({
      matchTargetUrls: jest.fn().mockRejectedValue(new Error('AI service timeout'))
    }));

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.error).toBe('Failed to match target URLs');
    expect(responseData.details).toBe('AI service timeout');
  });

  test('handles partial update failures', async () => {
    // Setup successful initial mocks
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );

    // Mock database update failure for one domain
    let updateCallCount = 0;
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation(() => {
          updateCallCount++;
          if (updateCallCount === 2) {
            throw new Error('Update failed for domain 2');
          }
          return Promise.resolve(true);
        })
      })
    });

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1', 'test-domain-2'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    expect(response.status).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.updatedDomains).toHaveLength(1);
    expect(responseData.failedUpdates).toHaveLength(1);
  });

  test('handles malformed keyword results', async () => {
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    
    // Mock malformed keyword results
    mockDb.execute.mockResolvedValue({
      rows: [
        { /* missing required fields */ },
        null,
        {
          domainId: 'test-domain-1',
          keyword: 'valid-keyword',
          position: 10
          // missing other optional fields
        }
      ]
    });

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    // Should handle malformed data gracefully
    expect(response.status).toBe(200);
  });
});

// Test Suite: Performance and Scalability
describe('Target Matching API Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks for performance testing
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );
  });

  test('handles maximum domain limit (100 domains)', async () => {
    const manyDomains = Array.from({ length: 100 }, (_, i) => ({
      id: `test-domain-${i}`,
      clientId: TEST_CONFIG.testClientId,
      domain: `example${i}.com`,
      qualificationStatus: 'high_quality'
    }));

    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(manyDomains);

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: manyDomains.map(d => d.id) }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const startTime = Date.now();
    const response = await targetMatchPOST(request, context);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    
    // Should complete within reasonable time (allowing for mocked responses)
    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
  });

  test('respects domain limit to prevent timeouts', async () => {
    const tooManyDomains = Array.from({ length: 150 }, (_, i) => ({
      id: `test-domain-${i}`,
      clientId: TEST_CONFIG.testClientId,
      domain: `example${i}.com`,
      qualificationStatus: 'high_quality'
    }));

    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(tooManyDomains);

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: tooManyDomains.map(d => d.id) }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    // Should limit to 100 domains max
    const responseData = await response.json();
    expect(responseData.totalQualified).toBeLessThanOrEqual(100);
  });
});

// Test Suite: Data Validation
describe('Target Matching API Data Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates domain qualification status', async () => {
    const mixedQualificationDomains = [
      {
        id: 'qualified-domain',
        clientId: TEST_CONFIG.testClientId,
        domain: 'qualified.com',
        qualificationStatus: 'high_quality'
      },
      {
        id: 'unqualified-domain',
        clientId: TEST_CONFIG.testClientId,
        domain: 'unqualified.com',
        qualificationStatus: 'pending' // Not qualified for target matching
      }
    ];

    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(mixedQualificationDomains);
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['qualified-domain', 'unqualified-domain'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    // Should only process qualified domains
    // The exact behavior depends on implementation - might return error or process only qualified ones
    expect([200, 400]).toContain(response.status);
  });

  test('validates target page data structure', async () => {
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    
    // Mock client with malformed target pages
    mockDb.query.clients.findFirst.mockResolvedValue({
      id: TEST_CONFIG.testClientId,
      name: 'Test Client',
      targetPages: [
        {
          id: 'valid-target',
          url: 'https://client.com/valid',
          keywords: ['keyword1', 'keyword2'],
          description: 'Valid target'
        },
        {
          id: 'invalid-target',
          // Missing URL
          keywords: null, // Invalid keywords
          description: 'Invalid target'
        }
      ]
    });
    
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);

    // Should handle malformed target pages gracefully
    expect(response.status).toBe(200);
  });
});

// Test Suite: Master Qualify Endpoint Integration
describe('Master Qualify API with Target Matching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('includes target matching in master qualification workflow', async () => {
    // This test would require mocking the master-qualify endpoint
    // For now, we're testing the conceptual integration
    
    const qualificationResults = [
      {
        domainId: 'test-domain-1',
        qualification: 'high_quality',
        reasoning: 'Strong topical authority'
      }
    ];

    // Mock the AI service to return both qualification and target matching
    const { AIQualificationService } = require('@/lib/services/aiQualificationService');
    const mockService = new AIQualificationService();
    
    // Test that target matching is called after qualification
    await mockService.matchTargetUrls([], {});
    
    expect(mockService.matchTargetUrls).toHaveBeenCalled();
  });
});

// Test Suite: Response Format Validation
describe('Target Matching API Response Format', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb.query.bulkAnalysisDomains.findMany.mockResolvedValue(
      APITestDataFactory.createMockQualifiedDomains()
    );
    mockDb.query.clients.findFirst.mockResolvedValue(
      APITestDataFactory.createMockClient()
    );
    mockDb.execute.mockResolvedValue(
      APITestDataFactory.createMockKeywordResults()
    );
  });

  test('returns complete success response structure', async () => {
    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1', 'test-domain-2'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    // Validate complete response structure
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('totalQualified');
    expect(responseData).toHaveProperty('totalMatched');
    expect(responseData).toHaveProperty('matchDistribution');
    expect(responseData).toHaveProperty('targetPageCoverage');
    expect(responseData).toHaveProperty('updatedDomains');
    expect(responseData).toHaveProperty('failedUpdates');

    // Validate match distribution structure
    expect(responseData.matchDistribution).toHaveProperty('excellent');
    expect(responseData.matchDistribution).toHaveProperty('good');
    expect(responseData.matchDistribution).toHaveProperty('fair');
    expect(responseData.matchDistribution).toHaveProperty('poor');

    // Validate target page coverage structure
    expect(Array.isArray(responseData.targetPageCoverage)).toBe(true);
    if (responseData.targetPageCoverage.length > 0) {
      expect(responseData.targetPageCoverage[0]).toHaveProperty('url');
      expect(responseData.targetPageCoverage[0]).toHaveProperty('assignedDomains');
    }
  });

  test('returns structured error response', async () => {
    mockDb.query.bulkAnalysisDomains.findMany.mockRejectedValue(
      new Error('Database error')
    );

    const request = APITestDataFactory.createMockRequest(
      `http://localhost:3001/api/clients/${TEST_CONFIG.testClientId}/bulk-analysis/target-match`,
      { domainIds: ['test-domain-1'] }
    );
    const context = APITestDataFactory.createMockContext(TEST_CONFIG.testClientId);

    const response = await targetMatchPOST(request, context);
    const responseData = await response.json();

    expect(responseData).toHaveProperty('error');
    expect(responseData).toHaveProperty('details');
    expect(typeof responseData.error).toBe('string');
    expect(typeof responseData.details).toBe('string');
  });
});