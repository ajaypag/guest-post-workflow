# Scripts Recommended for Deletion
**Generated**: September 5, 2025
**Total for Deletion**: 82 scripts

## Deletion Commands
Run these commands to delete the obviously unnecessary scripts:

### 1. Delete Website-Specific Debug Scripts (12 files)
```bash
cd scripts && rm -f \
  check-coinlib-shadow-data.js \
  check-disquantified.ts \
  check-etruesports.ts \
  check-justalittlebite.ts \
  check-letwomenspeak.ts \
  check-livepositively.ts \
  check-luhhu.ts \
  check-techpreview-simple.ts \
  check-techpreview.ts \
  fix-disquantified-offering.ts \
  fix-etruesports-offering.ts \
  setup-coinlib-claim.js
```

### 2. Delete Generic Check Scripts (19 files)
```bash
cd scripts && rm -f \
  check-admin-user.ts \
  check-dataforseo-results.ts \
  check-db-connection.ts \
  check-domain-data.ts \
  check-domains.sql \
  check-offering-website-relationship.ts \
  check-offering-website.js \
  check-order-target-pages.ts \
  check-orphaned-domains.ts \
  check-pricing-cleanup-status.ts \
  check-pricing-format.ts \
  check-problem-websites.ts \
  check-publisher-reuse.ts \
  check-publisher-websites-connection.ts \
  check-remaining-issues.ts \
  check-system-user.ts \
  check-users.ts \
  check-verification-status.js \
  check-website-data.ts
```

### 3. Delete Test Scripts (46 files)
**NOTE**: Excluding test-keyword-generation.ts which is used in package.json

```bash
cd scripts && rm -f \
  test-all-pricing-displays.ts \
  test-api-assignment.ts \
  test-claim-api.ts \
  test-cleanup-migration.ts \
  test-conservative-pricing.ts \
  test-db-connection.ts \
  test-derived-pricing-dashboard.ts \
  test-domain-assignment.ts \
  test-email-invitation-flow.ts \
  test-email-sending.ts \
  test-existing-connection.ts \
  test-find-duplicate-line-items.ts \
  test-fix-publisher-relationships.ts \
  test-get-publisher-for-website.ts \
  test-global-publisher-pricing.ts \
  test-guest-post-pricing.ts \
  test-keyword-extraction-script.ts \
  test-linkbuilder-pricing.ts \
  test-manyreach-webhook.ts \
  test-migration.ts \
  test-offering-database-structure.ts \
  test-order-confirmation.ts \
  test-order-routes.ts \
  test-phase2-conversion.ts \
  test-phase2-logic.ts \
  test-phase6b-assignment.ts \
  test-phase6b-connection.ts \
  test-phase6b-results.ts \
  test-price-formatting.ts \
  test-pricing-display.ts \
  test-pricing-flow.ts \
  test-pricing-with-conversion.ts \
  test-pricing.ts \
  test-publisher-offerings.ts \
  test-publisher-pricing-api.ts \
  test-publisher-pricing.ts \
  test-publisher-website-creation.ts \
  test-relationship-fix.ts \
  test-shadow-migration-manual.ts \
  test-shadow-migration-simple.ts \
  test-shadow-migration.ts \
  test-webhook-manual.ts \
  test-website-assignment-flow.ts \
  test-website-creation-flow.ts \
  test-website-publisher-integration.ts \
  test-workflow-assignment.ts
```

### 4. Delete Simple/Debug Variants (5 files)
```bash
cd scripts && rm -f \
  audit-existing-connections-simple.ts \
  check-techpreview-simple.ts \
  test-shadow-migration-simple.ts \
  simple-phase6b-migration.ts \
  verify-phase2-simple.ts
```

### ALL-IN-ONE Command
To delete all 82 scripts at once:

```bash
cd scripts && rm -f \
  check-coinlib-shadow-data.js check-disquantified.ts check-etruesports.ts \
  check-justalittlebite.ts check-letwomenspeak.ts check-livepositively.ts \
  check-luhhu.ts check-techpreview-simple.ts check-techpreview.ts \
  fix-disquantified-offering.ts fix-etruesports-offering.ts setup-coinlib-claim.js \
  check-admin-user.ts check-dataforseo-results.ts check-db-connection.ts \
  check-domain-data.ts check-domains.sql check-offering-website-relationship.ts \
  check-offering-website.js check-order-target-pages.ts check-orphaned-domains.ts \
  check-pricing-cleanup-status.ts check-pricing-format.ts check-problem-websites.ts \
  check-publisher-reuse.ts check-publisher-websites-connection.ts \
  check-remaining-issues.ts check-system-user.ts check-users.ts \
  check-verification-status.js check-website-data.ts test-all-pricing-displays.ts \
  test-api-assignment.ts test-claim-api.ts test-cleanup-migration.ts \
  test-conservative-pricing.ts test-db-connection.ts test-derived-pricing-dashboard.ts \
  test-domain-assignment.ts test-email-invitation-flow.ts test-email-sending.ts \
  test-existing-connection.ts test-find-duplicate-line-items.ts \
  test-fix-publisher-relationships.ts test-get-publisher-for-website.ts \
  test-global-publisher-pricing.ts test-guest-post-pricing.ts \
  test-keyword-extraction-script.ts test-linkbuilder-pricing.ts \
  test-manyreach-webhook.ts test-migration.ts test-offering-database-structure.ts \
  test-order-confirmation.ts test-order-routes.ts test-phase2-conversion.ts \
  test-phase2-logic.ts test-phase6b-assignment.ts test-phase6b-connection.ts \
  test-phase6b-results.ts test-price-formatting.ts test-pricing-display.ts \
  test-pricing-flow.ts test-pricing-with-conversion.ts test-pricing.ts \
  test-publisher-offerings.ts test-publisher-pricing-api.ts test-publisher-pricing.ts \
  test-publisher-website-creation.ts test-relationship-fix.ts \
  test-shadow-migration-manual.ts test-shadow-migration-simple.ts \
  test-shadow-migration.ts test-webhook-manual.ts test-website-assignment-flow.ts \
  test-website-creation-flow.ts test-website-publisher-integration.ts \
  test-workflow-assignment.ts audit-existing-connections-simple.ts \
  simple-phase6b-migration.ts verify-phase2-simple.ts
```

## Scripts Being KEPT (used in package.json)
- migrate.ts
- debug-and-migrate.ts  
- test-keyword-generation.ts ✓ (NOT deleted)
- audit-broken-images.ts
- validate-all-images.ts
- comment-out-all-images.ts

## Summary
- **82 scripts** identified for deletion
- All are one-time debugging/test utilities
- None are referenced in package.json
- None are imported by production code
- Many are website-specific debugging (individual domain checks)

## Impact
- **No production impact** - These scripts are not used anywhere
- **Cleaner codebase** - Removes 44% of scripts directory clutter
- **104 scripts will remain** after cleanup (including operational scripts)