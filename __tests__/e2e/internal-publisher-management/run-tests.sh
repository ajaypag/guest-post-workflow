#!/bin/bash

# Internal Publisher Management E2E Test Runner
# This script runs all internal publisher management tests and generates a comprehensive report

set -e

echo "🚀 Internal Publisher Management E2E Test Suite"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if development server is running
if ! curl -s http://localhost:3002 > /dev/null; then
    print_error "Development server not running on port 3002"
    print_status "Please start the server with: npm run dev"
    exit 1
fi

print_success "Development server is running"

# Check if playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    print_error "Playwright not installed"
    print_status "Installing Playwright..."
    npx playwright install
fi

print_success "Playwright is ready"

# Create reports directory
mkdir -p test-reports/internal-publisher-management
REPORT_DIR="test-reports/internal-publisher-management"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo ""
print_status "Starting test execution..."
echo ""

# Test 1: Current State Failures (Document Issues)
echo "📋 Test 1: Current State Failures (Documenting Issues)"
echo "------------------------------------------------------"
print_status "Running current state failure tests..."
print_warning "These tests are EXPECTED TO FAIL - they document current issues"

if npx playwright test __tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts \
    --reporter=json --output="$REPORT_DIR/01-current-state-failures_$TIMESTAMP.json" > /dev/null 2>&1; then
    print_warning "Current state tests passed - some functionality may already be working"
else
    print_status "Current state tests failed as expected - issues documented"
fi

# Generate readable report for current state
npx playwright test __tests__/e2e/internal-publisher-management/01-current-state-failures.spec.ts \
    --reporter=line > "$REPORT_DIR/01-current-state-summary.txt" 2>&1 || true

echo ""

# Test 2: Ideal Future State (Target Functionality)
echo "🎯 Test 2: Ideal Future State (Target Functionality)"
echo "-----------------------------------------------------"
print_status "Running ideal future state tests..."
print_status "These tests define how the system SHOULD work"

if npx playwright test __tests__/e2e/internal-publisher-management/02-ideal-future-state.spec.ts \
    --reporter=json --output="$REPORT_DIR/02-ideal-future-state_$TIMESTAMP.json" > /dev/null 2>&1; then
    print_success "Future state tests passed - functionality is working!"
    FUTURE_STATE_PASSED=true
else
    print_status "Future state tests failed - functionality needs implementation"
    FUTURE_STATE_PASSED=false
fi

npx playwright test __tests__/e2e/internal-publisher-management/02-ideal-future-state.spec.ts \
    --reporter=line > "$REPORT_DIR/02-future-state-summary.txt" 2>&1 || true

echo ""

# Test 3: Specific Scenarios (Complex Workflows)
echo "🔄 Test 3: Specific Scenarios (Complex Workflows)"
echo "-------------------------------------------------"
print_status "Running specific scenario tests..."

if npx playwright test __tests__/e2e/internal-publisher-management/03-specific-scenarios.spec.ts \
    --reporter=json --output="$REPORT_DIR/03-specific-scenarios_$TIMESTAMP.json" > /dev/null 2>&1; then
    print_success "Scenario tests passed - complex workflows working!"
    SCENARIOS_PASSED=true
else
    print_status "Scenario tests failed - complex workflows need work"
    SCENARIOS_PASSED=false
fi

npx playwright test __tests__/e2e/internal-publisher-management/03-specific-scenarios.spec.ts \
    --reporter=line > "$REPORT_DIR/03-scenarios-summary.txt" 2>&1 || true

echo ""

# Test 4: Security Tests (Access Controls)
echo "🔒 Test 4: Security Tests (Access Controls)"
echo "-------------------------------------------"
print_status "Running security and authorization tests..."

if npx playwright test __tests__/e2e/internal-publisher-management/04-security-tests.spec.ts \
    --reporter=json --output="$REPORT_DIR/04-security-tests_$TIMESTAMP.json" > /dev/null 2>&1; then
    print_success "Security tests passed - access controls working!"
    SECURITY_PASSED=true
