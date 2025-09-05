# Test Code Audit Plan
**Created**: September 5, 2025  
**Status**: 📋 PLANNING PHASE  
**Estimated Effort**: 2-3 days for full audit

## 🎯 Objective
Systematically audit 700+ test/debug files to determine what should be:
- ✅ **KEPT** - Production features that are misplaced
- 🔄 **MOVED** - Admin/demo features in wrong location  
- 🗑️ **DELETED** - Pure test/debug code
- 🔒 **SECURED** - Dangerous utilities that need auth

## 📊 Scope
| Category | File Count | Priority |
|----------|------------|----------|
| `/api/test/` endpoints | 164+ | HIGH |
| Root test files (`*.js`) | 179 | MEDIUM |
| `/scripts/` directory | 186 | MEDIUM |
| `/api/admin/` endpoints | 100+ | LOW |
| Backup/old files | 15+ | HIGH |
| **TOTAL** | **700+** | |

## 🔍 Audit Methodology

### Phase 1: Dependency Analysis
**Goal**: Identify which test code is actually used in production

#### Step 1.1: Map Production Dependencies
```bash
# Find all references to /api/test/ from production code
grep -r "/api/test/" app components lib \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir="test" \
  --exclude-dir="__tests__" \
  > audit/test-api-dependencies.txt

# Find which admin pages use test endpoints
grep -r "/api/test/" app/admin \
  --include="*.tsx" --include="*.ts" \
  > audit/admin-test-dependencies.txt

# Check if any environment configs reference test endpoints
grep -r "/api/test/" .env* config* \
  > audit/config-test-references.txt
```

#### Step 1.2: Create Dependency Matrix
| Test Endpoint | Used By | Type | Action |
|--------------|---------|------|--------|
| `/api/test/enrich-demo` | `LineItemsTable.tsx` | Component | MOVE to `/api/admin/demo/` |
| `/api/test/sites-ready-email` | Admin Portal | Admin Page | MOVE to `/api/admin/email/` |
| `/api/test/reset-publisher-claim` | Scripts only | Test Script | DELETE |
| ... | ... | ... | ... |

### Phase 2: Categorization

#### Step 2.1: Analyze Each `/api/test/` Endpoint

**Classification Criteria**:

| Category | Characteristics | Action |
|----------|----------------|--------|
| **Production Feature** | - Used by components<br>- Real data operations<br>- No hardcoded values | MOVE to appropriate location |
| **Admin Tool** | - Database operations<br>- Diagnostic features<br>- Used by admin pages | MOVE to `/api/admin/tools/` |
| **Demo Feature** | - Returns mock data<br>- Hardcoded IDs<br>- Used for demos | MOVE to `/api/admin/demo/` |
| **Pure Test** | - Hardcoded test data<br>- Only used by test files<br>- Destructive operations | DELETE |
| **Dangerous Utility** | - Bulk data changes<br>- No auth checks<br>- Reset operations | DELETE or SECURE |

#### Step 2.2: Review Checklist for Each File

For each file in `/api/test/`, answer:

- [ ] **Is it referenced by production code?** (grep search)
- [ ] **Does it have authentication?** (check for requireInternalUser)
- [ ] **Does it use hardcoded test data?** (look for mock data)
- [ ] **Is it destructive?** (DELETE, TRUNCATE, reset operations)
- [ ] **Is there a production equivalent?** (duplicate functionality)
- [ ] **When was it last modified?** (git log)
- [ ] **Who created it and why?** (git blame, comments)

### Phase 3: Root Directory Test Files

#### Step 3.1: Categorize Root Test Files
```bash
# List all test files with their patterns
ls -la test*.js check*.ts debug*.js fix*.ts validate*.js
```

**Categories**:
| Pattern | Count | Likely Purpose | Default Action |
|---------|-------|----------------|----------------|
| `test_*.js` | 87 | E2E/Integration tests | MOVE to `/tests/` |
| `check_*.ts` | 42 | Validation scripts | REVIEW individually |
| `debug_*.js` | 15 | Debug utilities | DELETE |
| `fix_*.ts` | 10 | One-time fixes | ARCHIVE |
| `validate_*.js` | 8 | Data validation | REVIEW |

#### Step 3.2: Check for CI/CD Usage
```bash
# Check if any test files are used in package.json scripts
grep -E "test_|check_|debug_|fix_" package.json

# Check GitHub Actions or other CI configs
grep -r "test_\|check_\|debug_\|fix_" .github/
```

