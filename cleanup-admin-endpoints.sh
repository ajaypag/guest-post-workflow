#!/bin/bash
# Admin Endpoint Cleanup Script
# Generated: 2025-08-05T18:36:15.732Z

echo "🧹 Starting cleanup of 124 obsolete admin endpoints..."


# Remove add-client-fields-migration
if [ -f "app/api/admin/add-client-fields-migration/route.ts" ]; then
  rm "app/api/admin/add-client-fields-migration/route.ts"
  echo "✅ Removed app/api/admin/add-client-fields-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/add-client-fields-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove add-dataforseo-count-column
if [ -f "app/api/admin/add-dataforseo-count-column/route.ts" ]; then
  rm "app/api/admin/add-dataforseo-count-column/route.ts"
  echo "✅ Removed app/api/admin/add-dataforseo-count-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/add-dataforseo-count-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove add-datasource-fields
if [ -f "app/api/admin/add-datasource-fields/route.ts" ]; then
  rm "app/api/admin/add-datasource-fields/route.ts"
  echo "✅ Removed app/api/admin/add-datasource-fields/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/add-datasource-fields/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove add-link-orchestration-columns
if [ -f "app/api/admin/add-link-orchestration-columns/route.ts" ]; then
  rm "app/api/admin/add-link-orchestration-columns/route.ts"
  echo "✅ Removed app/api/admin/add-link-orchestration-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/add-link-orchestration-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove apply-bulk-url-migration
if [ -f "app/api/admin/apply-bulk-url-migration/route.ts" ]; then
  rm "app/api/admin/apply-bulk-url-migration/route.ts"
  echo "✅ Removed app/api/admin/apply-bulk-url-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/apply-bulk-url-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-bulk-url-migration
if [ -f "app/api/admin/check-bulk-url-migration/route.ts" ]; then
  rm "app/api/admin/check-bulk-url-migration/route.ts"
  echo "✅ Removed app/api/admin/check-bulk-url-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-bulk-url-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-client-type-migration
if [ -f "app/api/admin/check-client-type-migration/route.ts" ]; then
  rm "app/api/admin/check-client-type-migration/route.ts"
  echo "✅ Removed app/api/admin/check-client-type-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-client-type-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove draft-orders-migration/migrate
if [ -f "app/api/admin/draft-orders-migration/migrate/route.ts" ]; then
  rm "app/api/admin/draft-orders-migration/migrate/route.ts"
  echo "✅ Removed app/api/admin/draft-orders-migration/migrate/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/draft-orders-migration/migrate/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove draft-orders-migration/status
if [ -f "app/api/admin/draft-orders-migration/status/route.ts" ]; then
  rm "app/api/admin/draft-orders-migration/status/route.ts"
  echo "✅ Removed app/api/admin/draft-orders-migration/status/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/draft-orders-migration/status/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-advertisers
if [ -f "app/api/admin/migrate-advertisers/route.ts" ]; then
  rm "app/api/admin/migrate-advertisers/route.ts"
  echo "✅ Removed app/api/admin/migrate-advertisers/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-advertisers/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-agentic
if [ -f "app/api/admin/migrate-agentic/route.ts" ]; then
  rm "app/api/admin/migrate-agentic/route.ts"
  echo "✅ Removed app/api/admin/migrate-agentic/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-agentic/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-agentic-versioning
if [ -f "app/api/admin/migrate-agentic-versioning/route.ts" ]; then
  rm "app/api/admin/migrate-agentic-versioning/route.ts"
  echo "✅ Removed app/api/admin/migrate-agentic-versioning/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-agentic-versioning/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-ai-permissions
if [ -f "app/api/admin/migrate-ai-permissions/route.ts" ]; then
  rm "app/api/admin/migrate-ai-permissions/route.ts"
  echo "✅ Removed app/api/admin/migrate-ai-permissions/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-ai-permissions/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-archive
if [ -f "app/api/admin/migrate-archive/route.ts" ]; then
  rm "app/api/admin/migrate-archive/route.ts"
  echo "✅ Removed app/api/admin/migrate-archive/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-archive/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-article-v2
if [ -f "app/api/admin/migrate-article-v2/route.ts" ]; then
  rm "app/api/admin/migrate-article-v2/route.ts"
  echo "✅ Removed app/api/admin/migrate-article-v2/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-article-v2/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-bulk-analysis
