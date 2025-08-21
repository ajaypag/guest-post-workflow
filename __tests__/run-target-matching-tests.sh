#!/bin/bash

# Target URL Matching Test Suite Runner
# Comprehensive test runner for Phase 4 target URL matching features

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_OUTPUT_DIR="$PROJECT_ROOT/test-results/target-matching"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$TEST_OUTPUT_DIR/test-run-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
USE_REAL_DATA=${USE_REAL_DATA:-false}
SKIP_UNIT_TESTS=${SKIP_UNIT_TESTS:-false}
SKIP_INTEGRATION_TESTS=${SKIP_INTEGRATION_TESTS:-false}
SKIP_E2E_TESTS=${SKIP_E2E_TESTS:-false}
PARALLEL_EXECUTION=${PARALLEL_EXECUTION:-true}
TEST_TIMEOUT=${TEST_TIMEOUT:-60000}
HEADLESS_MODE=${HEADLESS_MODE:-true}

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "${BLUE}"
    echo "=============================================================="
    echo "       TARGET URL MATCHING TEST SUITE (Phase 4)"
    echo "=============================================================="
    echo -e "${NC}"
    echo "Test run started at: $(date)"
    echo "Configuration:"
    echo "  - Use real data: $USE_REAL_DATA"
    echo "  - Skip unit tests: $SKIP_UNIT_TESTS"
    echo "  - Skip integration tests: $SKIP_INTEGRATION_TESTS"
    echo "  - Skip E2E tests: $SKIP_E2E_TESTS"
    echo "  - Parallel execution: $PARALLEL_EXECUTION"
    echo "  - Test timeout: ${TEST_TIMEOUT}ms"
    echo "  - Headless mode: $HEADLESS_MODE"
    echo "  - Output directory: $TEST_OUTPUT_DIR"
    echo "  - Log file: $LOG_FILE"
    echo "=============================================================="
}

setup_test_environment() {
    log "Setting up test environment..."
    
    # Create output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    mkdir -p "$TEST_OUTPUT_DIR/screenshots"
    mkdir -p "$TEST_OUTPUT_DIR/videos"
    mkdir -p "$TEST_OUTPUT_DIR/coverage"
    
    # Initialize log file
    touch "$LOG_FILE"
    
    # Check if development server is running
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Development server is running on port 3001"
    else
        log_warning "Development server not detected on port 3001"
        log "Starting development server..."
        
        # Start dev server in background
        cd "$PROJECT_ROOT"
        npm run dev > "$TEST_OUTPUT_DIR/dev-server.log" 2>&1 &
        DEV_SERVER_PID=$!
        
        # Wait for server to start
        for i in {1..30}; do
            if curl -s http://localhost:3001/health > /dev/null 2>&1; then
                log_success "Development server started successfully (PID: $DEV_SERVER_PID)"
                break
            fi
            
            if [ $i -eq 30 ]; then
                log_error "Failed to start development server after 30 seconds"
                exit 1
            fi
            
            sleep 1
        done
    fi
    
    # Validate database connection
    log "Validating database connection..."
    cd "$PROJECT_ROOT"
    
    if npm run db:validate > /dev/null 2>&1; then
        log_success "Database connection validated"
    else
        log_warning "Database validation failed - some tests may fail"
    fi
    
    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi
    
    log_success "Test environment setup complete"
}

run_unit_tests() {
    if [ "$SKIP_UNIT_TESTS" = "true" ]; then
        log_warning "Skipping unit tests (SKIP_UNIT_TESTS=true)"
        return 0
    fi
    
    log "Running unit tests for target URL matching..."
    
    cd "$PROJECT_ROOT"
    
    local jest_config="--testPathPattern=target-url-matching --coverage --coverageDirectory=$TEST_OUTPUT_DIR/coverage/unit"
    
    if [ "$PARALLEL_EXECUTION" = "true" ]; then
        jest_config="$jest_config --maxWorkers=4"
    else
        jest_config="$jest_config --maxWorkers=1"
    fi
    
    if npm run test:unit -- $jest_config > "$TEST_OUTPUT_DIR/unit-tests.log" 2>&1; then
        log_success "Unit tests completed successfully"
        return 0
    else
        log_error "Unit tests failed"
        tail -20 "$TEST_OUTPUT_DIR/unit-tests.log" | tee -a "$LOG_FILE"
        return 1
    fi
}

