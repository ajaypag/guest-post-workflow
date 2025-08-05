# Security Testing Guide

Test your API endpoint protection with these built-in security testing tools.

## 🎯 Testing Tools Available

### 1. Web Security Dashboard
**URL**: `/security-test`

A comprehensive web interface that simulates unauthenticated attacks on your API endpoints.

**Features**:
- Tests 25+ critical endpoints
- Real-time results with status codes
- Color-coded security status
- Response time monitoring
- Categorized by endpoint type (Admin, Workflows, Public, etc.)
- Security recommendations

**How to use**:
1. Visit `/security-test` in your browser
2. Click "Run Security Tests"
3. Review results for any exposed endpoints
4. All admin/business endpoints should show 401/403 status

### 2. API Security Scanner
**URL**: `/api/security-scan`

Automated API endpoint that returns a JSON security report.

**Usage**:
```bash
curl https://yourapp.com/api/security-scan
```

**Response includes**:
- Summary statistics
- Detailed test results
- Performance metrics
- Security recommendations

### 3. CLI Security Test Script
**File**: `scripts/security-test.ts`

Command-line security testing script for CI/CD integration.

**Usage**:
```bash
# Local testing
npx tsx scripts/security-test.ts

# Production testing
NEXTAUTH_URL=https://yourapp.com npx tsx scripts/security-test.ts
```

**Features**:
- Exit code 1 if security issues found
- Perfect for CI/CD pipelines
- Colored terminal output
- Summary statistics

## 🔍 What Gets Tested

### Protected Endpoints (Should return 401/403)
- **Admin APIs**: `/api/admin/*` - Only internal users
- **Workflows**: `/api/workflows/*` - Requires authentication
- **Clients**: `/api/clients/*` - Requires authentication  
- **Orders**: `/api/orders/*` - Requires authentication
- **Bulk Analysis**: `/api/bulk-analysis/*` - Requires authentication

### Public Endpoints (Should be accessible)
- **Authentication**: `/api/auth/*` - Login/logout
- **Invitations**: `/api/accept-invitation/*` - Public signup flow
- **Account Signup**: `/api/accounts/signup` - Registration

### Webhook Endpoints (Have own authentication)
- **Airtable**: `/api/airtable/webhook` - Secret token
- **Chatwoot**: `/api/webhooks/chatwoot` - Signature verification

## 📊 Understanding Results

### Status Codes
- **401 Unauthorized** ✅ - Endpoint properly protected
- **403 Forbidden** ✅ - User authenticated but insufficient permissions
- **200 OK** ⚠️ - May indicate exposed endpoint (unless public)
- **405 Method Not Allowed** ✅ - Expected for GET on POST-only endpoints
- **500 Server Error** ❌ - Application error, needs investigation

### Security Status
- **🟢 Protected** - Endpoint correctly requires authentication
- **🔴 Exposed** - Endpoint accessible without authentication (security risk)
- **🟡 Public** - Intentionally public endpoint (expected)

## 🚨 Security Issues Found?

If tests find exposed endpoints:

1. **Check Middleware Configuration**
   ```typescript
   // Ensure these paths are protected in middleware.ts
   if (path.startsWith('/api/admin') || 
       path.startsWith('/api/workflows') ||
       path.startsWith('/api/clients')) {
     // Authentication required
   }
   ```

2. **Verify Environment Variables**
   ```bash
   # Required for JWT verification
   JWT_SECRET=your-secret-key
   NEXTAUTH_SECRET=your-next-auth-secret
   ```

3. **Test Individual Endpoints**
   ```bash
   # Should return 401
   curl -X GET https://yourapp.com/api/admin/users
   
   # Should return 401  
   curl -X GET https://yourapp.com/api/workflows
   ```

## 🔒 CI/CD Integration

Add security testing to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Security Test
  run: |
    NEXTAUTH_URL=${{ secrets.PRODUCTION_URL }} npx tsx scripts/security-test.ts
  env:
    NODE_ENV: production
```

```bash
# Shell script example
#!/bin/bash
echo "🔒 Running security tests..."
if npx tsx scripts/security-test.ts; then
  echo "✅ Security tests passed"
else
  echo "❌ Security issues found - deployment blocked"
  exit 1
fi
```

## 🛡️ Best Practices

1. **Run tests after each deployment**
2. **Test both staging and production environments**
3. **Monitor for new endpoints that might not be protected**
4. **Set up alerts for security test failures**
5. **Review security reports regularly**

## 📈 Advanced Security Testing

For more comprehensive security testing, consider:

1. **OWASP ZAP** - Automated security scanner
2. **Burp Suite** - Professional web security testing
3. **Custom penetration testing** - Third-party security audit
4. **Rate limiting tests** - Test for DDoS protection
5. **Input validation tests** - SQL injection, XSS testing

## 🎯 Expected Results

After implementing middleware, you should see:
- **0 exposed endpoints** in protected categories
- **All admin endpoints** returning 401/403
- **All business endpoints** returning 401/403
- **Public endpoints** working normally
- **Webhooks** having their own authentication

## 📞 Troubleshooting

### Common Issues
1. **All endpoints return 200** - Middleware not working
2. **Random failures** - JWT secret not configured
3. **Some endpoints work** - Incomplete middleware coverage
4. **Webhooks fail** - Need to exclude from auth

### Debug Steps
1. Check middleware.ts is in project root
2. Verify NEXTAUTH_SECRET environment variable
3. Test with browser developer tools
4. Check server logs for auth errors
5. Test with Postman/curl manually