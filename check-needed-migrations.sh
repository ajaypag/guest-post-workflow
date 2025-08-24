#!/bin/bash

echo "Checking which migrations are needed for production..."
echo "=================================================="

# Check for brand intelligence tables
echo -e "\n1. Brand Intelligence System:"
if pg_restore --schema-only db-backups/pg-dump-postgres-1755992650.dmp 2>/dev/null | grep -q "CREATE TABLE.*client_brand_intelligence"; then
    echo "✅ client_brand_intelligence table EXISTS"
else
    echo "❌ client_brand_intelligence table MISSING - Need migrations 0068, 0069"
fi

# Check for workflow assignments
echo -e "\n2. Workflow Assignments:"
if pg_restore --schema-only db-backups/pg-dump-postgres-1755992650.dmp 2>/dev/null | grep -q "workflow_assignments"; then
    echo "✅ workflow_assignments table EXISTS"
else
    echo "❌ workflow_assignments table MISSING - Need migration 0063"
fi

# Check for line_item_changes
echo -e "\n3. Line Item Changes:"
if pg_restore --schema-only db-backups/pg-dump-postgres-1755992650.dmp 2>/dev/null | grep -q "line_item_changes"; then
    echo "✅ line_item_changes table EXISTS"
    # Check columns
    if pg_restore --schema-only db-backups/pg-dump-postgres-1755992650.dmp 2>/dev/null | grep -A20 "CREATE TABLE.*line_item_changes" | grep -q "order_id"; then
        echo "✅ line_item_changes has order_id column"
    else
        echo "⚠️  line_item_changes missing order_id - Need migrations 0057a-f"
    fi
else
    echo "❌ line_item_changes table MISSING"
fi

# Check for order_line_items
echo -e "\n4. Order Line Items:"
if pg_restore --schema-only db-backups/pg-dump-postgres-1755992650.dmp 2>/dev/null | grep -q "CREATE TABLE.*order_line_items"; then
    echo "✅ order_line_items table EXISTS"
else
    echo "❌ order_line_items table MISSING"
fi

# List our new migrations
echo -e "\n5. New migrations in bug-fixing branch:"
ls migrations/006*.sql migrations/007*.sql 2>/dev/null | sort

echo -e "\n=================================================="
echo "Based on this analysis, you likely need:"
echo "- Migration 0068: Add client_brand_intelligence table"
echo "- Migration 0069: Add metadata column to client_brand_intelligence"
echo "And possibly others depending on the checks above."