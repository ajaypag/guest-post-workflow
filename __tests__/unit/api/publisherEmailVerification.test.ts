import { NextRequest } from 'next/server';
import { setupTestDatabase, cleanupTestDatabase } from '../../utils/testDatabase';
import { publishers } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

let testDb: any;

// Mock the email service
const mockSendEmail = jest.fn();
jest.mock('@/lib/services/emailService', () => ({
  EmailService: {
    sendEmail: mockSendEmail
  }
}));

// Mock the rate limiter to avoid setInterval issues
jest.mock('@/lib/utils/rateLimiter', () => ({
  authRateLimiter: {
    check: jest.fn(() => ({ allowed: true, retryAfter: 0 }))
  },
  getClientIp: jest.fn(() => '127.0.0.1')
}));

// Mock UUID generation for consistent testing
const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
jest.mock('uuid', () => ({
  v4: () => mockUuid
}));

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.RESEND_API_KEY = 'test-api-key';
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Publisher Registration API', () => {
  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    mockSendEmail.mockClear();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('POST /api/auth/publisher/register - successful registration', async () => {
    const { POST } = await import('@/app/api/auth/publisher/register/route');

    const requestBody = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      contactName: 'Test User',
      companyName: 'Test Company'
    };

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const response = await POST(request);
    const data = await response.json();

    // Should return success response
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toContain('check your email to verify');
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.name).toBe('Test User');
    expect(data.user.status).toBe('pending');

    // Should create publisher in database
    const publisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, 'test@example.com')
    });

    expect(publisher).toBeTruthy();
    expect(publisher?.emailVerified).toBe(false);
    expect(publisher?.status).toBe('pending');
    expect(publisher?.emailVerificationToken).toBe(mockUuid);
    expect(publisher?.contactName).toBe('Test User');
    expect(publisher?.companyName).toBe('Test Company');

    // Should send verification email
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Verify Your Publisher Account',
      html: expect.stringContaining('Welcome to Our Publisher Platform!'),
      emailType: 'verification'
    });

    // Email should contain verification link
    const emailCall = mockSendEmail.mock.calls[0][0];
    expect(emailCall.html).toContain(`/publisher/verify?token=${mockUuid}`);
    expect(emailCall.html).toContain('Test User');
  });

  test('POST /api/auth/publisher/register - validation errors', async () => {
    const { POST } = await import('@/app/api/auth/publisher/register/route');

    // Test missing required fields
    const request1 = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
        // Missing password and contactName
      })
    });

    const response1 = await POST(request1);
    const data1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(data1.error).toContain('Email, password, and contact name are required');

    // Test invalid email format
    const request2 = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'TestPassword123!',
        contactName: 'Test User'
      })
    });

    const response2 = await POST(request2);
    const data2 = await response2.json();

    expect(response2.status).toBe(400);
    expect(data2.error).toContain('Invalid email format');

    // Test weak password
    const request3 = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123',
        contactName: 'Test User'
      })
    });

    const response3 = await POST(request3);
    const data3 = await response3.json();

    expect(response3.status).toBe(400);
    expect(data3.error).toContain('Password must be at least 8 characters');
  });

  test('POST /api/auth/publisher/register - duplicate email', async () => {
    const { POST } = await import('@/app/api/auth/publisher/register/route');

    // Create existing publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await testDb.insert(publishers).values({
      id: 'existing-publisher',
      email: 'existing@example.com',
      password: hashedPassword,
      contactName: 'Existing User',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Try to register with same email
    const request = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'TestPassword123!',
        contactName: 'New User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('publisher account with this email already exists');
  });

  test('POST /api/auth/publisher/register - handles email service failure', async () => {
    const { POST } = await import('@/app/api/auth/publisher/register/route');

    // Mock email service to fail
    mockSendEmail.mockRejectedValueOnce(new Error('Email service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
        contactName: 'Test User'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed even if email fails
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);

    // Publisher should still be created
    const publisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, 'test@example.com')
    });

    expect(publisher).toBeTruthy();
    expect(publisher?.emailVerified).toBe(false);
    expect(publisher?.status).toBe('pending');
  });
});

describe('Publisher Email Verification API', () => {
  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    mockSendEmail.mockClear();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('GET /api/auth/publisher/verify-email - successful verification', async () => {
    const { GET } = await import('@/app/api/auth/publisher/verify-email/route');

    // Create unverified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const verificationToken = 'test-verification-token';
    
    await testDb.insert(publishers).values({
      id: 'test-publisher',
      email: 'test@example.com',
      password: hashedPassword,
      contactName: 'Test User',
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Verify email
    const request = new NextRequest(`http://localhost:3000/api/auth/publisher/verify-email?token=${verificationToken}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Email verified successfully');
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.status).toBe('active');

    // Check database was updated
    const updatedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, 'test@example.com')
    });

    expect(updatedPublisher?.emailVerified).toBe(true);
    expect(updatedPublisher?.status).toBe('active');
    expect(updatedPublisher?.emailVerificationToken).toBeNull();
  });

  test('GET /api/auth/publisher/verify-email - invalid token', async () => {
    const { GET } = await import('@/app/api/auth/publisher/verify-email/route');

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/verify-email?token=invalid-token');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid or expired verification token');
  });

  test('GET /api/auth/publisher/verify-email - missing token', async () => {
    const { GET } = await import('@/app/api/auth/publisher/verify-email/route');

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/verify-email');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Verification token is required');
  });

  test('POST /api/auth/publisher/verify-email - resend verification email', async () => {
    const { POST } = await import('@/app/api/auth/publisher/verify-email/route');

    // Create unverified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await testDb.insert(publishers).values({
      id: 'test-publisher',
      email: 'test@example.com',
      password: hashedPassword,
      contactName: 'Test User',
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: 'old-token',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Verification email sent successfully');

    // Check new token was generated
    const updatedPublisher = await testDb.query.publishers.findFirst({
      where: eq(publishers.email, 'test@example.com')
    });

    expect(updatedPublisher?.emailVerificationToken).toBe(mockUuid);
    expect(updatedPublisher?.emailVerificationToken).not.toBe('old-token');

    // Should send new verification email
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Verify Your Publisher Account',
      html: expect.stringContaining('Test User'),
      emailType: 'verification'
    });
  });

  test('POST /api/auth/publisher/verify-email - email not found', async () => {
    const { POST } = await import('@/app/api/auth/publisher/verify-email/route');

    const request = new NextRequest('http://localhost:3000/api/auth/publisher/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('No unverified account found');
  });
});

describe('Publisher Login with Email Verification', () => {
  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('POST /api/publisher/auth/login - blocks unverified email', async () => {
    const { POST } = await import('@/app/api/publisher/auth/login/route');

    // Create unverified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await testDb.insert(publishers).values({
      id: 'test-publisher',
      email: 'test@example.com',
      password: hashedPassword,
      contactName: 'Test User',
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: 'test-token',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const request = new NextRequest('http://localhost:3000/api/publisher/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Please verify your email address');
    expect(data.emailVerified).toBe(false);
    expect(data.email).toBe('test@example.com');
  });

  test('POST /api/publisher/auth/login - allows verified email', async () => {
    const { POST } = await import('@/app/api/publisher/auth/login/route');

    // Create verified publisher
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await testDb.insert(publishers).values({
      id: 'test-publisher',
      email: 'test@example.com',
      password: hashedPassword,
      contactName: 'Test User',
      status: 'active',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const request = new NextRequest('http://localhost:3000/api/publisher/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.userType).toBe('publisher');
  });
});