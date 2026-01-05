# CI/CD Pipeline Validation Guide

## Quick Validation Steps

### 1. Test Locally Before Pushing

#### Backend Validation:
```bash
cd backend

# Lint check
npm run lint

# Security audit
npm audit --audit-level=high

# Unit tests
npm run test:unit

# Integration tests (requires PostgreSQL)
npm run test:integration

# Coverage check
npm run test:cov

# Build
npm run build
```

#### Frontend Validation:
```bash
cd frontend

# Lint check
npm run lint

# Security audit
npm audit --audit-level=high

# Build
npm run build
```

### 2. Test CI Pipeline

#### Option A: Create a Test Branch
```bash
# Create feature branch
git checkout -b test/ci-validation

# Make a small change (e.g., add a comment)
echo "// CI test" >> backend/src/main.ts

# Commit and push
git add .
git commit -m "test: validate CI pipeline"
git push origin test/ci-validation

# Create PR to develop
gh pr create --base develop --title "CI Validation Test" --body "Testing CI pipeline"
```

#### Option B: Push to Develop (if you have access)
```bash
git checkout develop
git pull origin develop

# Make a small change
echo "// CI validation" >> backend/src/main.ts

git add .
git commit -m "test: validate CI pipeline"
git push origin develop
```

### 3. Monitor CI Execution

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Monitor each job:
   - ✅ Green checkmark = Passed
   - ❌ Red X = Failed
   - ⏳ Yellow circle = In progress

### 4. Expected Job Execution Order

**Backend Jobs (Parallel):**
- `Backend - Lint` (runs first)
- `Backend - Security Audit` (runs first)
- `Backend - Unit Tests` (runs first)
- `Backend - Integration Tests` (runs first, requires PostgreSQL)

**Backend Jobs (Sequential):**
- `Backend - Coverage Threshold` (waits for unit + integration)
- `Backend - Build` (waits for lint + security)

**Frontend Jobs (Parallel):**
- `Frontend - Lint` (runs first)
- `Frontend - Security Audit` (runs first)

**Frontend Jobs (Sequential):**
- `Frontend - Build` (waits for lint + security)

**Final Job:**
- `CI Pipeline - Success` (waits for all jobs)

### 5. Common Issues and Solutions

#### Issue: ESLint Fails
**Error:** `ESLint found problems`
**Solution:**
```bash
cd backend  # or frontend
npm run lint -- --fix  # Auto-fix issues
# Review changes and commit
```

#### Issue: Security Audit Fails
**Error:** `found X vulnerabilities (Y moderate, Z high)`
**Solution:**
```bash
npm audit fix  # Try auto-fix
npm audit fix --force  # Force fix (review changes)
# Or manually update vulnerable packages
```

#### Issue: Tests Fail
**Error:** `Tests failed`
**Solution:**
```bash
# Run tests locally to see errors
npm run test:unit
npm run test:integration

# Fix failing tests
# Ensure database is running for integration tests
```

#### Issue: Coverage Below Threshold
**Error:** `Coverage for branches (45.23%) does not meet global threshold (60%)`
**Solution:**
- Write more tests for uncovered code
- Lower threshold temporarily (not recommended for production)
- Review coverage report: `backend/coverage/lcov-report/index.html`

#### Issue: Build Fails
**Error:** `Build failed`
**Solution:**
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Fix compilation errors
```

#### Issue: PostgreSQL Service Not Available
**Error:** `Connection refused` in integration tests
**Solution:**
- Check GitHub Actions service configuration
- Ensure PostgreSQL service is properly configured in workflow
- Verify connection string matches service settings

### 6. Validate Branch Protection

#### Test PR Requirements:
1. Create a PR to `develop` or `main`
2. Verify that:
   - ✅ PR cannot be merged without CI passing
   - ✅ PR requires approval (if configured)
   - ✅ PR shows all required status checks
   - ✅ Direct push to protected branch is blocked

#### Test Force Push Protection:
```bash
# This should fail if protection is enabled
git push origin develop --force
# Expected: "remote: error: GH006: Protected branch update failed"
```

### 7. Coverage Reports

#### View Coverage Locally:
```bash
cd backend
npm run test:cov

# Open HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows
xdg-open coverage/lcov-report/index.html  # Linux
```

#### View Coverage in CI:
1. Go to **Actions** → Select workflow run
2. Click on `Backend - Unit Tests` or `Backend - Integration Tests`
3. Download `backend-unit-coverage` or `backend-integration-coverage` artifact
4. Extract and open `coverage/lcov-report/index.html`

### 8. Performance Benchmarks

Expected CI execution times:
- **Backend Lint:** ~30 seconds
- **Backend Security:** ~20 seconds
- **Backend Unit Tests:** ~1-2 minutes
- **Backend Integration Tests:** ~5-10 minutes
- **Backend Build:** ~1 minute
- **Frontend Lint:** ~30 seconds
- **Frontend Security:** ~20 seconds
- **Frontend Build:** ~2-3 minutes
- **Total Pipeline:** ~10-15 minutes

### 9. Success Criteria

✅ **Pipeline is successful when:**
- All jobs show green checkmarks
- No security vulnerabilities (high/critical)
- All tests pass
- Coverage meets thresholds (≥60%)
- Builds complete successfully
- Final `CI Pipeline - Success` job passes

### 10. Troubleshooting Commands

```bash
# Check workflow syntax
gh workflow view ci.yml

# View workflow runs
gh run list --workflow=ci.yml

# View specific run logs
gh run view <run-id> --log

# Rerun failed jobs
gh run rerun <run-id>

# Cancel running workflow
gh run cancel <run-id>
```

## Next Steps After Validation

1. ✅ Configure branch protection rules (see `BRANCH_PROTECTION.md`)
2. ✅ Set up CODEOWNERS file (already created)
3. ✅ Enable required status checks in branch settings
4. ✅ Test with a real PR
5. ✅ Monitor first few pipeline runs
6. ✅ Adjust coverage thresholds if needed
7. ✅ Set up notifications for failed builds