if [ -f "app/api/admin/migrate-bulk-analysis/route.ts" ]; then
  rm "app/api/admin/migrate-bulk-analysis/route.ts"
  echo "✅ Removed app/api/admin/migrate-bulk-analysis/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-bulk-analysis/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-bulk-analysis-4tier
if [ -f "app/api/admin/migrate-bulk-analysis-4tier/route.ts" ]; then
  rm "app/api/admin/migrate-bulk-analysis-4tier/route.ts"
  echo "✅ Removed app/api/admin/migrate-bulk-analysis-4tier/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-bulk-analysis-4tier/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-bulk-analysis-improvements
if [ -f "app/api/admin/migrate-bulk-analysis-improvements/route.ts" ]; then
  rm "app/api/admin/migrate-bulk-analysis-improvements/route.ts"
  echo "✅ Removed app/api/admin/migrate-bulk-analysis-improvements/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-bulk-analysis-improvements/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-bulk-analysis-improvements-rollback
if [ -f "app/api/admin/migrate-bulk-analysis-improvements-rollback/route.ts" ]; then
  rm "app/api/admin/migrate-bulk-analysis-improvements-rollback/route.ts"
  echo "✅ Removed app/api/admin/migrate-bulk-analysis-improvements-rollback/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-bulk-analysis-improvements-rollback/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-client-type
if [ -f "app/api/admin/migrate-client-type/route.ts" ]; then
  rm "app/api/admin/migrate-client-type/route.ts"
  echo "✅ Removed app/api/admin/migrate-client-type/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-client-type/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-dataforseo
if [ -f "app/api/admin/migrate-dataforseo/route.ts" ]; then
  rm "app/api/admin/migrate-dataforseo/route.ts"
  echo "✅ Removed app/api/admin/migrate-dataforseo/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-dataforseo/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-dataforseo-logs
if [ -f "app/api/admin/migrate-dataforseo-logs/route.ts" ]; then
  rm "app/api/admin/migrate-dataforseo-logs/route.ts"
  echo "✅ Removed app/api/admin/migrate-dataforseo-logs/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-dataforseo-logs/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-description
if [ -f "app/api/admin/migrate-description/route.ts" ]; then
  rm "app/api/admin/migrate-description/route.ts"
  echo "✅ Removed app/api/admin/migrate-description/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-description/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-email-logs
if [ -f "app/api/admin/migrate-email-logs/route.ts" ]; then
  rm "app/api/admin/migrate-email-logs/route.ts"
  echo "✅ Removed app/api/admin/migrate-email-logs/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-email-logs/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-email-logs-direct
if [ -f "app/api/admin/migrate-email-logs-direct/route.ts" ]; then
  rm "app/api/admin/migrate-email-logs-direct/route.ts"
  echo "✅ Removed app/api/admin/migrate-email-logs-direct/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-email-logs-direct/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-email-logs-simple
if [ -f "app/api/admin/migrate-email-logs-simple/route.ts" ]; then
  rm "app/api/admin/migrate-email-logs-simple/route.ts"
  echo "✅ Removed app/api/admin/migrate-email-logs-simple/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-email-logs-simple/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-formatting-qa
if [ -f "app/api/admin/migrate-formatting-qa/route.ts" ]; then
  rm "app/api/admin/migrate-formatting-qa/route.ts"
  echo "✅ Removed app/api/admin/migrate-formatting-qa/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-formatting-qa/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-formatting-qa-v2
if [ -f "app/api/admin/migrate-formatting-qa-v2/route.ts" ]; then
  rm "app/api/admin/migrate-formatting-qa-v2/route.ts"
  echo "✅ Removed app/api/admin/migrate-formatting-qa-v2/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-formatting-qa-v2/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-keywords
if [ -f "app/api/admin/migrate-keywords/route.ts" ]; then
  rm "app/api/admin/migrate-keywords/route.ts"
  echo "✅ Removed app/api/admin/migrate-keywords/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-keywords/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-link-orchestration
if [ -f "app/api/admin/migrate-link-orchestration/route.ts" ]; then
  rm "app/api/admin/migrate-link-orchestration/route.ts"
  echo "✅ Removed app/api/admin/migrate-link-orchestration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-link-orchestration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-onboarding
