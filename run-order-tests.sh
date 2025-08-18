#!/bin/bash

# Order Flow Testing Script
# Runs comprehensive frontend tests for order creation and payment flow

set -e

echo "🚀 Starting Order Flow Testing..."
echo "================================"

# Check if the application is running
echo "🔍 Checking if application is running on http://localhost:3002..."
if ! curl -s http://localhost:3002 > /dev/null; then
    echo "❌ Application is not running on localhost:3002"
    echo "   Please start the application with: npm run dev"
    exit 1
fi

echo "✅ Application is running"

# Navigate to test directory
cd tests/e2e

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Clean previous reports
echo "🧹 Cleaning previous test reports..."
npm run clean:reports

# Run the order flow tests
echo "🧪 Running order flow tests..."
echo "================================"

if [ "$1" = "--headless" ]; then
    echo "🔕 Running in headless mode..."
    npm run test:orders:headless
else
    echo "🖥️  Running with browser UI (use --headless to run without UI)..."
    npm run test:orders
fi

echo ""
echo "✅ Test execution completed!"
echo "📋 Check the reports directory for detailed results and screenshots"
echo "📁 Location: tests/e2e/reports/"