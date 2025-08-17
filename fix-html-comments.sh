#!/bin/bash

echo "Fixing HTML comments in publisher pages..."

files=(
  "app/publisher/(dashboard)/settings/page.tsx"
  "app/publisher/(dashboard)/payment-profile/page.tsx"
  "app/publisher/(dashboard)/help/page.tsx"
  "app/publisher/(dashboard)/websites/[id]/edit/page.tsx"
  "app/publisher/(dashboard)/websites/new/page.tsx"
  "app/publisher/(dashboard)/invoices/page.tsx"
  "app/publisher/(dashboard)/invoices/new/page.tsx"
)

for file in "${files[@]}"; do
  echo "Processing $file"
  
  # Remove the HTML comments and fix the structure
  sed -i '
    /<!-- removed wrapper -->/d
    /<!-- removed header -->/d
    /<!-- removed wrapper end -->/d
    s/min-h-screen bg-gray-50 py-8/py-8/g
  ' "$file"
  
  echo "  ✓ Fixed"
done

echo "Done!"