if [ -f "app/api/admin/migrate-onboarding/route.ts" ]; then
  rm "app/api/admin/migrate-onboarding/route.ts"
  echo "✅ Removed app/api/admin/migrate-onboarding/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-onboarding/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-order-groups-bulk-analysis
if [ -f "app/api/admin/migrate-order-groups-bulk-analysis/route.ts" ]; then
  rm "app/api/admin/migrate-order-groups-bulk-analysis/route.ts"
  echo "✅ Removed app/api/admin/migrate-order-groups-bulk-analysis/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-order-groups-bulk-analysis/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-outline-background
if [ -f "app/api/admin/migrate-outline-background/route.ts" ]; then
  rm "app/api/admin/migrate-outline-background/route.ts"
  echo "✅ Removed app/api/admin/migrate-outline-background/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-outline-background/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-outline-sessions
if [ -f "app/api/admin/migrate-outline-sessions/route.ts" ]; then
  rm "app/api/admin/migrate-outline-sessions/route.ts"
  echo "✅ Removed app/api/admin/migrate-outline-sessions/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-outline-sessions/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-polish
if [ -f "app/api/admin/migrate-polish/route.ts" ]; then
  rm "app/api/admin/migrate-polish/route.ts"
  echo "✅ Removed app/api/admin/migrate-polish/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-polish/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-polish-drizzle
if [ -f "app/api/admin/migrate-polish-drizzle/route.ts" ]; then
  rm "app/api/admin/migrate-polish-drizzle/route.ts"
  echo "✅ Removed app/api/admin/migrate-polish-drizzle/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-polish-drizzle/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-semantic-audit
if [ -f "app/api/admin/migrate-semantic-audit/route.ts" ]; then
  rm "app/api/admin/migrate-semantic-audit/route.ts"
  echo "✅ Removed app/api/admin/migrate-semantic-audit/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-semantic-audit/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-semantic-audit-v2
if [ -f "app/api/admin/migrate-semantic-audit-v2/route.ts" ]; then
  rm "app/api/admin/migrate-semantic-audit-v2/route.ts"
  echo "✅ Removed app/api/admin/migrate-semantic-audit-v2/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-semantic-audit-v2/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-streaming-columns
if [ -f "app/api/admin/migrate-streaming-columns/route.ts" ]; then
  rm "app/api/admin/migrate-streaming-columns/route.ts"
  echo "✅ Removed app/api/admin/migrate-streaming-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-streaming-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-streaming-schema
if [ -f "app/api/admin/migrate-streaming-schema/route.ts" ]; then
  rm "app/api/admin/migrate-streaming-schema/route.ts"
  echo "✅ Removed app/api/admin/migrate-streaming-schema/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-streaming-schema/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-target-page-id
if [ -f "app/api/admin/migrate-target-page-id/route.ts" ]; then
  rm "app/api/admin/migrate-target-page-id/route.ts"
  echo "✅ Removed app/api/admin/migrate-target-page-id/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-target-page-id/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-user-system
if [ -f "app/api/admin/migrate-user-system/route.ts" ]; then
  rm "app/api/admin/migrate-user-system/route.ts"
  echo "✅ Removed app/api/admin/migrate-user-system/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-user-system/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrations/run
if [ -f "app/api/admin/migrations/run/route.ts" ]; then
  rm "app/api/admin/migrations/run/route.ts"
  echo "✅ Removed app/api/admin/migrations/run/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrations/run/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrations/status
if [ -f "app/api/admin/migrations/status/route.ts" ]; then
  rm "app/api/admin/migrations/status/route.ts"
  echo "✅ Removed app/api/admin/migrations/status/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrations/status/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove normalize-urls-migration/run
if [ -f "app/api/admin/normalize-urls-migration/run/route.ts" ]; then
  rm "app/api/admin/normalize-urls-migration/run/route.ts"
  echo "✅ Removed app/api/admin/normalize-urls-migration/run/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/normalize-urls-migration/run/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove normalize-urls-migration/status
if [ -f "app/api/admin/normalize-urls-migration/status/route.ts" ]; then
  rm "app/api/admin/normalize-urls-migration/status/route.ts"
  echo "✅ Removed app/api/admin/normalize-urls-migration/status/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/normalize-urls-migration/status/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove order-migration
