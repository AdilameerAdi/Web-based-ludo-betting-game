# Pre-Commit Checklist

## ⚠️ IMPORTANT: Before Committing

### 1. Remove .env Files from Git Tracking

If `.env` files are already tracked by git, remove them:

```bash
# Remove from git tracking (but keep the file locally)
git rm --cached Frontend/.env
git rm --cached backend/.env

# Verify they're removed
git ls-files | grep "\.env$"
# Should return nothing
```

### 2. Verify No Hardcoded Secrets

```bash
# Check for hardcoded JWT secrets (should return nothing)
grep -r "your-secret-key" --exclude-dir=node_modules --exclude="*.md" --exclude="*.example"
```

### 3. Verify .gitignore is Working

```bash
# Check if .env files are ignored
git status
# Should NOT show .env files in untracked files
```

### 4. Security Checklist

- [x] All JWT_SECRET fallbacks removed from code
- [x] .env files in .gitignore
- [x] No API keys hardcoded
- [x] No passwords in code
- [x] env.example files updated

### 5. Files to Commit

✅ Safe to commit:
- All source code
- package.json files
- env.example files
- Documentation files
- Configuration files (not containing secrets)

❌ Never commit:
- .env files
- node_modules/
- dist/ or build/ folders
- Log files
- IDE configuration with secrets

## Quick Verification Commands

```bash
# 1. Check for tracked .env files
git ls-files | grep "\.env$"

# 2. Check for hardcoded secrets
grep -r "your-secret-key" --exclude-dir=node_modules --exclude="*.md" --exclude="*.example"

# 3. Check git status
git status

# 4. Verify .gitignore
cat .gitignore | grep "\.env"
```

## After Removing .env from Tracking

Once you've removed `.env` files from git tracking, they will:
- Still exist locally (so your app works)
- Not be committed to git
- Not be pushed to GitHub

This is the correct setup! ✅