else
    print_status "Security tests failed - access controls need implementation"
    SECURITY_PASSED=false
fi

npx playwright test __tests__/e2e/internal-publisher-management/04-security-tests.spec.ts \
    --reporter=line > "$REPORT_DIR/04-security-summary.txt" 2>&1 || true

echo ""

# Generate comprehensive HTML report
print_status "Generating comprehensive HTML report..."
npx playwright test __tests__/e2e/internal-publisher-management/ \
    --reporter=html --output="$REPORT_DIR/html-report" > /dev/null 2>&1 || true

# Generate summary report
echo "📊 Test Execution Summary"
echo "========================="
echo ""
echo "Timestamp: $(date)"
echo "Test Reports Location: $REPORT_DIR"
echo ""

# Current State Analysis
print_status "Current State Analysis:"
if grep -q "CURRENT ISSUE" "$REPORT_DIR/01-current-state-summary.txt" 2>/dev/null; then
    print_warning "Issues documented (as expected):"
    grep "CURRENT ISSUE" "$REPORT_DIR/01-current-state-summary.txt" | head -5 || true
else
    print_success "No critical issues found in current state"
fi
echo ""

# Implementation Progress
print_status "Implementation Progress:"
if [ "$FUTURE_STATE_PASSED" = true ]; then
    print_success "✅ Core functionality implemented and working"
else
    print_warning "⏳ Core functionality needs implementation"
fi

if [ "$SCENARIOS_PASSED" = true ]; then
    print_success "✅ Complex workflows implemented and working"
else
    print_warning "⏳ Complex workflows need implementation"
fi

if [ "$SECURITY_PASSED" = true ]; then
    print_success "✅ Security controls implemented and working"
else
    print_warning "⏳ Security controls need implementation"
fi
echo ""

# Recommendations
print_status "Recommendations:"
if [ "$FUTURE_STATE_PASSED" = false ]; then
    echo "1. 🔧 Fix core publisher management functionality first"
    echo "   - Implement /internal/publishers route"
    echo "   - Fix API endpoint authorization for internal users"
    echo "   - Create publisher detail pages"
fi

if [ "$SECURITY_PASSED" = false ]; then
    echo "2. 🔒 Implement security controls"
    echo "   - Add proper authentication checks"
    echo "   - Implement role-based authorization"
    echo "   - Add input validation and CSRF protection"
fi

if [ "$SCENARIOS_PASSED" = false ]; then
    echo "3. 🔄 Implement complex workflows"
    echo "   - Publisher onboarding process"
    echo "   - Bulk operations and verification"
    echo "   - Relationship management interfaces"
fi

echo ""
print_status "Next Steps:"
echo "1. Review detailed reports in: $REPORT_DIR"
echo "2. Open HTML report: $REPORT_DIR/html-report/index.html"
echo "3. Address failing tests in priority order"
echo "4. Re-run tests after implementing fixes"
echo ""

# Open HTML report if on desktop environment
if command -v xdg-open > /dev/null 2>&1; then
    print_status "Opening HTML report in browser..."
    xdg-open "$REPORT_DIR/html-report/index.html" 2>/dev/null &
elif command -v open > /dev/null 2>&1; then
    print_status "Opening HTML report in browser..."
    open "$REPORT_DIR/html-report/index.html" 2>/dev/null &
fi

print_success "Test execution completed!"
print_status "Check $REPORT_DIR for detailed results"

echo ""
echo "🎯 Success Criteria:"
echo "   Phase 1: Current state tests document issues ✅"
echo "   Phase 2: Basic management tests pass $([ "$FUTURE_STATE_PASSED" = true ] && echo "✅" || echo "⏳")"
echo "   Phase 3: Security tests pass $([ "$SECURITY_PASSED" = true ] && echo "✅" || echo "⏳")" 
echo "   Phase 4: All scenario tests pass $([ "$SCENARIOS_PASSED" = true ] && echo "✅" || echo "⏳")"
echo ""