if [ -f "app/api/admin/order-migration/route.ts" ]; then
  rm "app/api/admin/order-migration/route.ts"
  echo "✅ Removed app/api/admin/order-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/order-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove order-system-migration
if [ -f "app/api/admin/order-system-migration/route.ts" ]; then
  rm "app/api/admin/order-system-migration/route.ts"
  echo "✅ Removed app/api/admin/order-system-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/order-system-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove order-type-migration
if [ -f "app/api/admin/order-type-migration/route.ts" ]; then
  rm "app/api/admin/order-type-migration/route.ts"
  echo "✅ Removed app/api/admin/order-type-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/order-type-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove password-reset-migration
if [ -f "app/api/admin/password-reset-migration/route.ts" ]; then
  rm "app/api/admin/password-reset-migration/route.ts"
  echo "✅ Removed app/api/admin/password-reset-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/password-reset-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove payment-tables-migration
if [ -f "app/api/admin/payment-tables-migration/route.ts" ]; then
  rm "app/api/admin/payment-tables-migration/route.ts"
  echo "✅ Removed app/api/admin/payment-tables-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/payment-tables-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove rollback-bulk-url-migration
if [ -f "app/api/admin/rollback-bulk-url-migration/route.ts" ]; then
  rm "app/api/admin/rollback-bulk-url-migration/route.ts"
  echo "✅ Removed app/api/admin/rollback-bulk-url-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/rollback-bulk-url-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove run-airtable-migration
if [ -f "app/api/admin/run-airtable-migration/route.ts" ]; then
  rm "app/api/admin/run-airtable-migration/route.ts"
  echo "✅ Removed app/api/admin/run-airtable-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/run-airtable-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove run-dataforseo-migration
if [ -f "app/api/admin/run-dataforseo-migration/route.ts" ]; then
  rm "app/api/admin/run-dataforseo-migration/route.ts"
  echo "✅ Removed app/api/admin/run-dataforseo-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/run-dataforseo-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove run-migrations
if [ -f "app/api/admin/run-migrations/route.ts" ]; then
  rm "app/api/admin/run-migrations/route.ts"
  echo "✅ Removed app/api/admin/run-migrations/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/run-migrations/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove test-email-migration
if [ -f "app/api/admin/test-email-migration/route.ts" ]; then
  rm "app/api/admin/test-email-migration/route.ts"
  echo "✅ Removed app/api/admin/test-email-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/test-email-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove unified-order-migration
if [ -f "app/api/admin/unified-order-migration/route.ts" ]; then
  rm "app/api/admin/unified-order-migration/route.ts"
  echo "✅ Removed app/api/admin/unified-order-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/unified-order-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove verify-order-groups-migration
if [ -f "app/api/admin/verify-order-groups-migration/route.ts" ]; then
  rm "app/api/admin/verify-order-groups-migration/route.ts"
  echo "✅ Removed app/api/admin/verify-order-groups-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/verify-order-groups-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove verify-user-system-migration
if [ -f "app/api/admin/verify-user-system-migration/route.ts" ]; then
  rm "app/api/admin/verify-user-system-migration/route.ts"
  echo "✅ Removed app/api/admin/verify-user-system-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/verify-user-system-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove website-type-niche-migration/check
if [ -f "app/api/admin/website-type-niche-migration/check/route.ts" ]; then
  rm "app/api/admin/website-type-niche-migration/check/route.ts"
  echo "✅ Removed app/api/admin/website-type-niche-migration/check/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/website-type-niche-migration/check/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove website-type-niche-migration/indexes
if [ -f "app/api/admin/website-type-niche-migration/indexes/route.ts" ]; then
  rm "app/api/admin/website-type-niche-migration/indexes/route.ts"
  echo "✅ Removed app/api/admin/website-type-niche-migration/indexes/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/website-type-niche-migration/indexes/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove website-type-niche-migration/migrate
if [ -f "app/api/admin/website-type-niche-migration/migrate/route.ts" ]; then
  rm "app/api/admin/website-type-niche-migration/migrate/route.ts"
  echo "✅ Removed app/api/admin/website-type-niche-migration/migrate/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/website-type-niche-migration/migrate/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove website-type-niche-migration/verify
