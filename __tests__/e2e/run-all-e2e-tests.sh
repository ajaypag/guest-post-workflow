#!/bin/bash

# Frontend E2E Test Runner for Publisher Workflow System
# Comprehensive testing suite for all publisher workflow pages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
PLAYWRIGHT_CONFIG="playwright.config.ts"
TEST_DIR="__tests__/e2e"
REPORT_DIR="playwright-report"
RESULTS_DIR="test-results"

# Clear previous results
echo -e "${BLUE}🧹 Cleaning up previous test results...${NC}"
rm -rf "$REPORT_DIR" "$RESULTS_DIR"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# Function to run test and capture results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if npx playwright test "$test_file" --config="$PLAYWRIGHT_CONFIG"; then
        echo -e "${GREEN}✅ $test_name - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name - FAILED${NC}"
        return 1
    fi
}

# Function to check if dev server is running
check_dev_server() {
    echo -e "${BLUE}🔍 Checking if dev server is running on localhost:3000...${NC}"
    
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ Dev server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Dev server is not running on localhost:3000${NC}"
        echo -e "${YELLOW}Please start the dev server with: npm run dev${NC}"
        return 1
    fi
}

# Function to install dependencies if needed
check_dependencies() {
    echo -e "${BLUE}📦 Checking dependencies...${NC}"
    
    if ! npx playwright --version > /dev/null 2>&1; then
        echo -e "${YELLOW}Installing Playwright...${NC}"
        npx playwright install
    fi
    
    if ! npm list @axe-core/playwright > /dev/null 2>&1; then
        echo -e "${YELLOW}Installing accessibility testing dependencies...${NC}"
        npm install --save-dev @axe-core/playwright
    fi
    
    echo -e "${GREEN}✅ Dependencies ready${NC}"
}

# Function to generate summary report
generate_summary() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE} TEST EXECUTION SUMMARY${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo -e "Total Test Suites: $total_tests"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! Publisher workflow is ready for production.${NC}"
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please review the failures above.${NC}"
    fi
    
    echo -e "\n${BLUE}📊 View detailed results:${NC}"
    echo -e "HTML Report: npx playwright show-report"
    echo -e "Test Results: ${RESULTS_DIR}/"
}

# Main execution
print_section "FRONTEND E2E TEST SUITE - PUBLISHER WORKFLOW"

# Pre-flight checks
check_dependencies
check_dev_server || exit 1

# Test counters
total_tests=0
passed_tests=0
failed_tests=0

print_section "1. ADMIN MIGRATION INTERFACE TESTS"
if run_test "admin-migrations.spec.ts" "Admin Migration Dashboard"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "2. INTERNAL ORDER ASSIGNMENT TESTS"
if run_test "internal-order-assignment.spec.ts" "Internal Order Assignment Flow"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "3. PUBLISHER DASHBOARD & ORDER MANAGEMENT TESTS"
if run_test "publisher-dashboard.spec.ts" "Publisher Dashboard & Order Management"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "4. PUBLISHER INVOICE MANAGEMENT TESTS"
if run_test "publisher-invoices.spec.ts" "Publisher Invoice & Payment Profile"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "5. EXISTING PUBLISHER WORKFLOW TESTS"
if run_test "publisher-workflow.spec.ts" "Complete Publisher Workflow Integration"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "6. ACCESSIBILITY COMPLIANCE TESTS"
if run_test "accessibility.spec.ts" "WCAG 2.1 Accessibility Compliance"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

print_section "7. RESPONSIVE DESIGN TESTS"
if run_test "responsive-design.spec.ts" "Mobile/Tablet/Desktop Responsive Design"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Generate final report
generate_summary $total_tests $passed_tests $failed_tests

# Generate HTML report
echo -e "\n${BLUE}📊 Generating HTML report...${NC}"
npx playwright show-report --host=0.0.0.0 &
REPORT_PID=$!

echo -e "${GREEN}✅ Test execution complete!${NC}"
echo -e "${BLUE}Report server started on http://localhost:9323${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the report server${NC}"

# Exit with appropriate code
if [ $failed_tests -eq 0 ]; then
    exit 0
else
    exit 1
fi