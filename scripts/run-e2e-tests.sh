#!/bin/bash

echo "🧪 Running Publisher Portal E2E Tests"
echo "======================================="

# Stop the dev server if it's running
echo "Stopping any existing dev server..."
pkill -f "next dev" || true

# Set environment variables for testing
export E2E_TESTING=true
export NODE_ENV=development

# Start the dev server in the background
echo "Starting dev server with E2E testing mode..."
npm run dev &
DEV_PID=$!

# Wait for the server to be ready
echo "Waiting for server to be ready..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:3001 > /dev/null; then
  echo "❌ Dev server failed to start"
  kill $DEV_PID 2>/dev/null
  exit 1
fi

echo "✅ Server is ready"

# Run the seed script to ensure test data exists
echo "Seeding test publisher data..."
npm run ts-node scripts/seed-test-publisher.ts

# Run the E2E tests
echo "Running Playwright tests..."
npx playwright test __tests__/e2e/ --reporter=list

# Capture the test exit code
TEST_EXIT_CODE=$?

# Stop the dev server
echo "Stopping dev server..."
kill $DEV_PID 2>/dev/null

# Exit with the test exit code
exit $TEST_EXIT_CODE