if [ -f "app/api/admin/website-type-niche-migration/verify/route.ts" ]; then
  rm "app/api/admin/website-type-niche-migration/verify/route.ts"
  echo "✅ Removed app/api/admin/website-type-niche-migration/verify/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/website-type-niche-migration/verify/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-accounts-table
if [ -f "app/api/admin/fix-accounts-table/route.ts" ]; then
  rm "app/api/admin/fix-accounts-table/route.ts"
  echo "✅ Removed app/api/admin/fix-accounts-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-accounts-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-article-v2-columns
if [ -f "app/api/admin/fix-article-v2-columns/route.ts" ]; then
  rm "app/api/admin/fix-article-v2-columns/route.ts"
  echo "✅ Removed app/api/admin/fix-article-v2-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-article-v2-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-email-logs-table
if [ -f "app/api/admin/fix-email-logs-table/route.ts" ]; then
  rm "app/api/admin/fix-email-logs-table/route.ts"
  echo "✅ Removed app/api/admin/fix-email-logs-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-email-logs-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-formatting-qa-columns
if [ -f "app/api/admin/fix-formatting-qa-columns/route.ts" ]; then
  rm "app/api/admin/fix-formatting-qa-columns/route.ts"
  echo "✅ Removed app/api/admin/fix-formatting-qa-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-formatting-qa-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-invitations-table
if [ -f "app/api/admin/fix-invitations-table/route.ts" ]; then
  rm "app/api/admin/fix-invitations-table/route.ts"
  echo "✅ Removed app/api/admin/fix-invitations-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-invitations-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-link-orchestration-schema
if [ -f "app/api/admin/fix-link-orchestration-schema/route.ts" ]; then
  rm "app/api/admin/fix-link-orchestration-schema/route.ts"
  echo "✅ Removed app/api/admin/fix-link-orchestration-schema/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-link-orchestration-schema/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-outline-generation-columns
if [ -f "app/api/admin/fix-outline-generation-columns/route.ts" ]; then
  rm "app/api/admin/fix-outline-generation-columns/route.ts"
  echo "✅ Removed app/api/admin/fix-outline-generation-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-outline-generation-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-outline-sessions-schema
if [ -f "app/api/admin/fix-outline-sessions-schema/route.ts" ]; then
  rm "app/api/admin/fix-outline-sessions-schema/route.ts"
  echo "✅ Removed app/api/admin/fix-outline-sessions-schema/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-outline-sessions-schema/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-polish-approach-column
if [ -f "app/api/admin/fix-polish-approach-column/route.ts" ]; then
  rm "app/api/admin/fix-polish-approach-column/route.ts"
  echo "✅ Removed app/api/admin/fix-polish-approach-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-polish-approach-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove fix-polish-database-columns
if [ -f "app/api/admin/fix-polish-database-columns/route.ts" ]; then
  rm "app/api/admin/fix-polish-database-columns/route.ts"
  echo "✅ Removed app/api/admin/fix-polish-database-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/fix-polish-database-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-agentic-tables
if [ -f "app/api/admin/check-agentic-tables/route.ts" ]; then
  rm "app/api/admin/check-agentic-tables/route.ts"
  echo "✅ Removed app/api/admin/check-agentic-tables/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-agentic-tables/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-archive-columns
if [ -f "app/api/admin/check-archive-columns/route.ts" ]; then
  rm "app/api/admin/check-archive-columns/route.ts"
  echo "✅ Removed app/api/admin/check-archive-columns/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-archive-columns/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-bulk-url-migration
if [ -f "app/api/admin/check-bulk-url-migration/route.ts" ]; then
  rm "app/api/admin/check-bulk-url-migration/route.ts"
  echo "✅ Removed app/api/admin/check-bulk-url-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-bulk-url-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-client-type-migration
if [ -f "app/api/admin/check-client-type-migration/route.ts" ]; then
  rm "app/api/admin/check-client-type-migration/route.ts"
  echo "✅ Removed app/api/admin/check-client-type-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-client-type-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-column-sizes
if [ -f "app/api/admin/check-column-sizes/route.ts" ]; then
  rm "app/api/admin/check-column-sizes/route.ts"
  echo "✅ Removed app/api/admin/check-column-sizes/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-column-sizes/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-description-column
