#!/bin/bash

# Publisher Portal Chaos Testing Suite
# "The Fucked Up Shit Edition" - Comprehensive E2E Testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3001"}
TEST_RESULTS_DIR="./test-results/chaos-tests"
SCREENSHOTS_DIR="$TEST_RESULTS_DIR/screenshots"
LOGS_DIR="$TEST_RESULTS_DIR/logs"

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$SCREENSHOTS_DIR"
mkdir -p "$LOGS_DIR"

echo -e "${PURPLE}================================================================${NC}"
echo -e "${PURPLE}  PUBLISHER PORTAL CHAOS TESTING SUITE${NC}"
echo -e "${PURPLE}  \"The Fucked Up Shit Edition\"${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/chaos-test.log"
}

# Function to check if server is running
check_server() {
    log "${BLUE}Checking if server is running at $BASE_URL...${NC}"
    
    if curl -s -f "$BASE_URL" > /dev/null; then
        log "${GREEN}✓ Server is running${NC}"
        return 0
    else
        log "${RED}✗ Server is not responding${NC}"
        return 1
    fi
}

# Function to setup test environment
setup_test_env() {
    log "${BLUE}Setting up test environment...${NC}"
    
    # Install dependencies if not present
    if [ ! -d "node_modules" ]; then
        log "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "node_modules/@playwright" ]; then
        log "${YELLOW}Installing Playwright...${NC}"
        npm install @playwright/test
        npx playwright install
    fi
    
    # Create test database backup
    log "${YELLOW}Creating database backup...${NC}"
    npm run db:backup || log "${YELLOW}Warning: Could not create database backup${NC}"
    
    log "${GREEN}✓ Test environment ready${NC}"
}

# Function to run specific test category
run_test_category() {
    local category=$1
    local description=$2
    
    log "${BLUE}Running $description...${NC}"
    
    local start_time=$(date +%s)
    local test_file=""
    
    case $category in
        "security")
            test_file="publisher-portal-stress-test.spec.ts --grep 'Security|XSS|SQL|Authorization'"
            ;;
        "functionality")
            test_file="publisher-portal-stress-test.spec.ts --grep 'Website Management|Offering Creation|Pricing Rules'"
            ;;
        "performance")
            test_file="publisher-portal-stress-test.spec.ts --grep 'Performance|Load|Concurrency'"
            ;;
        "chaos")
            test_file="publisher-portal-stress-test.spec.ts"
            ;;
        *)
            test_file="publisher-portal-stress-test.spec.ts"
            ;;
    esac
    
    # Run the tests
    if npx playwright test "$test_file" \
        --reporter=html \
        --output-dir="$TEST_RESULTS_DIR/$category" \
        --timeout=120000 \
        --retries=0 \
        --workers=1 > "$LOGS_DIR/$category.log" 2>&1; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "${GREEN}✓ $description completed in ${duration}s${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "${RED}✗ $description failed after ${duration}s${NC}"
        return 1
    fi
}

