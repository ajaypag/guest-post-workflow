#!/bin/bash

# Publisher Migration CLI Tool
# Usage examples:
#   ./scripts/run-migration.sh validate
#   ./scripts/run-migration.sh migrate --dry-run
#   ./scripts/run-migration.sh test --sample
#   ./scripts/run-migration.sh invite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Parse command
COMMAND=$1
shift || true

case $COMMAND in
    "validate"|"v")
        log_info "Running data validation..."
        npx tsx scripts/migrate-websites-to-publishers.ts --validate
        ;;
    
    "migrate"|"m")
        if [[ "$1" == "--dry-run" || "$1" == "-d" ]]; then
            log_info "Running migration in DRY RUN mode..."
            npx tsx scripts/migrate-websites-to-publishers.ts --dry-run
        else
            log_warning "This will run LIVE migration. Are you sure? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                log_info "Running LIVE migration..."
                npx tsx scripts/migrate-websites-to-publishers.ts
            else
                log_info "Migration cancelled"
                exit 0
            fi
        fi
        ;;
    
    "test"|"t")
        if [[ "$1" == "--sample" ]]; then
            log_info "Creating sample data for testing..."
            npx tsx scripts/test-migration.ts --sample
            log_success "Sample data created! Visit http://localhost:3000/admin/publisher-migration"
        elif [[ "$1" == "--cleanup" ]]; then
            log_info "Cleaning up test data..."
            npx tsx scripts/test-migration.ts --cleanup
        else
            log_info "Running migration tests..."
            npx tsx scripts/test-migration.ts
        fi
        ;;
    
    "invite"|"i")
        log_info "This would send bulk invitations (not implemented in CLI yet)"
        log_info "Use the web dashboard at /admin/publisher-migration instead"
        ;;
    
    "status"|"s")
        log_info "Migration Status:"
        echo "========================"
        
        # Count current data
        log_info "Checking database..."
        
        # This is a simple status check - could be enhanced
        echo "📊 Current State:"
        echo "   - Use the web dashboard for detailed status"
        echo "   - Visit: http://localhost:3000/admin/publisher-migration"
        ;;
    
    "help"|"h"|"")
        echo "Publisher Migration Tool"
        echo "========================"
        echo ""
        echo "Commands:"
        echo "  validate, v           Run data validation"
        echo "  migrate, m [--dry-run]  Run migration (add --dry-run for safe test)"
        echo "  test, t [--sample]      Run tests (add --sample to create test data)"
        echo "  test --cleanup          Remove test data"
        echo "  invite, i             Send bulk invitations (use web dashboard)"
        echo "  status, s             Show migration status"
        echo "  help, h               Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 validate"
        echo "  $0 migrate --dry-run"
        echo "  $0 test --sample"
        echo "  $0 test --cleanup"
        echo ""
        echo "Web Dashboard: http://localhost:3000/admin/publisher-migration"
        ;;
    
    *)
        log_error "Unknown command: $COMMAND"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac