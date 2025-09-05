#!/bin/bash

echo "# Test Endpoint Analysis Report"
echo "Generated: $(date)"
echo ""
echo "| Endpoint | Used in Prod | Has Auth | Last Modified | Category | Action |"
echo "|----------|--------------|----------|---------------|----------|--------|"

while read endpoint; do
  file_path="app${endpoint}/route.ts"
  
  # Check if used in production
  prod_usage=$(grep -r "$endpoint" app components lib --include="*.tsx" --include="*.ts" --exclude-dir="test" | grep -v "app/api/test" | head -1)
  if [ -n "$prod_usage" ]; then
    used_in_prod="YES"
    used_by=$(echo "$prod_usage" | cut -d: -f1 | xargs basename)
  else
    used_in_prod="NO"
    used_by=""
  fi
  
  # Check for authentication
  if [ -f "$file_path" ]; then
    if grep -q "requireInternalUser\|AuthServiceServer\|getSession" "$file_path"; then
      has_auth="YES"
    else
      has_auth="NO"
    fi
    
    # Get last modified date
    last_modified=$(git log -1 --format="%ar" -- "$file_path" 2>/dev/null || echo "Unknown")
    
    # Check for destructive operations
    if grep -q "DELETE FROM\|TRUNCATE\|DROP\|reset\|clear\|cleanup" "$file_path"; then
      category="DANGEROUS"
    elif grep -q "mock\|demo\|test\|example" "$file_path"; then
      category="TEST/DEMO"
    elif [ "$used_in_prod" = "YES" ]; then
      category="PRODUCTION"
    else
      category="UNKNOWN"
    fi
    
    # Determine action
    if [ "$used_in_prod" = "YES" ]; then
      if [[ "$endpoint" == *"demo"* ]] || [[ "$endpoint" == *"email"* ]]; then
        action="MOVE to /api/admin/"
      else
        action="REVIEW"
      fi
    elif [ "$category" = "DANGEROUS" ] && [ "$has_auth" = "NO" ]; then
      action="DELETE"
    elif [ "$category" = "TEST/DEMO" ] && [ "$used_in_prod" = "NO" ]; then
      action="DELETE"
    else
      action="REVIEW"
    fi
    
    echo "| $endpoint | $used_in_prod | $has_auth | $last_modified | $category | $action |"
  fi
done < audit/all-test-endpoints.txt