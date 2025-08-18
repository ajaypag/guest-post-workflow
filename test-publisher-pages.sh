#!/bin/bash

# Test all publisher portal pages
echo "Testing Publisher Portal Pages"
echo "=============================="
echo ""

BASE_URL="http://localhost:3000"

# Function to test a URL
test_url() {
    local path=$1
    local description=$2
    
    # Get status code
    status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
    
    # Get response body for error messages
    if [ "$status" = "500" ]; then
        echo "❌ $status - $path - $description"
        echo "   Error details:"
        curl -s "${BASE_URL}${path}" 2>/dev/null | grep -oP '(?<=<pre>).*?(?=</pre>)' | head -n 3
    elif [ "$status" = "200" ]; then
        echo "✅ $status - $path - $description"
    elif [ "$status" = "307" ] || [ "$status" = "302" ]; then
        echo "🔄 $status - $path - $description (Redirect - likely auth required)"
    elif [ "$status" = "404" ]; then
        echo "⚠️  $status - $path - $description (Not found)"
    else
        echo "❓ $status - $path - $description"
    fi
}

echo "=== Authentication Pages ==="
test_url "/publisher/login" "Publisher Login"
test_url "/publisher/signup" "Publisher Signup"
test_url "/publisher/verify" "Email Verification"
test_url "/publisher/verify-pending" "Verification Pending"

echo ""
echo "=== Dashboard Pages (Auth Required) ==="
test_url "/publisher" "Publisher Dashboard"
test_url "/publisher/websites" "Websites List"
test_url "/publisher/websites/claim" "Claim/Add Website"
test_url "/publisher/offerings" "Publisher Offerings"
test_url "/publisher/offerings/new" "New Offering"
test_url "/publisher/earnings" "Earnings"
test_url "/publisher/orders" "Orders"
test_url "/publisher/analytics" "Analytics"
test_url "/publisher/settings" "Settings"

echo ""
echo "=== API Endpoints ==="
test_url "/api/publisher/websites/search?domain=example.com" "Search Website API"
test_url "/api/publisher/websites/add" "Add Website API (POST)"
test_url "/api/publisher/websites/claim" "Claim Website API (POST)"
test_url "/api/publisher/offerings" "Offerings API"

echo ""
echo "=== Internal Portal Pages ==="
test_url "/internal" "Internal Dashboard"
test_url "/internal/websites" "Internal Websites Management"
test_url "/internal/publishers" "Internal Publishers Management"

echo ""
echo "=== Account Pages ==="
test_url "/login" "Account Login"
test_url "/signup" "Account Signup"
test_url "/account" "Account Dashboard"

echo ""
echo "=== Admin Pages ==="
test_url "/admin" "Admin Dashboard"
test_url "/admin/publisher-migrations" "Publisher Migrations"
test_url "/admin/domain-migration" "Domain Migration"