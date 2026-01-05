# Branch Protection Rules - Enterprise Configuration

## Overview
This document outlines the recommended branch protection rules for the FlowHub repository to ensure code quality and prevent bad code from reaching production.

## Protected Branches

### 1. `main` Branch (Production)
**Status:** CRITICAL - Full protection required

**Protection Rules:**
- ✅ Require a pull request before merging
- ✅ Require approvals: **2 reviewers** (at least 1 must be from code owners)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging:
  - `Backend - Lint`
  - `Backend - Security Audit`
  - `Backend - Unit Tests`
  - `Backend - Integration Tests`
  - `Backend - Coverage Threshold`
  - `Backend - Build`
  - `Frontend - Lint`
  - `Frontend - Security Audit`
  - `Frontend - Build`
  - `CI Pipeline - Success`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push to matching branches: **No one** (only via PR)
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

### 2. `develop` Branch (Staging)
**Status:** HIGH - Strong protection required

**Protection Rules:**
- ✅ Require a pull request before merging
- ✅ Require approvals: **1 reviewer**
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging:
  - `Backend - Lint`
  - `Backend - Security Audit`
  - `Backend - Unit Tests`
  - `Backend - Integration Tests`
  - `Backend - Coverage Threshold`
  - `Backend - Build`
  - `Frontend - Lint`
  - `Frontend - Security Audit`
  - `Frontend - Build`
  - `CI Pipeline - Success`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ⚠️ Allow force pushes: **Disabled** (except for repository admins in emergencies)
- ⚠️ Allow deletions: **Disabled**

## How to Configure

### Via GitHub Web UI:
1. Go to **Settings** → **Branches**
2. Click **Add rule** or edit existing rule
3. Configure branch name pattern: `main` or `develop`
4. Apply the settings listed above
5. Click **Create** or **Save changes**

### Via GitHub CLI:
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Backend - Lint","Backend - Security Audit","Backend - Unit Tests","Backend - Integration Tests","Backend - Coverage Threshold","Backend - Build","Frontend - Lint","Frontend - Security Audit","Frontend - Build","CI Pipeline - Success"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null
```

## CODEOWNERS File

Create `.github/CODEOWNERS` to automatically assign reviewers:

```
# Global owners
* @your-team-lead

# Backend
/backend/ @backend-team

# Frontend
/frontend/ @frontend-team

# Infrastructure
/.github/ @devops-team
/docker-compose*.yml @devops-team
```

## Emergency Override

In case of critical production issues, repository admins can:
1. Temporarily disable branch protection (not recommended)
2. Use force push with admin privileges (audit trail maintained)
3. Create hotfix branch from `main` → merge back via PR

## Best Practices

1. **Never bypass protection rules** - Always use PRs
2. **Keep PRs small** - Easier to review and test
3. **Write meaningful commit messages** - Follow conventional commits
4. **Fix CI failures immediately** - Don't merge with failing checks
5. **Review security alerts** - Address high/critical vulnerabilities before merging