run_integration_tests() {
    if [ "$SKIP_INTEGRATION_TESTS" = "true" ]; then
        log_warning "Skipping integration tests (SKIP_INTEGRATION_TESTS=true)"
        return 0
    fi
    
    log "Running integration tests for target URL matching..."
    
    cd "$PROJECT_ROOT"
    
    local jest_config="--testPathPattern=target-url-matching-api --coverage --coverageDirectory=$TEST_OUTPUT_DIR/coverage/integration"
    
    if [ "$PARALLEL_EXECUTION" = "true" ]; then
        jest_config="$jest_config --maxWorkers=2"
    else
        jest_config="$jest_config --maxWorkers=1"
    fi
    
    if npm run test:integration -- $jest_config > "$TEST_OUTPUT_DIR/integration-tests.log" 2>&1; then
        log_success "Integration tests completed successfully"
        return 0
    else
        log_error "Integration tests failed"
        tail -20 "$TEST_OUTPUT_DIR/integration-tests.log" | tee -a "$LOG_FILE"
        return 1
    fi
}

run_e2e_tests() {
    if [ "$SKIP_E2E_TESTS" = "true" ]; then
        log_warning "Skipping E2E tests (SKIP_E2E_TESTS=true)"
        return 0
    fi
    
    log "Running E2E tests for target URL matching..."
    
    cd "$PROJECT_ROOT"
    
    local playwright_config=""
    
    if [ "$HEADLESS_MODE" = "true" ]; then
        playwright_config="$playwright_config --headed=false"
    else
        playwright_config="$playwright_config --headed=true"
    fi
    
    if [ "$PARALLEL_EXECUTION" = "true" ]; then
        playwright_config="$playwright_config --workers=2"
    else
        playwright_config="$playwright_config --workers=1"
    fi
    
    # Set environment variables for Playwright
    export BASE_URL="http://localhost:3001"
    export USE_REAL_DATA="$USE_REAL_DATA"
    export TEST_TIMEOUT="$TEST_TIMEOUT"
    export PWTEST_SCREENSHOT_ON_FAILURE="true"
    export PWTEST_VIDEO_RECORD="true"
    
    if npx playwright test __tests__/e2e/target-url-matching.spec.ts $playwright_config \
        --output-dir "$TEST_OUTPUT_DIR" \
        --reporter=html,json \
        > "$TEST_OUTPUT_DIR/e2e-tests.log" 2>&1; then
        log_success "E2E tests completed successfully"
        return 0
    else
        log_error "E2E tests failed"
        tail -20 "$TEST_OUTPUT_DIR/e2e-tests.log" | tee -a "$LOG_FILE"
        return 1
    fi
}

run_specific_test_scenarios() {
    log "Running specific test scenarios..."
    
    local scenarios=(
        "Component Rendering"
        "API Integration" 
        "User Workflows"
        "Error Handling"
        "Performance Testing"
    )
    
    for scenario in "${scenarios[@]}"; do
        log "Testing scenario: $scenario"
        
        case "$scenario" in
            "Component Rendering")
                run_component_rendering_tests
                ;;
            "API Integration")
                run_api_integration_tests
                ;;
            "User Workflows")
                run_user_workflow_tests
                ;;
            "Error Handling")
                run_error_handling_tests
                ;;
            "Performance Testing")
                run_performance_tests
                ;;
        esac
    done
}

run_component_rendering_tests() {
    log "Running component rendering tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test specific component features
    local test_patterns=(
        "MatchQualityIndicator"
        "BulkAnalysisTable.*target"
        "target.*column"
    )
    
    for pattern in "${test_patterns[@]}"; do
        if npm run test:unit -- --testNamePattern="$pattern" > /dev/null 2>&1; then
            log_success "Component test passed: $pattern"
        else
            log_error "Component test failed: $pattern"
        fi
    done
}