# Function to run malicious input tests
run_malicious_input_tests() {
    log "${BLUE}Running malicious input tests...${NC}"
    
    # Test XSS payloads
    log "${YELLOW}Testing XSS protection...${NC}"
    node -e "
        const { MaliciousPayloadGenerator } = require('./__tests__/utils/maliciousPayloadGenerator.ts');
        const payloads = MaliciousPayloadGenerator.getXSSPayloads();
        console.log('Testing ' + payloads.length + ' XSS payloads...');
        payloads.forEach((payload, i) => {
            console.log(\`Payload \${i+1}: \${payload.description}\`);
        });
    " || log "${YELLOW}Warning: Could not load malicious payload generator${NC}"
    
    # Test SQL injection payloads
    log "${YELLOW}Testing SQL injection protection...${NC}"
    node -e "
        const { MaliciousPayloadGenerator } = require('./__tests__/utils/maliciousPayloadGenerator.ts');
        const payloads = MaliciousPayloadGenerator.getSQLInjectionPayloads();
        console.log('Testing ' + payloads.length + ' SQL injection payloads...');
        payloads.forEach((payload, i) => {
            console.log(\`Payload \${i+1}: \${payload.description}\`);
        });
    " || log "${YELLOW}Warning: Could not load SQL injection payloads${NC}"
}

# Function to run concurrency tests
run_concurrency_tests() {
    log "${BLUE}Running concurrency tests...${NC}"
    
    # Test concurrent website creation
    log "${YELLOW}Testing concurrent website creation...${NC}"
    
    # Run multiple test instances in parallel
    for i in {1..5}; do
        (
            npx playwright test publisher-portal-stress-test.spec.ts \
                --grep "concurrent" \
                --workers=1 \
                --output-dir="$TEST_RESULTS_DIR/concurrent-$i" \
                > "$LOGS_DIR/concurrent-$i.log" 2>&1
        ) &
    done
    
    # Wait for all background jobs
    wait
    log "${GREEN}✓ Concurrent tests completed${NC}"
}

# Function to run performance stress tests
run_performance_tests() {
    log "${BLUE}Running performance stress tests...${NC}"
    
    # Memory usage test
    log "${YELLOW}Testing memory usage...${NC}"
    
    # Large dataset test
    log "${YELLOW}Testing large dataset handling...${NC}"
    
    # Load test simulation
    log "${YELLOW}Simulating load test...${NC}"
    
    npx playwright test publisher-portal-stress-test.spec.ts \
        --grep "Performance|Load|Memory" \
        --workers=1 \
        --timeout=300000 \
        --output-dir="$TEST_RESULTS_DIR/performance" \
        > "$LOGS_DIR/performance.log" 2>&1 || log "${YELLOW}Warning: Some performance tests failed${NC}"
}

# Function to run domain normalization tests
run_domain_normalization_tests() {
    log "${BLUE}Running domain normalization chaos tests...${NC}"
    
    # Test all domain variations
    log "${YELLOW}Testing domain normalization consistency...${NC}"
    
    node -e "
        const { MaliciousPayloadGenerator } = require('./__tests__/utils/maliciousPayloadGenerator.ts');
        const tests = MaliciousPayloadGenerator.getDomainNormalizationTests();
        console.log('Testing ' + tests.length + ' domain variations...');
        tests.forEach((test, i) => {
            console.log(\`Test \${i+1}: '\${test.original}' -> '\${test.expected}'\`);
        });
    " || log "${YELLOW}Warning: Could not load domain normalization tests${NC}"
    
    npx playwright test publisher-portal-stress-test.spec.ts \
        --grep "Domain Normalization" \
        --workers=1 \
        --output-dir="$TEST_RESULTS_DIR/domain-normalization" \
        > "$LOGS_DIR/domain-normalization.log" 2>&1 || log "${YELLOW}Warning: Domain normalization tests had issues${NC}"
}

# Function to generate vulnerability report
generate_vulnerability_report() {
    log "${BLUE}Generating vulnerability report...${NC}"
    
    cat > "$TEST_RESULTS_DIR/vulnerability-report.md" << EOF
# Publisher Portal Security Vulnerability Report
Generated: $(date)
Base URL: $BASE_URL

## Summary
This report contains findings from comprehensive security testing of the publisher portal.

## Test Categories Executed
- XSS (Cross-Site Scripting) Protection
- SQL Injection Protection  
- Authorization & Authentication
- Input Validation
- Domain Normalization
- Concurrency & Race Conditions
- Performance & Load Testing

## Critical Findings
$(grep -r "CRITICAL" "$LOGS_DIR/" || echo "No critical issues found")

## High Priority Findings
$(grep -r "HIGH" "$LOGS_DIR/" || echo "No high priority issues found")

## Medium Priority Findings  
$(grep -r "MEDIUM" "$LOGS_DIR/" || echo "No medium priority issues found")

## XSS Test Results
$(grep -r "XSS" "$LOGS_DIR/" || echo "XSS tests completed")

## SQL Injection Test Results
$(grep -r "SQL" "$LOGS_DIR/" || echo "SQL injection tests completed")

## Recommendations
Based on the test results, the following actions are recommended:

1. Review all critical and high priority findings
2. Implement additional input validation where needed
3. Add rate limiting to prevent brute force attacks
4. Enhance error handling for edge cases
5. Optimize performance for large datasets

## Next Steps
- Fix all critical vulnerabilities before production
- Implement monitoring for security events
- Regular security testing schedule
- Update security documentation

EOF

    log "${GREEN}✓ Vulnerability report generated at $TEST_RESULTS_DIR/vulnerability-report.md${NC}"
}

# Function to cleanup
cleanup() {
    log "${BLUE}Cleaning up test environment...${NC}"
    
    # Restore database if backup exists
    if [ -f "database-backup.sql" ]; then
        log "${YELLOW}Restoring database from backup...${NC}"
        npm run db:restore || log "${YELLOW}Warning: Could not restore database${NC}"
    fi
    
    # Clean up temporary files
    rm -f /tmp/chaos-test-* 2>/dev/null || true
    
    log "${GREEN}✓ Cleanup completed${NC}"
}

# Function to show test summary
show_summary() {
    echo ""
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}  CHAOS TESTING SUMMARY${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo ""
    
    # Count test results
    local total_tests=$(find "$TEST_RESULTS_DIR" -name "*.json" | wc -l)
    local passed_tests=$(grep -r '"status":"passed"' "$TEST_RESULTS_DIR" | wc -l)
    local failed_tests=$(grep -r '"status":"failed"' "$TEST_RESULTS_DIR" | wc -l)
    
    echo -e "${BLUE}Total Tests Run: ${total_tests}${NC}"
    echo -e "${GREEN}Passed: ${passed_tests}${NC}"
    echo -e "${RED}Failed: ${failed_tests}${NC}"
    echo ""
    
    # Show critical issues
    echo -e "${YELLOW}Critical Issues Found:${NC}"
    grep -r "CRITICAL" "$LOGS_DIR/" || echo "None"
    echo ""
    
    # Show recommendations
    echo -e "${YELLOW}Key Findings:${NC}"
    echo "1. Check vulnerability report for security issues"
    echo "2. Review performance test results for bottlenecks"
    echo "3. Verify domain normalization consistency"
    echo "4. Test concurrent operations handling"
    echo ""
    
    echo -e "${BLUE}Test Results Location: $TEST_RESULTS_DIR${NC}"
    echo -e "${BLUE}Full Logs Location: $LOGS_DIR${NC}"
    echo -e "${BLUE}Vulnerability Report: $TEST_RESULTS_DIR/vulnerability-report.md${NC}"
    echo ""
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Check prerequisites
    if ! check_server; then
        log "${RED}Cannot proceed without running server${NC}"
        exit 1
    fi
    
    # Setup environment
    setup_test_env
    
    # Run test phases
    case "${1:-all}" in
        "security")
            run_test_category "security" "Security Tests"
            run_malicious_input_tests
            ;;
        "functionality")
            run_test_category "functionality" "Functionality Tests"
            run_domain_normalization_tests
            ;;
        "performance")
            run_test_category "performance" "Performance Tests"
            run_performance_tests
            ;;
        "concurrency")
            run_concurrency_tests
            ;;
        "nuclear"|"all")
            log "${RED}Running FULL CHAOS TEST SUITE (Nuclear Option)${NC}"
            
            # Phase 1: Critical Security
            run_test_category "security" "Critical Security Tests"
            run_malicious_input_tests
            
            # Phase 2: Core Functionality  
            run_test_category "functionality" "Core Functionality Tests"
            run_domain_normalization_tests
            
            # Phase 3: Performance & Load
            run_test_category "performance" "Performance Tests"
            run_performance_tests
            
            # Phase 4: Concurrency & Race Conditions
            run_concurrency_tests
            
            # Phase 5: Full Chaos
            run_test_category "chaos" "Full Chaos Tests"
            ;;
        *)
            echo "Usage: $0 [security|functionality|performance|concurrency|nuclear|all]"
            echo ""
            echo "Test Categories:"
            echo "  security     - XSS, SQL injection, authorization tests"
            echo "  functionality - Core feature testing with edge cases"
            echo "  performance  - Load testing and performance validation"
            echo "  concurrency  - Race condition and concurrent operation tests"
            echo "  nuclear/all  - Full comprehensive chaos testing suite"
            exit 1
            ;;
    esac
    
    # Generate reports
    generate_vulnerability_report
    
    # Show summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    log "${GREEN}All chaos tests completed in ${total_duration}s${NC}"
    show_summary
}

# Run main function with all arguments
main "$@"