### Phase 4: Scripts Directory Audit

#### Step 4.1: Categorize Scripts
| Type | Examples | Action |
|------|----------|--------|
| **Active Migrations** | Recent date, production refs | KEEP until complete |
| **Completed Migrations** | Old date, one-time fixes | ARCHIVE |
| **Utility Scripts** | Reusable tools | MOVE to `/tools/` |
| **Test Generators** | Create test data | DELETE |
| **Analysis Scripts** | Read-only reports | KEEP if useful |

#### Step 4.2: Script Review Template
```markdown
## Script: [filename]
- **Purpose**: [What it does]
- **Last Run**: [Date from git log]
- **Dependencies**: [What it calls/modifies]
- **Risk Level**: [LOW/MEDIUM/HIGH]
- **Decision**: [KEEP/ARCHIVE/DELETE]
- **Reason**: [Justification]
```

### Phase 5: Implementation Plan

#### Step 5.1: Create Migration Directories
```bash
mkdir -p api/admin/demo      # For demo features
mkdir -p api/admin/tools     # For admin utilities  
mkdir -p api/admin/email     # For email previews
mkdir -p archive/scripts     # For old scripts
mkdir -p archive/migrations  # For completed migrations
mkdir -p tests/integration   # For test files
mkdir -p tests/e2e          # For E2E tests
```

#### Step 5.2: Migration Order
1. **Week 1 - Critical**
   - Remove `/api/setup-db` (hardcoded admin)
   - Move production-used test endpoints
   - Delete pure test endpoints with no dependencies
   - Archive backup files (*-old, *.backup)

2. **Week 2 - Medium Priority**
   - Organize root test files
   - Archive completed scripts
   - Consolidate admin tools

3. **Week 3 - Cleanup**
   - Remove orphaned files
   - Update documentation
   - Add CI/CD checks

## 📝 Audit Tracking Sheet

### `/api/test/` Endpoints Audit Status

| Endpoint | Reviewed | Used In Prod | Category | Action | Completed |
|----------|----------|--------------|----------|--------|-----------|
| `/api/test/enrich-demo` | ✅ | Yes - LineItemsTable | Demo | MOVE | ⬜ |
| `/api/test/sites-ready-email` | ✅ | Yes - Admin Portal | Admin | MOVE | ⬜ |
| `/api/test/fulfillment-email` | ✅ | No | Test | DELETE | ⬜ |
| `/api/test/reset-publisher-claim` | ✅ | No | Test | DELETE | ⬜ |
| `/api/test/bulk-fix-corrupted-publishers` | ⬜ | ? | ? | ? | ⬜ |
| `/api/test/offering-database-check` | ⬜ | ? | ? | ? | ⬜ |
| `/api/test/cleanup-publisher-data` | ⬜ | ? | ? | ? | ⬜ |
| `/api/test/rejection-email` | ⬜ | ? | ? | ? | ⬜ |
| `/api/test/create-publisher-claim` | ⬜ | ? | ? | ? | ⬜ |
| `/api/test/cleanup-duplicate-offerings` | ⬜ | ? | ? | ? | ⬜ |
| ... [154 more endpoints] | ⬜ | ? | ? | ? | ⬜ |

### Root Test Files Audit Status

| File Pattern | Count | Reviewed | Action | Completed |
|-------------|-------|----------|--------|-----------|
| `test_*.js` | 87 | ⬜ 0/87 | MOVE to /tests/ | ⬜ |
| `check_*.ts` | 42 | ⬜ 0/42 | REVIEW | ⬜ |
| `debug_*.js` | 15 | ⬜ 0/15 | DELETE | ⬜ |
| `fix_*.ts` | 10 | ⬜ 0/10 | ARCHIVE | ⬜ |

### Scripts Directory Audit Status

| Script Type | Count | Reviewed | Keep | Archive | Delete |
|------------|-------|----------|------|---------|--------|
| Migrations | 45 | ⬜ 0/45 | ? | ? | ? |
| Fixes | 38 | ⬜ 0/38 | ? | ? | ? |
| Imports | 22 | ⬜ 0/22 | ? | ? | ? |
| Analysis | 31 | ⬜ 0/31 | ? | ? | ? |
| Tests | 50 | ⬜ 0/50 | ? | ? | ? |