run_api_integration_tests() {
    log "Running API integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test API endpoints specifically
    local endpoints=(
        "target-match"
        "master-qualify.*target"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if npm run test:integration -- --testNamePattern="$endpoint" > /dev/null 2>&1; then
            log_success "API test passed: $endpoint"
        else
            log_error "API test failed: $endpoint"
        fi
    done
}

run_user_workflow_tests() {
    log "Running user workflow tests..."
    
    # Run E2E tests for specific workflows
    if [ "$SKIP_E2E_TESTS" != "true" ]; then
        cd "$PROJECT_ROOT"
        
        npx playwright test __tests__/e2e/target-url-matching.spec.ts \
            --grep "User Workflows" \
            --output-dir "$TEST_OUTPUT_DIR/workflows" \
            > "$TEST_OUTPUT_DIR/workflow-tests.log" 2>&1
    fi
}

run_error_handling_tests() {
    log "Running error handling tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test error scenarios
    npm run test:unit -- --testNamePattern="error|Error" \
        > "$TEST_OUTPUT_DIR/error-handling-tests.log" 2>&1
    
    npm run test:integration -- --testNamePattern="error|Error" \
        >> "$TEST_OUTPUT_DIR/error-handling-tests.log" 2>&1
}

run_performance_tests() {
    log "Running performance tests..."
    
    cd "$PROJECT_ROOT"
    
    # Performance-specific tests
    local perf_tests=(
        "Performance"
        "large.*dataset"
        "concurrent"
    )
    
    for test in "${perf_tests[@]}"; do
        npm run test:unit -- --testNamePattern="$test" \
            > "$TEST_OUTPUT_DIR/perf-$test.log" 2>&1 &
    done
    
    wait  # Wait for all background jobs
    log_success "Performance tests completed"
}

generate_test_report() {
    log "Generating comprehensive test report..."
    
    local report_file="$TEST_OUTPUT_DIR/test-report-$TIMESTAMP.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Target URL Matching Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Target URL Matching Test Report</h1>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Test Run ID:</strong> $TIMESTAMP</p>
    </div>

    <div class="test-section">
        <h2>Test Configuration</h2>
        <ul>
            <li><strong>Real Data:</strong> $USE_REAL_DATA</li>
            <li><strong>Parallel Execution:</strong> $PARALLEL_EXECUTION</li>
            <li><strong>Timeout:</strong> ${TEST_TIMEOUT}ms</li>
            <li><strong>Headless Mode:</strong> $HEADLESS_MODE</li>
        </ul>
    </div>

    <div class="test-section">
        <h2>Test Results Summary</h2>
        <div class="metrics">
EOF

    # Add metrics based on test results
    local unit_result=$([[ -f "$TEST_OUTPUT_DIR/unit-tests.log" ]] && grep -q "PASS" "$TEST_OUTPUT_DIR/unit-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
    local integration_result=$([[ -f "$TEST_OUTPUT_DIR/integration-tests.log" ]] && grep -q "PASS" "$TEST_OUTPUT_DIR/integration-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")
    local e2e_result=$([[ -f "$TEST_OUTPUT_DIR/e2e-tests.log" ]] && grep -q "passed" "$TEST_OUTPUT_DIR/e2e-tests.log" && echo "✅ PASSED" || echo "❌ FAILED")

    cat >> "$report_file" << EOF
            <div class="metric">
                <h3>Unit Tests</h3>
                <p>$unit_result</p>
            </div>
            <div class="metric">
                <h3>Integration Tests</h3>
                <p>$integration_result</p>
            </div>
            <div class="metric">
                <h3>E2E Tests</h3>
                <p>$e2e_result</p>
            </div>
        </div>
    </div>

    <div class="test-section">
        <h2>Coverage Report</h2>
EOF

    # Include coverage information if available
    if [ -d "$TEST_OUTPUT_DIR/coverage" ]; then
        echo "        <p>Coverage reports generated in: <code>$TEST_OUTPUT_DIR/coverage</code></p>" >> "$report_file"
    fi

    cat >> "$report_file" << EOF
    </div>

    <div class="test-section">
        <h2>Test Logs</h2>
        <h3>Main Log</h3>
        <pre>$(tail -50 "$LOG_FILE" | html_escape)</pre>
    </div>

    <div class="test-section">
        <h2>Files Generated</h2>
        <ul>
EOF

    # List generated files
    find "$TEST_OUTPUT_DIR" -type f -name "*.log" -o -name "*.html" -o -name "*.json" | while read -r file; do
        echo "            <li><a href=\"$(basename "$file")\">$(basename "$file")</a></li>" >> "$report_file"
    done

    cat >> "$report_file" << EOF
        </ul>
    </div>
</body>
</html>
EOF

    log_success "Test report generated: $report_file"
}

html_escape() {
    sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'"'"'/\&#39;/g'
}

cleanup() {
    log "Cleaning up test environment..."
    
    # Kill development server if we started it
    if [ ! -z "$DEV_SERVER_PID" ]; then
        log "Stopping development server (PID: $DEV_SERVER_PID)..."
        kill $DEV_SERVER_PID > /dev/null 2>&1 || true
    fi
    
    # Clean up any remaining processes
    pkill -f "playwright" > /dev/null 2>&1 || true
    pkill -f "jest" > /dev/null 2>&1 || true
    
    log "Cleanup complete"
}

# Main execution flow
main() {
    local exit_code=0
    
    # Setup signal handlers
    trap cleanup EXIT
    trap 'log_error "Test run interrupted"; exit 130' INT TERM
    
    print_header
    
    setup_test_environment
    
    # Run test suites
    if ! run_unit_tests; then
        exit_code=1
    fi
    
    if ! run_integration_tests; then
        exit_code=1
    fi
    
    if ! run_e2e_tests; then
        exit_code=1
    fi
    
    # Run specific scenarios
    run_specific_test_scenarios
    
    # Generate report
    generate_test_report
    
    # Final summary
    echo
    echo "=============================================================="
    if [ $exit_code -eq 0 ]; then
        log_success "ALL TARGET URL MATCHING TESTS COMPLETED SUCCESSFULLY!"
    else
        log_error "SOME TESTS FAILED - Please check the logs for details"
    fi
    echo "=============================================================="
    echo "Test results available in: $TEST_OUTPUT_DIR"
    echo "Full test log: $LOG_FILE"
    echo "Test report: $TEST_OUTPUT_DIR/test-report-$TIMESTAMP.html"
    echo "=============================================================="
    
    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --real-data)
            USE_REAL_DATA=true
            shift
            ;;
        --skip-unit)
            SKIP_UNIT_TESTS=true
            shift
            ;;
        --skip-integration)
            SKIP_INTEGRATION_TESTS=true
            shift
            ;;
        --skip-e2e)
            SKIP_E2E_TESTS=true
            shift
            ;;
        --sequential)
            PARALLEL_EXECUTION=false
            shift
            ;;
        --headed)
            HEADLESS_MODE=false
            shift
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Target URL Matching Test Runner"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --real-data          Use real database data instead of mocks"
            echo "  --skip-unit          Skip unit tests"
            echo "  --skip-integration   Skip integration tests"
            echo "  --skip-e2e          Skip end-to-end tests"
            echo "  --sequential        Run tests sequentially instead of parallel"
            echo "  --headed            Run E2E tests in headed mode (visible browser)"
            echo "  --timeout MS        Set test timeout in milliseconds (default: 60000)"
            echo "  --help, -h          Show this help message"
            echo
            echo "Examples:"
            echo "  $0                                    # Run all tests with default settings"
            echo "  $0 --real-data --headed              # Use real data and visible browser"
            echo "  $0 --skip-e2e --sequential           # Skip E2E tests, run sequentially"
            echo "  $0 --timeout 120000                  # Set 2-minute timeout"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main