if [ -f "app/api/admin/check-description-column/route.ts" ]; then
  rm "app/api/admin/check-description-column/route.ts"
  echo "✅ Removed app/api/admin/check-description-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-description-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-email-logs-table
if [ -f "app/api/admin/check-email-logs-table/route.ts" ]; then
  rm "app/api/admin/check-email-logs-table/route.ts"
  echo "✅ Removed app/api/admin/check-email-logs-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-email-logs-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-formatting-qa-tables
if [ -f "app/api/admin/check-formatting-qa-tables/route.ts" ]; then
  rm "app/api/admin/check-formatting-qa-tables/route.ts"
  echo "✅ Removed app/api/admin/check-formatting-qa-tables/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-formatting-qa-tables/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-invitations-table
if [ -f "app/api/admin/check-invitations-table/route.ts" ]; then
  rm "app/api/admin/check-invitations-table/route.ts"
  echo "✅ Removed app/api/admin/check-invitations-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-invitations-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-keywords-column
if [ -f "app/api/admin/check-keywords-column/route.ts" ]; then
  rm "app/api/admin/check-keywords-column/route.ts"
  echo "✅ Removed app/api/admin/check-keywords-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-keywords-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-link-orchestration-schema
if [ -f "app/api/admin/check-link-orchestration-schema/route.ts" ]; then
  rm "app/api/admin/check-link-orchestration-schema/route.ts"
  echo "✅ Removed app/api/admin/check-link-orchestration-schema/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-link-orchestration-schema/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-link-orchestration-table
if [ -f "app/api/admin/check-link-orchestration-table/route.ts" ]; then
  rm "app/api/admin/check-link-orchestration-table/route.ts"
  echo "✅ Removed app/api/admin/check-link-orchestration-table/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-link-orchestration-table/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-order-groups-schema
if [ -f "app/api/admin/check-order-groups-schema/route.ts" ]; then
  rm "app/api/admin/check-order-groups-schema/route.ts"
  echo "✅ Removed app/api/admin/check-order-groups-schema/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-order-groups-schema/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-polish-tables
if [ -f "app/api/admin/check-polish-tables/route.ts" ]; then
  rm "app/api/admin/check-polish-tables/route.ts"
  echo "✅ Removed app/api/admin/check-polish-tables/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-polish-tables/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-polish-tables-direct
if [ -f "app/api/admin/check-polish-tables-direct/route.ts" ]; then
  rm "app/api/admin/check-polish-tables-direct/route.ts"
  echo "✅ Removed app/api/admin/check-polish-tables-direct/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-polish-tables-direct/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-semantic-audit-tables
if [ -f "app/api/admin/check-semantic-audit-tables/route.ts" ]; then
  rm "app/api/admin/check-semantic-audit-tables/route.ts"
  echo "✅ Removed app/api/admin/check-semantic-audit-tables/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-semantic-audit-tables/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-tables
if [ -f "app/api/admin/check-tables/route.ts" ]; then
  rm "app/api/admin/check-tables/route.ts"
  echo "✅ Removed app/api/admin/check-tables/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-tables/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-user-type-column
if [ -f "app/api/admin/check-user-type-column/route.ts" ]; then
  rm "app/api/admin/check-user-type-column/route.ts"
  echo "✅ Removed app/api/admin/check-user-type-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-user-type-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-account-clients
if [ -f "app/api/admin/debug-account-clients/route.ts" ]; then
  rm "app/api/admin/debug-account-clients/route.ts"
  echo "✅ Removed app/api/admin/debug-account-clients/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-account-clients/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-analyzed-count
if [ -f "app/api/admin/debug-analyzed-count/route.ts" ]; then
  rm "app/api/admin/debug-analyzed-count/route.ts"
  echo "✅ Removed app/api/admin/debug-analyzed-count/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-analyzed-count/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-clients
if [ -f "app/api/admin/debug-clients/route.ts" ]; then
  rm "app/api/admin/debug-clients/route.ts"
  echo "✅ Removed app/api/admin/debug-clients/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-clients/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-clients-api
if [ -f "app/api/admin/debug-clients-api/route.ts" ]; then
  rm "app/api/admin/debug-clients-api/route.ts"
  echo "✅ Removed app/api/admin/debug-clients-api/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-clients-api/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-email-logs