## 🛠️ Automation Scripts

### Script 1: Find Unused Test Endpoints
```bash
#!/bin/bash
# find-unused-test-endpoints.sh

for endpoint in $(find app/api/test -name "route.ts" | sed 's|app||' | sed 's|route.ts||'); do
  echo "Checking $endpoint"
  count=$(grep -r "$endpoint" app components lib --include="*.tsx" --include="*.ts" | wc -l)
  if [ $count -eq 0 ]; then
    echo "  ❌ UNUSED - Safe to delete"
  else
    echo "  ✅ USED - Review before deleting"
    grep -r "$endpoint" app components lib --include="*.tsx" --include="*.ts" | head -3
  fi
done
```

### Script 2: Categorize by Last Modified
```bash
#!/bin/bash
# categorize-by-age.sh

echo "=== Files not modified in 30+ days ==="
find app/api/test -name "*.ts" -mtime +30 -exec ls -la {} \;

echo "=== Files modified in last 7 days ==="
find app/api/test -name "*.ts" -mtime -7 -exec ls -la {} \;
```

### Script 3: Check for Authentication
```bash
#!/bin/bash
# check-auth.sh

for file in $(find app/api/test -name "route.ts"); do
  echo "Checking $file"
  if grep -q "requireInternalUser\|AuthServiceServer" "$file"; then
    echo "  ✅ Has authentication"
  else
    echo "  ❌ NO AUTH - Security risk!"
  fi
done
```

## 📊 Success Metrics

### Completion Criteria
- [ ] All 164+ `/api/test/` endpoints reviewed and categorized
- [ ] All 179 root test files moved or deleted
- [ ] All 186 scripts reviewed and organized
- [ ] Zero test endpoints called from production code
- [ ] All remaining test code has proper authentication
- [ ] Documentation updated with new structure
- [ ] CI/CD rules prevent test code in production

### Risk Reduction Targets
| Metric | Current | Target |
|--------|---------|--------|
| Unauthenticated test endpoints | 164+ | 0 |
| Test files in root | 179 | 0 |
| Unorganized scripts | 186 | <20 |
| Hardcoded credentials | Unknown | 0 |
| Production→Test dependencies | 3+ | 0 |

## 🚨 Red Flags to Watch For

### Do NOT Delete If:
- ❌ Referenced by any production component
- ❌ Used in admin pages (even if path says "test")
- ❌ Part of active migration or fix
- ❌ Contains business logic not replicated elsewhere
- ❌ Has recent commits (< 7 days)

### DEFINITELY Delete If:
- ✅ Only called from test files
- ✅ Contains hardcoded test data
- ✅ Has "TODO: remove" comments
- ✅ Duplicates existing production functionality
- ✅ Not modified in 60+ days AND no references

## 📅 Timeline

### Day 1: Dependency Mapping
- Run dependency analysis scripts
- Create reference matrix
- Identify production dependencies

### Day 2: Categorization
- Review each `/api/test/` endpoint
- Categorize root test files
- Audit scripts directory

### Day 3: Implementation
- Move misplaced production features
- Delete confirmed test code
- Update references in production

### Day 4: Verification
- Run full test suite
- Check for broken references
- Deploy to staging

### Day 5: Documentation & Cleanup
- Update documentation
- Create maintenance guide
- Set up monitoring

## 🔄 Maintenance Plan

### Prevent Future Accumulation
1. **Naming Convention**: No production code in `/test/` directories
2. **Code Review**: Flag any test code in production paths
3. **CI/CD Rules**: Fail builds with test patterns in production
4. **Regular Audits**: Monthly review of test directories
5. **Documentation**: Clear guidelines for test vs production code

### Monitoring
- Set up alerts for new files in `/api/test/`
- Track growth of scripts directory
- Regular security scans for hardcoded credentials
- Monitor for production→test dependencies

---

## 📝 Notes for Auditor

1. **Start with dependencies** - Don't delete anything until you know what uses it
2. **Check git history** - Recent changes might indicate active use
3. **Test in staging** - Verify nothing breaks after cleanup
4. **Document decisions** - Record why each file was kept/moved/deleted
5. **Incremental approach** - Small batches are safer than mass deletion

---

**Last Updated**: September 5, 2025  
**Next Review**: After Phase 1 completion