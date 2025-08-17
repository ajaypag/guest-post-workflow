#!/bin/bash

# Make script executable: chmod +x run-tests.sh

# Guest Post Workflow E2E Test Runner
# Simple script to run authentication tests with proper environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
HEADLESS=true
PARALLEL=false
VERBOSE=false
TEST_SUITE="all"
BASE_URL="http://localhost:3000"

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

# Function to show usage
show_help() {
    echo "Guest Post Workflow E2E Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -u, --url URL        Set base URL (default: http://localhost:3000)"
    echo "  -s, --suite SUITE    Run specific test suite (auth, routing, permissions, journeys, all)"
    echo "  -p, --parallel       Run tests in parallel"
    echo "  -v, --verbose        Enable verbose output"
    echo "  -g, --gui            Run with GUI (non-headless mode)"
    echo "  -c, --clean          Clean reports before running"
    echo "  -q, --quick          Quick mode (headless + parallel)"
    echo "  -d, --debug          Debug mode (GUI + verbose + slow)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests (headless)"
    echo "  $0 --quick                   # Fast execution"
    echo "  $0 --debug                   # Debug mode with GUI"
    echo "  $0 --suite auth --verbose    # Run auth tests with verbose output"
    echo "  $0 --gui --suite journeys    # Run user journey tests with GUI"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).reduce((a,b,i)=>(a<<8)+b) >= '$REQUIRED_VERSION'.split('.').map(Number).reduce((a,b,i)=>(a<<8)+b) ? 0 : 1)"; then
        print_error "Node.js version $REQUIRED_VERSION or higher is required (found: v$NODE_VERSION)"
        exit 1
    fi
    
    # Check if npm packages are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm packages..."
        npm install
    fi
    
    print_success "Prerequisites check completed"
}

# Function to check development server
check_dev_server() {
    print_status "Checking development server at $BASE_URL..."
    
    if curl -s --head "$BASE_URL" | head -n 1 | grep -q "200 OK\|302\|301"; then
        print_success "Development server is running"
    else
        print_warning "Development server not accessible at $BASE_URL"
        print_warning "Please ensure the main application is running with: npm run dev"
        echo ""
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Aborting test execution"
            exit 1
        fi
    fi
}

# Function to check database connection
check_database() {
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL environment variable not set"
        print_warning "Database-dependent tests may fail"
        return
    fi
    
    print_status "Checking database connection..."
    
    # Try to connect to database (requires psql)
    if command -v psql &> /dev/null; then
        if echo "SELECT 1;" | psql "$DATABASE_URL" -q &> /dev/null; then
            print_success "Database connection verified"
        else
            print_warning "Database connection failed"
        fi
    else
        print_warning "psql not available, skipping database connection check"
    fi
}

# Function to clean reports
clean_reports() {
    print_status "Cleaning previous test reports..."
    
    if [ -d "reports" ]; then
        rm -rf reports/*
        print_success "Reports cleaned"
    else
        print_status "No previous reports to clean"
    fi
}

# Function to run tests
run_tests() {
    print_status "Starting test execution..."
    
    # Set environment variables
    export TEST_BASE_URL="$BASE_URL"
    export HEADLESS="$HEADLESS"
    export VERBOSE="$VERBOSE"
    export PARALLEL="$PARALLEL"
    
    # Build command based on test suite
    case "$TEST_SUITE" in
        "auth"|"authentication")
            COMMAND="npm run test:authentication"
            ;;
        "routing")
            COMMAND="npm run test:routing"
            ;;
        "permissions")
            COMMAND="npm run test:permissions"
            ;;
        "journeys"|"user-journeys")
            COMMAND="npm run test:journeys"
            ;;
        "all")
            if [ "$PARALLEL" = "true" ]; then
                COMMAND="npm run test:auth:parallel"
            elif [ "$HEADLESS" = "false" ]; then
                COMMAND="HEADLESS=false npm run test:auth"
            else
                COMMAND="npm run test:auth:headless"
            fi
            ;;
        *)
            print_error "Unknown test suite: $TEST_SUITE"
            exit 1
            ;;
    esac
    
    print_status "Executing: $COMMAND"
    echo ""
    
    # Run the tests
    if eval "$COMMAND"; then
        print_success "Tests completed successfully!"
        
        # Show report location
        if [ -d "reports" ]; then
            LATEST_HTML_REPORT=$(find reports -name "*.html" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
            if [ -n "$LATEST_HTML_REPORT" ]; then
                print_success "HTML report available: $LATEST_HTML_REPORT"
                echo ""
                echo "To view the report:"
                echo "  open $LATEST_HTML_REPORT"
                echo "  # or"
                echo "  xdg-open $LATEST_HTML_REPORT"
            fi
        fi
    else
        print_error "Tests failed!"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -s|--suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -g|--gui)
            HEADLESS=false
            shift
            ;;
        -c|--clean)
            CLEAN_REPORTS=true
            shift
            ;;
        -q|--quick)
            HEADLESS=true
            PARALLEL=true
            shift
            ;;
        -d|--debug)
            HEADLESS=false
            VERBOSE=true
            export SLOW_MO=500
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🔐 Guest Post Workflow - E2E Authentication Test Suite"
    echo "=================================================="
    echo ""
    
    # Show configuration
    print_status "Configuration:"
    echo "  Base URL: $BASE_URL"
    echo "  Test Suite: $TEST_SUITE"
    echo "  Headless: $HEADLESS"
    echo "  Parallel: $PARALLEL"
    echo "  Verbose: $VERBOSE"
    echo ""
    
    # Run checks and tests
    check_prerequisites
    
    if [ "$CLEAN_REPORTS" = "true" ]; then
        clean_reports
    fi
    
    check_dev_server
    check_database
    
    echo ""
    run_tests
}

# Execute main function
main "$@"