if [ -f "app/api/admin/debug-email-logs/route.ts" ]; then
  rm "app/api/admin/debug-email-logs/route.ts"
  echo "✅ Removed app/api/admin/debug-email-logs/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-email-logs/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-invitations
if [ -f "app/api/admin/debug-invitations/route.ts" ]; then
  rm "app/api/admin/debug-invitations/route.ts"
  echo "✅ Removed app/api/admin/debug-invitations/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-invitations/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-link-orchestration-insert
if [ -f "app/api/admin/debug-link-orchestration-insert/route.ts" ]; then
  rm "app/api/admin/debug-link-orchestration-insert/route.ts"
  echo "✅ Removed app/api/admin/debug-link-orchestration-insert/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-link-orchestration-insert/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove debug-reset-token
if [ -f "app/api/admin/debug-reset-token/route.ts" ]; then
  rm "app/api/admin/debug-reset-token/route.ts"
  echo "✅ Removed app/api/admin/debug-reset-token/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/debug-reset-token/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-article-v2
if [ -f "app/api/admin/diagnose-article-v2/route.ts" ]; then
  rm "app/api/admin/diagnose-article-v2/route.ts"
  echo "✅ Removed app/api/admin/diagnose-article-v2/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-article-v2/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-formatting-qa-enhancement
if [ -f "app/api/admin/diagnose-formatting-qa-enhancement/route.ts" ]; then
  rm "app/api/admin/diagnose-formatting-qa-enhancement/route.ts"
  echo "✅ Removed app/api/admin/diagnose-formatting-qa-enhancement/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-formatting-qa-enhancement/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-o3-deep-research
if [ -f "app/api/admin/diagnose-o3-deep-research/route.ts" ]; then
  rm "app/api/admin/diagnose-o3-deep-research/route.ts"
  echo "✅ Removed app/api/admin/diagnose-o3-deep-research/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-o3-deep-research/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-orders-new
if [ -f "app/api/admin/diagnose-orders-new/route.ts" ]; then
  rm "app/api/admin/diagnose-orders-new/route.ts"
  echo "✅ Removed app/api/admin/diagnose-orders-new/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-orders-new/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-outline-generation
if [ -f "app/api/admin/diagnose-outline-generation/route.ts" ]; then
  rm "app/api/admin/diagnose-outline-generation/route.ts"
  echo "✅ Removed app/api/admin/diagnose-outline-generation/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-outline-generation/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-outline-generation-error
if [ -f "app/api/admin/diagnose-outline-generation-error/route.ts" ]; then
  rm "app/api/admin/diagnose-outline-generation-error/route.ts"
  echo "✅ Removed app/api/admin/diagnose-outline-generation-error/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-outline-generation-error/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-outline-generation-live
if [ -f "app/api/admin/diagnose-outline-generation-live/route.ts" ]; then
  rm "app/api/admin/diagnose-outline-generation-live/route.ts"
  echo "✅ Removed app/api/admin/diagnose-outline-generation-live/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-outline-generation-live/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-polish-null-bytes
if [ -f "app/api/admin/diagnose-polish-null-bytes/route.ts" ]; then
  rm "app/api/admin/diagnose-polish-null-bytes/route.ts"
  echo "✅ Removed app/api/admin/diagnose-polish-null-bytes/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-polish-null-bytes/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-semantic-audit-v2
if [ -f "app/api/admin/diagnose-semantic-audit-v2/route.ts" ]; then
  rm "app/api/admin/diagnose-semantic-audit-v2/route.ts"
  echo "✅ Removed app/api/admin/diagnose-semantic-audit-v2/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-semantic-audit-v2/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-step-7/[id]
if [ -f "app/api/admin/diagnose-step-7/[id]/route.ts" ]; then
  rm "app/api/admin/diagnose-step-7/[id]/route.ts"
  echo "✅ Removed app/api/admin/diagnose-step-7/[id]/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-step-7/[id]/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove diagnose-streaming-health
if [ -f "app/api/admin/diagnose-streaming-health/route.ts" ]; then
  rm "app/api/admin/diagnose-streaming-health/route.ts"
  echo "✅ Removed app/api/admin/diagnose-streaming-health/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/diagnose-streaming-health/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove add-dataforseo-count-column
