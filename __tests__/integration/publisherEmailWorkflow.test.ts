import { testDb, cleanupTestDatabase } from '../utils/testDatabase';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import supertest from 'supertest';
import { createServer } from 'http';

// Mock the email service
const mockSendEmail = jest.fn();
jest.mock('@/lib/services/emailService', () => ({
  EmailService: {
    sendEmail: mockSendEmail
  }
}));

// Mock next/server for API route testing
const mockNextRequest = (url: string, options: any = {}) => {
  return {
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    json: async () => options.body ? JSON.parse(options.body) : {},
    nextUrl: new URL(url)
  };
};

describe('Publisher Email Verification Workflow Integration', () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
    mockSendEmail.mockClear();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('Complete publisher signup to dashboard workflow', async () => {
    const testData = {
      email: 'workflow-test@example.com',
      password: 'WorkflowTest123!',
      contactName: 'Workflow Test User',
      companyName: 'Workflow Test Company'
    };

    // Step 1: Publisher Registration
    const { POST: registerPOST } = await import('@/app/api/auth/publisher/register/route');
    
    const registerRequest = mockNextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    }) as any;

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    // Verify registration response
    expect(registerResponse.status).toBe(201);
    expect(registerData.success).toBe(true);
    expect(registerData.user.email).toBe(testData.email);
    expect(registerData.user.status).toBe('pending');

    // Verify publisher in database
    const pendingPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testData.email)
    });

    expect(pendingPublisher).toBeTruthy();
    expect(pendingPublisher?.emailVerified).toBe(false);
    expect(pendingPublisher?.status).toBe('pending');
    expect(pendingPublisher?.emailVerificationToken).toBeTruthy();

    // Verify email was sent
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: testData.email,
      subject: 'Verify Your Publisher Account',
      html: expect.stringContaining(testData.contactName),
      emailType: 'verification'
    });

    // Step 2: Attempt login before verification (should fail)
    const { POST: loginPOST } = await import('@/app/api/publisher/auth/login/route');
    
    const loginRequest1 = mockNextRequest('http://localhost:3000/api/publisher/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testData.email,
        password: testData.password
      })
    }) as any;

    const loginResponse1 = await loginPOST(loginRequest1);
    const loginData1 = await loginResponse1.json();

    expect(loginResponse1.status).toBe(403);
    expect(loginData1.error).toContain('verify your email address');
    expect(loginData1.emailVerified).toBe(false);

    // Step 3: Email Verification
    const { GET: verifyGET } = await import('@/app/api/auth/publisher/verify-email/route');
    
    const verificationToken = pendingPublisher?.emailVerificationToken;
    const verifyRequest = mockNextRequest(`http://localhost:3000/api/auth/publisher/verify-email?token=${verificationToken}`) as any;

    const verifyResponse = await verifyGET(verifyRequest);
    const verifyData = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(verifyData.success).toBe(true);
    expect(verifyData.user.status).toBe('active');

    // Verify database was updated
    const verifiedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testData.email)
    });

    expect(verifiedPublisher?.emailVerified).toBe(true);
    expect(verifiedPublisher?.status).toBe('active');
    expect(verifiedPublisher?.emailVerificationToken).toBeNull();

    // Step 4: Successful login after verification
    const loginRequest2 = mockNextRequest('http://localhost:3000/api/publisher/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testData.email,
        password: testData.password
      })
    }) as any;

    const loginResponse2 = await loginPOST(loginRequest2);
    const loginData2 = await loginResponse2.json();

    expect(loginResponse2.status).toBe(200);
    expect(loginData2.success).toBe(true);
    expect(loginData2.user.email).toBe(testData.email);
    expect(loginData2.user.userType).toBe('publisher');

    // Verify last login was updated
    const loggedInPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testData.email)
    });

    expect(loggedInPublisher?.lastLoginAt).toBeTruthy();
  });

  test('Email verification resend workflow', async () => {
    const testEmail = 'resend-test@example.com';

    // Create unverified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const originalToken = 'original-verification-token';
    
    await testDb.insert(publishers).values({
      id: 'resend-test-publisher',
      email: testEmail,
      password: hashedPassword,
      contactName: 'Resend Test User',
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: originalToken,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Step 1: Request resend verification email
    const { POST: resendPOST } = await import('@/app/api/auth/publisher/verify-email/route');
    
    const resendRequest = mockNextRequest('http://localhost:3000/api/auth/publisher/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    }) as any;

    const resendResponse = await resendPOST(resendRequest);
    const resendData = await resendResponse.json();

    expect(resendResponse.status).toBe(200);
    expect(resendData.success).toBe(true);
    expect(resendData.message).toContain('Verification email sent successfully');

    // Verify new token was generated
    const updatedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testEmail)
    });

    expect(updatedPublisher?.emailVerificationToken).toBeTruthy();
    expect(updatedPublisher?.emailVerificationToken).not.toBe(originalToken);

    // Verify new email was sent
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: testEmail,
      subject: 'Verify Your Publisher Account',
      html: expect.stringContaining('Resend Test User'),
      emailType: 'verification'
    });

    // Step 2: Try to verify with old token (should fail)
    const { GET: verifyGET } = await import('@/app/api/auth/publisher/verify-email/route');
    
    const oldTokenRequest = mockNextRequest(`http://localhost:3000/api/auth/publisher/verify-email?token=${originalToken}`) as any;
    const oldTokenResponse = await verifyGET(oldTokenRequest);
    const oldTokenData = await oldTokenResponse.json();

    expect(oldTokenResponse.status).toBe(400);
    expect(oldTokenData.error).toContain('Invalid or expired verification token');

    // Step 3: Verify with new token (should succeed)
    const newToken = updatedPublisher?.emailVerificationToken;
    const newTokenRequest = mockNextRequest(`http://localhost:3000/api/auth/publisher/verify-email?token=${newToken}`) as any;
    const newTokenResponse = await verifyGET(newTokenRequest);
    const newTokenData = await newTokenResponse.json();

    expect(newTokenResponse.status).toBe(200);
    expect(newTokenData.success).toBe(true);
    expect(newTokenData.user.status).toBe('active');
  });

  test('Edge case: verify already verified account', async () => {
    const testEmail = 'already-verified@example.com';

    // Create verified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await testDb.insert(publishers).values({
      id: 'verified-publisher',
      email: testEmail,
      password: hashedPassword,
      contactName: 'Verified User',
      status: 'active',
      emailVerified: true,
      emailVerificationToken: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Try to resend verification email for already verified account
    const { POST: resendPOST } = await import('@/app/api/auth/publisher/verify-email/route');
    
    const resendRequest = mockNextRequest('http://localhost:3000/api/auth/publisher/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    }) as any;

    const resendResponse = await resendPOST(resendRequest);
    const resendData = await resendResponse.json();

    expect(resendResponse.status).toBe(404);
    expect(resendData.error).toContain('No unverified account found');
  });

  test('Password validation during registration', async () => {
    const { POST: registerPOST } = await import('@/app/api/auth/publisher/register/route');

    // Test various invalid passwords
    const invalidPasswords = [
      { password: '123', description: 'too short' },
      { password: '', description: 'empty' },
      { password: 'simple', description: 'no complexity requirements' }
    ];

    for (const { password, description } of invalidPasswords) {
      const request = mockNextRequest('http://localhost:3000/api/auth/publisher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test-${description.replace(/\s+/g, '-')}@example.com`,
          password,
          contactName: 'Test User'
        })
      }) as any;

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Password must be at least 8 characters');
    }
  });

  test('Email format validation', async () => {
    const { POST: registerPOST } = await import('@/app/api/auth/publisher/register/route');

    const invalidEmails = [
      'invalid-email',
      'missing@domain',
      '@missinglocal.com',
      'spaces in@email.com',
      'multiple@@domains.com'
    ];

    for (const email of invalidEmails) {
      const request = mockNextRequest('http://localhost:3000/api/auth/publisher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'ValidPassword123!',
          contactName: 'Test User'
        })
      }) as any;

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid email format');
    }
  });

  test('Concurrent verification attempts', async () => {
    const testEmail = 'concurrent-test@example.com';

    // Create unverified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const verificationToken = 'concurrent-token';
    
    await testDb.insert(publishers).values({
      id: 'concurrent-publisher',
      email: testEmail,
      password: hashedPassword,
      contactName: 'Concurrent User',
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const { GET: verifyGET } = await import('@/app/api/auth/publisher/verify-email/route');

    // Simulate multiple concurrent verification attempts
    const verifyPromises = Array(3).fill(null).map(() => {
      const request = mockNextRequest(`http://localhost:3000/api/auth/publisher/verify-email?token=${verificationToken}`) as any;
      return verifyGET(request);
    });

    const responses = await Promise.all(verifyPromises);
    const results = await Promise.all(responses.map(r => r.json()));

    // Only one should succeed
    const successCount = responses.filter(r => r.status === 200).length;
    const errorCount = responses.filter(r => r.status === 400).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(2);

    // Publisher should be verified
    const publisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, testEmail)
    });

    expect(publisher?.emailVerified).toBe(true);
    expect(publisher?.status).toBe('active');
    expect(publisher?.emailVerificationToken).toBeNull();
  });

  test('Rate limiting simulation', async () => {
    const { POST: registerPOST } = await import('@/app/api/auth/publisher/register/route');

    // Note: This test simulates rate limiting behavior
    // In a real implementation, you might want to test actual rate limiting
    
    const testData = {
      email: 'rate-limit-test@example.com',
      password: 'TestPassword123!',
      contactName: 'Rate Limit Test'
    };

    // First registration should succeed
    const request1 = mockNextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    }) as any;

    const response1 = await registerPOST(request1);
    expect(response1.status).toBe(201);

    // Subsequent registration with same email should fail
    const request2 = mockNextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    }) as any;

    const response2 = await registerPOST(request2);
    expect(response2.status).toBe(409); // Conflict due to duplicate email
  });
});