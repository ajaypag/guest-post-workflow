/**
 * Chaos Test Factory
 * 
 * Generates various test scenarios and data for comprehensive E2E testing
 * of the publisher portal system.
 */

import { faker } from '@faker-js/faker';
import { MaliciousPayloadGenerator, MaliciousPayload } from '../utils/maliciousPayloadGenerator';

export interface TestScenario {
  name: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  steps: TestStep[];
  expectedOutcome: 'pass' | 'fail' | 'error';
  timeout: number;
}

export interface TestStep {
  action: string;
  target: string;
  data?: any;
  expectedResponse?: number;
  description: string;
}

export interface ConcurrencyTestData {
  threadCount: number;
  operationsPerThread: number;
  data: any[];
  description: string;
}

export interface LoadTestData {
  duration: number;
  rampUpTime: number;
  maxUsers: number;
  operations: string[];
  description: string;
}

export class ChaosTestFactory {

  /**
   * Generate website management chaos scenarios
   */
  static generateWebsiteChaosScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // XSS Attack Scenarios
    const xssPayloads = MaliciousPayloadGenerator.getXSSPayloads();
    for (const payload of xssPayloads) {
      scenarios.push({
        name: `Website XSS Test: ${payload.description}`,
        description: `Test XSS protection in website domain field with: ${payload.payload}`,
        category: 'security',
        severity: payload.severity,
        steps: [
          {
            action: 'navigate',
            target: '/publisher/websites/new',
            description: 'Navigate to add website page'
          },
          {
            action: 'fill',
            target: 'input[name="domain"]',
            data: payload.payload,
            description: `Fill domain with XSS payload: ${payload.payload}`
          },
          {
            action: 'click',
            target: 'button[type="submit"]',
            expectedResponse: 400,
            description: 'Submit form and expect rejection'
          },
          {
            action: 'checkNoXSS',
            target: 'page',
            description: 'Verify no XSS execution occurred'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 10000
      });
    }

    // SQL Injection Scenarios
    const sqlPayloads = MaliciousPayloadGenerator.getSQLInjectionPayloads();
    for (const payload of sqlPayloads) {
      scenarios.push({
        name: `Website SQL Injection Test: ${payload.description}`,
        description: `Test SQL injection protection with: ${payload.payload}`,
        category: 'security',
        severity: payload.severity,
        steps: [
          {
            action: 'apiPost',
            target: '/api/publisher/websites',
            data: {
              domain: payload.payload,
              publisherCompany: 'Test Company'
            },
            expectedResponse: 400,
            description: 'API call should reject SQL injection'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 5000
      });
    }

    // Domain Normalization Scenarios
    const domainTests = MaliciousPayloadGenerator.getDomainNormalizationTests();
    scenarios.push({
      name: 'Domain Normalization Consistency Test',
      description: 'Test that all domain variations normalize to the same value',
      category: 'functionality',
      severity: 'high',
      steps: domainTests.map(test => ({
        action: 'apiPost',
        target: '/api/publisher/websites',
        data: {
          domain: test.original,
          publisherCompany: 'Test Company'
        },
        expectedResponse: 200,
        description: `Test domain normalization for: ${test.original}`
      })),
      expectedOutcome: 'pass',
      timeout: 30000
    });

    // Concurrency Test Scenario
    scenarios.push({
      name: 'Concurrent Website Creation Race Condition',
      description: 'Test race conditions when multiple users create websites simultaneously',
      category: 'concurrency',
      severity: 'high',
      steps: [
        {
          action: 'concurrentOperation',
          target: '/api/publisher/websites',
          data: {
            threadCount: 10,
            operationsPerThread: 5,
            payload: {
              domain: 'race-condition-test.com',
              publisherCompany: 'Race Test Co'
            }
          },
          description: 'Perform concurrent website creation'
        }
      ],
      expectedOutcome: 'pass',
      timeout: 60000
    });

    return scenarios;
  }

  /**
   * Generate offering management chaos scenarios
   */
  static generateOfferingChaosScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Invalid Price Scenarios
    const pricePayloads = MaliciousPayloadGenerator.getInvalidPricePayloads();
    for (const payload of pricePayloads) {
      scenarios.push({
        name: `Offering Invalid Price Test: ${payload.description}`,
        description: `Test price validation with: ${payload.payload}`,
        category: 'validation',
        severity: payload.severity,
        steps: [
          {
            action: 'navigate',
            target: '/publisher/offerings/new',
            description: 'Navigate to create offering page'
          },
          {
            action: 'fill',
            target: 'input[name="basePrice"]',
            data: payload.payload,
            description: `Fill price with invalid value: ${payload.payload}`
          },
          {
            action: 'click',
            target: 'button[type="submit"]',
            expectedResponse: 400,
            description: 'Submit and expect validation error'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 10000
      });
    }

    // Content Requirements XSS Test
    const xssPayloads = MaliciousPayloadGenerator.getXSSPayloads();
    for (const payload of xssPayloads.slice(0, 5)) { // Test first 5 to avoid overwhelming
      scenarios.push({
        name: `Offering Content XSS Test: ${payload.description}`,
        description: `Test XSS in content requirements field`,
        category: 'security',
        severity: payload.severity,
        steps: [
          {
            action: 'navigate',
            target: '/publisher/offerings/new',
            description: 'Navigate to create offering page'
          },
          {
            action: 'fill',
            target: 'textarea[name="contentRequirements"]',
            data: payload.payload,
            description: `Fill content requirements with XSS payload`
          },
          {
            action: 'click',
            target: 'button[type="submit"]',
            description: 'Submit form'
          },
          {
            action: 'checkNoXSS',
            target: 'page',
            description: 'Verify no XSS execution occurred'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 10000
      });
    }

    return scenarios;
  }

  /**
   * Generate pricing rules chaos scenarios
   */
  static generatePricingRulesChaosScenarios(): TestScenario[] {
    return [
      {
        name: 'Conflicting Pricing Rules Test',
        description: 'Create multiple conflicting pricing rules and test resolution',
        category: 'business_logic',
        severity: 'high',
        steps: [
          {
            action: 'createConflictingRules',
            target: '/api/publisher/offerings/1/pricing-rules',
            data: {
              rules: [
                {
                  condition: 'order_volume',
                  operator: 'greater_than',
                  value: '10',
                  action: 'percentage_discount',
                  actionValue: '20',
                  priority: 1
                },
                {
                  condition: 'order_volume',
                  operator: 'greater_than',
                  value: '10',
                  action: 'percentage_discount',
                  actionValue: '30',
                  priority: 2
                },
                {
                  condition: 'order_volume',
                  operator: 'greater_than',
                  value: '10',
                  action: 'fixed_discount',
                  actionValue: '50',
                  priority: 3
                }
              ]
            },
            description: 'Create conflicting pricing rules'
          },
          {
            action: 'testPriceCalculation',
            target: '/api/publisher/offerings/1/calculate-price',
            data: {
              orderVolume: 15,
              clientType: 'regular'
            },
            description: 'Test price calculation with conflicts'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 15000
      },
      {
        name: 'Pricing Rules Performance Test',
        description: 'Test system performance with large number of pricing rules',
        category: 'performance',
        severity: 'medium',
        steps: [
          {
            action: 'createManyRules',
            target: '/api/publisher/offerings/1/pricing-rules',
            data: {
              count: 1000,
              template: {
                condition: 'order_volume',
                operator: 'greater_than',
                action: 'percentage_discount'
              }
            },
            description: 'Create 1000 pricing rules'
          },
          {
            action: 'measurePerformance',
            target: '/api/publisher/offerings/1/calculate-price',
            data: {
              orderVolume: 50,
              clientType: 'premium'
            },
            description: 'Measure price calculation performance'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 120000
      }
    ];
  }

  /**
   * Generate authentication and authorization chaos scenarios
   */
  static generateAuthChaosScenarios(): TestScenario[] {
    return [
      {
        name: 'JWT Token Manipulation Test',
        description: 'Test system response to manipulated JWT tokens',
        category: 'security',
        severity: 'critical',
        steps: [
          {
            action: 'manipulateJWT',
            target: 'auth-token-publisher',
            data: {
              modifications: [
                'alter_signature',
                'change_payload',
                'expired_token',
                'invalid_format'
              ]
            },
            description: 'Manipulate JWT token in various ways'
          },
          {
            action: 'attemptAccess',
            target: '/publisher/websites',
            expectedResponse: 401,
            description: 'Attempt to access protected resource'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 10000
      },
      {
        name: 'Cross-Publisher Data Access Test',
        description: 'Test that publishers cannot access other publishers\' data',
        category: 'security',
        severity: 'critical',
        steps: [
          {
            action: 'loginAs',
            target: 'publisher1@test.com',
            description: 'Login as first publisher'
          },
          {
            action: 'attemptAccess',
            target: '/api/publisher/websites/999999',
            expectedResponse: 403,
            description: 'Try to access another publisher\'s website'
          },
          {
            action: 'attemptAccess',
            target: '/api/publisher/offerings/999999',
            expectedResponse: 403,
            description: 'Try to access another publisher\'s offering'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 15000
      },
      {
        name: 'Session Timeout Test',
        description: 'Test system behavior when session expires',
        category: 'security',
        severity: 'medium',
        steps: [
          {
            action: 'login',
            target: '/publisher/login',
            description: 'Login normally'
          },
          {
            action: 'clearCookies',
            target: 'browser',
            description: 'Clear session cookies'
          },
          {
            action: 'attemptAccess',
            target: '/publisher/websites',
            expectedResponse: 302,
            description: 'Should redirect to login'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 10000
      }
    ];
  }

  /**
   * Generate verification system chaos scenarios
   */
  static generateVerificationChaosScenarios(): TestScenario[] {
    return [
      {
        name: 'Verification Token Brute Force Test',
        description: 'Test verification system against brute force attacks',
        category: 'security',
        severity: 'high',
        steps: [
          {
            action: 'bruteForceTokens',
            target: '/api/publisher/websites/1/verify/check',
            data: {
              attempts: 1000,
              tokenPattern: 'random'
            },
            expectedResponse: 429,
            description: 'Should rate limit brute force attempts'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 30000
      },
      {
        name: 'Concurrent Verification Test',
        description: 'Test concurrent verification attempts',
        category: 'concurrency',
        severity: 'medium',
        steps: [
          {
            action: 'concurrentVerification',
            target: '/api/publisher/websites/1/verify',
            data: {
              threadCount: 10,
              method: 'email'
            },
            description: 'Attempt concurrent verifications'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 20000
      }
    ];
  }

  /**
   * Generate performance and load testing scenarios
   */
  static generatePerformanceChaosScenarios(): TestScenario[] {
    return [
      {
        name: 'Large Dataset Response Test',
        description: 'Test system handling of large dataset responses',
        category: 'performance',
        severity: 'medium',
        steps: [
          {
            action: 'mockLargeResponse',
            target: '/api/publisher/orders',
            data: {
              recordCount: 50000,
              recordSize: 1024
            },
            description: 'Mock large orders response'
          },
          {
            action: 'measurePageLoad',
            target: '/publisher/orders',
            description: 'Measure page load time with large dataset'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 60000
      },
      {
        name: 'Memory Exhaustion Test',
        description: 'Test system behavior under memory pressure',
        category: 'performance',
        severity: 'high',
        steps: [
          {
            action: 'createMemoryPressure',
            target: 'browser',
            data: {
              objects: 1000000,
              sizePerObject: 1024
            },
            description: 'Create memory pressure in browser'
          },
          {
            action: 'attemptNavigation',
            target: '/publisher/websites',
            description: 'Try to navigate under memory pressure'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 30000
      },
      {
        name: 'Network Failure Resilience Test',
        description: 'Test system resilience to network failures',
        category: 'resilience',
        severity: 'high',
        steps: [
          {
            action: 'simulateNetworkFailure',
            target: '/api/publisher/websites',
            data: {
              failureTypes: ['timeout', 'connection_refused', 'dns_failure']
            },
            description: 'Simulate various network failures'
          },
          {
            action: 'checkErrorHandling',
            target: 'page',
            description: 'Verify graceful error handling'
          }
        ],
        expectedOutcome: 'pass',
        timeout: 20000
      }
    ];
  }

  /**
   * Generate random chaos test data
   */
  static generateRandomChaosData(): {
    domains: string[];
    prices: string[];
    names: string[];
    emails: string[];
    descriptions: string[];
  } {
    const count = 100;
    
    return {
      domains: Array.from({ length: count }, () => faker.internet.domainName()),
      prices: Array.from({ length: count }, () => faker.commerce.price()),
      names: Array.from({ length: count }, () => faker.company.name()),
      emails: Array.from({ length: count }, () => faker.internet.email()),
      descriptions: Array.from({ length: count }, () => faker.lorem.paragraphs(3))
    };
  }

  /**
   * Generate concurrency test data
   */
  static generateConcurrencyTestData(category: string): ConcurrencyTestData {
    const configs = {
      website_creation: {
        threadCount: 20,
        operationsPerThread: 10,
        data: Array.from({ length: 200 }, (_, i) => ({
          domain: `concurrency-test-${i}.com`,
          publisherCompany: `Test Company ${i}`
        })),
        description: 'Concurrent website creation stress test'
      },
      offering_creation: {
        threadCount: 15,
        operationsPerThread: 8,
        data: Array.from({ length: 120 }, (_, i) => ({
          offeringType: 'guest-post',
          basePrice: (Math.random() * 1000 + 100).toFixed(2),
          currency: 'USD',
          turnaroundDays: Math.floor(Math.random() * 14) + 1
        })),
        description: 'Concurrent offering creation stress test'
      },
      pricing_rules: {
        threadCount: 10,
        operationsPerThread: 20,
        data: Array.from({ length: 200 }, (_, i) => ({
          condition: 'order_volume',
          operator: 'greater_than',
          value: (Math.random() * 100).toString(),
          action: 'percentage_discount',
          actionValue: (Math.random() * 50).toString(),
          priority: i
        })),
        description: 'Concurrent pricing rules creation stress test'
      }
    };

    return (configs as any)[category] || configs.website_creation;
  }

  /**
   * Generate load test configuration
   */
  static generateLoadTestData(scenario: string): LoadTestData {
    const configs = {
      normal_load: {
        duration: 300, // 5 minutes
        rampUpTime: 60,  // 1 minute
        maxUsers: 100,
        operations: ['browse_websites', 'view_offerings', 'check_orders'],
        description: 'Normal user load simulation'
      },
      peak_load: {
        duration: 600, // 10 minutes
        rampUpTime: 120, // 2 minutes
        maxUsers: 500,
        operations: ['create_website', 'create_offering', 'manage_pricing'],
        description: 'Peak load simulation'
      },
      stress_load: {
        duration: 900, // 15 minutes
        rampUpTime: 180, // 3 minutes
        maxUsers: 1000,
        operations: ['all_operations'],
        description: 'Stress load test - breaking point'
      },
      spike_load: {
        duration: 120, // 2 minutes
        rampUpTime: 10,  // 10 seconds
        maxUsers: 2000,
        operations: ['login', 'browse_websites'],
        description: 'Sudden traffic spike simulation'
      }
    };

    return (configs as any)[scenario] || configs.normal_load;
  }

  /**
   * Generate all chaos scenarios
   */
  static generateAllChaosScenarios(): TestScenario[] {
    return [
      ...this.generateWebsiteChaosScenarios(),
      ...this.generateOfferingChaosScenarios(),
      ...this.generatePricingRulesChaosScenarios(),
      ...this.generateAuthChaosScenarios(),
      ...this.generateVerificationChaosScenarios(),
      ...this.generatePerformanceChaosScenarios()
    ];
  }

  /**
   * Filter scenarios by severity
   */
  static getScenariosBySeverity(scenarios: TestScenario[], severity: 'critical' | 'high' | 'medium' | 'low'): TestScenario[] {
    return scenarios.filter(scenario => scenario.severity === severity);
  }

  /**
   * Filter scenarios by category
   */
  static getScenariosByCategory(scenarios: TestScenario[], category: string): TestScenario[] {
    return scenarios.filter(scenario => scenario.category === category);
  }

  /**
   * Generate test execution plan
   */
  static generateTestExecutionPlan(): {
    phases: Array<{
      name: string;
      scenarios: TestScenario[];
      estimatedDuration: number;
      description: string;
    }>;
    totalEstimatedTime: number;
  } {
    const allScenarios = this.generateAllChaosScenarios();
    
    const phases = [
      {
        name: 'Phase 1: Critical Security Tests',
        scenarios: this.getScenariosBySeverity(allScenarios, 'critical'),
        estimatedDuration: 120, // 2 hours
        description: 'Test critical security vulnerabilities that could compromise the system'
      },
      {
        name: 'Phase 2: High Priority Functionality',
        scenarios: this.getScenariosBySeverity(allScenarios, 'high'),
        estimatedDuration: 180, // 3 hours
        description: 'Test high-priority functionality and major business logic'
      },
      {
        name: 'Phase 3: Medium Priority Features',
        scenarios: this.getScenariosBySeverity(allScenarios, 'medium'),
        estimatedDuration: 240, // 4 hours
        description: 'Test medium-priority features and edge cases'
      },
      {
        name: 'Phase 4: Low Priority and Performance',
        scenarios: this.getScenariosBySeverity(allScenarios, 'low'),
        estimatedDuration: 120, // 2 hours
        description: 'Test low-priority features and performance scenarios'
      }
    ];

    const totalEstimatedTime = phases.reduce((total, phase) => total + phase.estimatedDuration, 0);

    return {
      phases,
      totalEstimatedTime
    };
  }
}