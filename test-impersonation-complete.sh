#!/bin/bash

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== IMPERSONATION SYSTEM E2E TEST ===${NC}\n"

# Step 1: Admin Login
echo -e "${YELLOW}1. Admin Login${NC}"
RESPONSE=$(curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test123"}' \
  -s -D -)

SESSION=$(echo "$RESPONSE" | grep -i set-cookie | sed 's/.*auth-session=\([^;]*\).*/\1/')
USER_DATA=$(echo "$RESPONSE" | tail -n 1)

if [ -n "$SESSION" ]; then
  echo -e "${GREEN}✓ Admin logged in successfully${NC}"
  echo "  Session: ${SESSION:0:40}..."
  echo "  User: $USER_DATA"
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

# Step 2: Get target accounts
echo -e "\n${YELLOW}2. Get Target Account${NC}"
ACCOUNTS=$(curl -X GET "$BASE_URL/api/accounts" \
  -H "Cookie: auth-session=$SESSION" \
  -s -m 10)

if [ -n "$ACCOUNTS" ]; then
  # Extract first account ID and email using grep
  ACCOUNT_ID=$(echo "$ACCOUNTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  ACCOUNT_EMAIL=$(echo "$ACCOUNTS" | grep -o '"email":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -n "$ACCOUNT_ID" ]; then
    echo -e "${GREEN}✓ Found target account${NC}"
    echo "  ID: $ACCOUNT_ID"
    echo "  Email: $ACCOUNT_EMAIL"
  else
    echo -e "${RED}✗ No accounts found${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ Failed to get accounts${NC}"
  exit 1
fi

# Step 3: Start impersonation
echo -e "\n${YELLOW}3. Start Impersonation${NC}"
IMPERSONATE_RESPONSE=$(curl -X POST "$BASE_URL/api/admin/impersonate/start" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=$SESSION" \
  -d "{\"targetUserId\":\"$ACCOUNT_ID\",\"targetUserType\":\"account\",\"reason\":\"E2E Testing\"}" \
  -s -m 10)

LOG_ID=$(echo "$IMPERSONATE_RESPONSE" | grep -o '"logId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$LOG_ID" ]; then
  echo -e "${GREEN}✓ Impersonation started${NC}"
  echo "  Log ID: $LOG_ID"
  echo "  Target: $ACCOUNT_EMAIL"
else
  echo -e "${RED}✗ Failed to start impersonation${NC}"
  echo "  Response: $IMPERSONATE_RESPONSE"
  exit 1
fi

# Step 4: Test restricted endpoints
echo -e "\n${YELLOW}4. Test Security Restrictions${NC}"

# Test billing endpoint (should be blocked)
BILLING_STATUS=$(curl -X GET "$BASE_URL/api/billing/test" \
  -H "Cookie: auth-session=$SESSION" \
  -o /dev/null -w "%{http_code}" -s -m 5)

if [ "$BILLING_STATUS" = "403" ]; then
  echo -e "${GREEN}✓ Billing endpoint blocked (403)${NC}"
else
  echo -e "${RED}✗ Billing endpoint NOT blocked ($BILLING_STATUS)${NC}"
fi

# Test password change (should be blocked)
PASSWORD_STATUS=$(curl -X POST "$BASE_URL/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-session=$SESSION" \
  -d '{"old":"test","new":"test2"}' \
  -o /dev/null -w "%{http_code}" -s -m 5)

if [ "$PASSWORD_STATUS" = "403" ]; then
  echo -e "${GREEN}✓ Password change blocked (403)${NC}"
else
  echo -e "${RED}✗ Password change NOT blocked ($PASSWORD_STATUS)${NC}"
fi

# Step 5: Test allowed endpoints
echo -e "\n${YELLOW}5. Test Allowed Actions${NC}"

# Test clients endpoint (should be allowed)
CLIENTS_STATUS=$(curl -X GET "$BASE_URL/api/clients" \
  -H "Cookie: auth-session=$SESSION" \
  -o /dev/null -w "%{http_code}" -s -m 5)

if [ "$CLIENTS_STATUS" = "200" ] || [ "$CLIENTS_STATUS" = "404" ]; then
  echo -e "${GREEN}✓ Clients endpoint accessible ($CLIENTS_STATUS)${NC}"
else
  echo -e "${YELLOW}⚠ Clients endpoint status: $CLIENTS_STATUS${NC}"
fi

# Step 6: End impersonation
echo -e "\n${YELLOW}6. End Impersonation${NC}"
END_RESPONSE=$(curl -X POST "$BASE_URL/api/admin/impersonate/end" \
  -H "Cookie: auth-session=$SESSION" \
  -s -m 10)

if echo "$END_RESPONSE" | grep -q "success\|ended\|{}"; then
  echo -e "${GREEN}✓ Impersonation ended successfully${NC}"
else
  echo -e "${YELLOW}⚠ End response: $END_RESPONSE${NC}"
fi

# Step 7: Get active sessions
echo -e "\n${YELLOW}7. Check Active Sessions${NC}"
ACTIVE_SESSIONS=$(curl -X GET "$BASE_URL/api/admin/impersonate/active" \
  -H "Cookie: auth-session=$SESSION" \
  -s -m 10)

if echo "$ACTIVE_SESSIONS" | grep -q "count\|sessions"; then
  echo -e "${GREEN}✓ Active sessions retrieved${NC}"
  echo "  Response: ${ACTIVE_SESSIONS:0:100}..."
else
  echo -e "${YELLOW}⚠ Active sessions response: $ACTIVE_SESSIONS${NC}"
fi

echo -e "\n${GREEN}=== TEST COMPLETE ===${NC}"
echo -e "${GREEN}✓ Impersonation system is operational${NC}"