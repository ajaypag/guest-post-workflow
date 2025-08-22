#!/bin/bash

# E2E Test Runner for Target URL Matching Feature
# This script starts the development server and runs comprehensive browser tests

set -e

# Configuration
TEST_PORT=3000
TEST_BASE_URL="http://localhost:$TEST_PORT"
SERVER_PID=""
LOG_FILE="test-execution-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        log "Stopping development server (PID: $SERVER_PID)"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on the test port
    lsof -ti:$TEST_PORT | xargs kill -9 2>/dev/null || true
    
    log "Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Function to check if server is running
check_server() {
    curl -s -f "$TEST_BASE_URL" > /dev/null 2>&1
    return $?
}

# Function to wait for server to be ready
wait_for_server() {
    local max_attempts=30
    local attempt=1
    
    log "Waiting for development server to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_server; then
            success "Development server is ready at $TEST_BASE_URL"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts - server not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "Development server failed to start after $max_attempts attempts"
    return 1
}

# Function to start development server
start_server() {
    log "Starting development server on port $TEST_PORT..."
    
    # Check if port is already in use
    if lsof -i:$TEST_PORT > /dev/null 2>&1; then
        warning "Port $TEST_PORT is already in use. Attempting to use existing server..."
        if check_server; then
            success "Using existing development server"
            return 0
        else
            error "Port is in use but server is not responding. Please stop existing processes."
            exit 1
        fi
    fi
    
    # Start the development server
    npm run dev > dev-server.log 2>&1 &
    SERVER_PID=$!
    
    log "Development server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    if ! wait_for_server; then
        error "Failed to start development server"
        cat dev-server.log | tail -20
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if Playwright is installed
    if [ ! -d "node_modules/@playwright" ]; then
        warning "Playwright not found. Installing dependencies..."
        npm install
    fi
    
    # Check database connection
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set. Tests may fail without real data."
    fi
    
    success "Prerequisites check passed"
}

# Function to run the tests
run_tests() {
    log "Running Target URL Matching E2E Tests..."
    
    # Test configurations
    export BASE_URL="$TEST_BASE_URL"
    export TEST_CLIENT_ID="99f819ed-9118-4e08-8802-2df99492d1c5"  # Outreach Labs
    export TEST_PROJECT_ID="test-project-id"
    
    # Run specific test file
    local test_file="__tests__/e2e/target-url-matching-complete.spec.ts"
    
    if [ -f "$test_file" ]; then
        log "Running comprehensive test suite: $test_file"
        npx playwright test "$test_file" --reporter=html --workers=1
    else
        error "Test file not found: $test_file"
        return 1
    fi
    
    # Also run the original test file if it exists
    local original_test="__tests__/e2e/target-url-matching.spec.ts"
    if [ -f "$original_test" ]; then
        log "Running original test suite: $original_test"
        npx playwright test "$original_test" --reporter=html --workers=1
    fi
}

# Function to generate test report
generate_report() {
    log "Generating test report..."
    
    # Show Playwright test results
    if [ -d "playwright-report" ]; then
        success "Playwright HTML report generated at: playwright-report/index.html"
        
        # Try to open the report automatically
        if command -v xdg-open &> /dev/null; then
            xdg-open playwright-report/index.html 2>/dev/null || true
        elif command -v open &> /dev/null; then
            open playwright-report/index.html 2>/dev/null || true
        fi
    fi
    
    # Show test artifacts
    if [ -d "test-results" ]; then
        local screenshot_count=$(find test-results -name "*.png" | wc -l)
        local video_count=$(find test-results -name "*.webm" | wc -l)
        
        log "Test artifacts generated:"
        log "  Screenshots: $screenshot_count"
        log "  Videos: $video_count"
        log "  Location: test-results/"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --headed          Run tests in headed mode (visible browser)"
    echo "  --debug           Run tests in debug mode"
    echo "  --ui              Run tests in UI mode"
    echo "  --specific TEST   Run specific test pattern"
    echo "  --help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL      PostgreSQL connection string"
    echo "  TEST_BASE_URL     Base URL for testing (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                         # Run all tests headless"
    echo "  $0 --headed               # Run with visible browser"
    echo "  $0 --ui                   # Run in interactive UI mode"
    echo "  $0 --specific \"Component\" # Run only component tests"
}

# Main execution
main() {
    local headed=""
    local debug=""
    local ui_mode=""
    local specific_test=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --headed)
                headed="--headed"
                shift
                ;;
            --debug)
                debug="--debug"
                shift
                ;;
            --ui)
                ui_mode="--ui"
                shift
                ;;
            --specific)
                specific_test="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log "Starting Target URL Matching E2E Test Suite"
    log "Log file: $LOG_FILE"
    
    # Execute test sequence
    check_prerequisites
    start_server
    
    # Add command line arguments to playwright
    local playwright_args=""
    if [ ! -z "$headed" ]; then
        playwright_args="$playwright_args $headed"
    fi
    if [ ! -z "$debug" ]; then
        playwright_args="$playwright_args $debug"
    fi
    if [ ! -z "$ui_mode" ]; then
        playwright_args="$playwright_args $ui_mode"
    fi
    if [ ! -z "$specific_test" ]; then
        playwright_args="$playwright_args --grep \"$specific_test\""
    fi
    
    # Update the run_tests function to use arguments
    if [ ! -z "$playwright_args" ]; then
        log "Running tests with arguments: $playwright_args"
        eval "npx playwright test __tests__/e2e/target-url-matching-complete.spec.ts $playwright_args --reporter=html --workers=1"
    else
        run_tests
    fi
    
    local test_exit_code=$?
    
    generate_report
    
    if [ $test_exit_code -eq 0 ]; then
        success "All tests completed successfully!"
    else
        error "Some tests failed. Check the report for details."
    fi
    
    log "Test execution completed. Log saved to: $LOG_FILE"
    
    exit $test_exit_code
}

# Run main function with all arguments
main "$@"