if [ -f "app/api/admin/add-dataforseo-count-column/route.ts" ]; then
  rm "app/api/admin/add-dataforseo-count-column/route.ts"
  echo "✅ Removed app/api/admin/add-dataforseo-count-column/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/add-dataforseo-count-column/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove check-dataforseo-status
if [ -f "app/api/admin/check-dataforseo-status/route.ts" ]; then
  rm "app/api/admin/check-dataforseo-status/route.ts"
  echo "✅ Removed app/api/admin/check-dataforseo-status/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/check-dataforseo-status/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-audit/errors
if [ -f "app/api/admin/dataforseo-audit/errors/route.ts" ]; then
  rm "app/api/admin/dataforseo-audit/errors/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-audit/errors/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-audit/errors/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-audit/task/[taskId]
if [ -f "app/api/admin/dataforseo-audit/task/[taskId]/route.ts" ]; then
  rm "app/api/admin/dataforseo-audit/task/[taskId]/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-audit/task/[taskId]/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-audit/task/[taskId]/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-audit/tasks
if [ -f "app/api/admin/dataforseo-audit/tasks/route.ts" ]; then
  rm "app/api/admin/dataforseo-audit/tasks/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-audit/tasks/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-audit/tasks/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-debug
if [ -f "app/api/admin/dataforseo-debug/route.ts" ]; then
  rm "app/api/admin/dataforseo-debug/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-debug/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-debug/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-monitoring
if [ -f "app/api/admin/dataforseo-monitoring/route.ts" ]; then
  rm "app/api/admin/dataforseo-monitoring/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-monitoring/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-monitoring/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove dataforseo-task-details
if [ -f "app/api/admin/dataforseo-task-details/route.ts" ]; then
  rm "app/api/admin/dataforseo-task-details/route.ts"
  echo "✅ Removed app/api/admin/dataforseo-task-details/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/dataforseo-task-details/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-dataforseo
if [ -f "app/api/admin/migrate-dataforseo/route.ts" ]; then
  rm "app/api/admin/migrate-dataforseo/route.ts"
  echo "✅ Removed app/api/admin/migrate-dataforseo/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-dataforseo/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove migrate-dataforseo-logs
if [ -f "app/api/admin/migrate-dataforseo-logs/route.ts" ]; then
  rm "app/api/admin/migrate-dataforseo-logs/route.ts"
  echo "✅ Removed app/api/admin/migrate-dataforseo-logs/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/migrate-dataforseo-logs/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove run-dataforseo-migration
if [ -f "app/api/admin/run-dataforseo-migration/route.ts" ]; then
  rm "app/api/admin/run-dataforseo-migration/route.ts"
  echo "✅ Removed app/api/admin/run-dataforseo-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/run-dataforseo-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove analyze-o3-response
if [ -f "app/api/admin/analyze-o3-response/route.ts" ]; then
  rm "app/api/admin/analyze-o3-response/route.ts"
  echo "✅ Removed app/api/admin/analyze-o3-response/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/analyze-o3-response/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove apply-bulk-url-migration
if [ -f "app/api/admin/apply-bulk-url-migration/route.ts" ]; then
  rm "app/api/admin/apply-bulk-url-migration/route.ts"
  echo "✅ Removed app/api/admin/apply-bulk-url-migration/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/apply-bulk-url-migration/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

# Remove cleanup-failed-outline-sessions
if [ -f "app/api/admin/cleanup-failed-outline-sessions/route.ts" ]; then
  rm "app/api/admin/cleanup-failed-outline-sessions/route.ts"
  echo "✅ Removed app/api/admin/cleanup-failed-outline-sessions/route.ts"
  # Remove empty directory if exists
  DIR=$(dirname "app/api/admin/cleanup-failed-outline-sessions/route.ts")
  if [ -d "$DIR" ] && [ -z "$(ls -A $DIR)" ]; then
    rmdir "$DIR"
    echo "   Removed empty directory: $DIR"
  fi
fi

echo "✅ Cleanup complete! Removed 124 endpoints."
echo "⚠️  Don't forget to:"
echo "   1. Run 'npm run build' to verify no broken imports"
echo "   2. Commit these changes"
echo "   3. Add authentication to remaining admin endpoints"
