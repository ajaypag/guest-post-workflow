#!/bin/bash

echo "Fixing all publisher dashboard pages..."

cd "/home/ajay/guest post workflow backup/guest post workflow to upload to cloud/guest-post-workflow-worktrees/order-flow/app/publisher/(dashboard)"

for file in $(find . -name "page.tsx" -type f); do
  echo "Processing $file"
  
  # Check if file contains PublisherAuthWrapper
  if grep -q "PublisherAuthWrapper>" "$file"; then
    echo "  - Removing PublisherAuthWrapper wrapper"
    
    # Create temp file with fixes
    sed -e 's/<PublisherAuthWrapper>/<!-- removed wrapper -->/g' \
        -e 's/<PublisherHeader \/>/<!-- removed header -->/g' \
        -e 's/<\/PublisherAuthWrapper>/<!-- removed wrapper end -->/g' \
        -e 's/return (\s*<!-- removed wrapper -->\s*<!-- removed header -->\s*<div className="min-h-screen bg-gray-50 py-8">/return (\n    <div className="py-8">/g' \
        -e 's/<!-- removed wrapper end -->//g' \
        "$file" > "${file}.tmp"
    
    # Replace original if successful
    if [ $? -eq 0 ]; then
      mv "${file}.tmp" "$file"
      echo "  ✓ Fixed"
    else
      rm -f "${file}.tmp"
      echo "  ✗ Failed"
    fi
  else
    echo "  - Already fixed or different structure"
  fi
done

echo "Done!"