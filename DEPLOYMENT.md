# Deployment Guide

This guide covers deployment to Render and best practices to prevent deployment issues.

## 🚀 Quick Deploy

```bash
# 1. Run pre-deployment checks
./scripts/pre-deploy-check.sh

# 2. Commit and push
git add -A
git commit -m "Your changes"
git push origin main
```

Render will automatically deploy when you push to `main`.

---

## 🛡️ Preventing Deployment Issues

### **Option 1: Pre-commit Hooks (Recommended)**

Automatically check code quality before every commit:

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install

# Now hooks run automatically on git commit
# Or run manually on all files:
pre-commit run --all-files
```

**What it checks:**
- ✅ Python syntax errors
- ✅ Code formatting (Black)
- ✅ Linting (Flake8)
- ✅ TypeScript/ESLint
- ✅ Trailing whitespace, large files, etc.

### **Option 2: Manual Pre-Deploy Script**

Run checks before deploying:

```bash
./scripts/pre-deploy-check.sh
```

This validates:
- Frontend TypeScript compilation
- Backend Python syntax
- Module imports
- Dependency conflicts
- Common deployment gotchas

### **Option 3: GitHub Actions CI/CD**

Automated checks on every push (if using GitHub):

The `.github/workflows/ci.yml` file automatically runs:
- TypeScript type checking
- Frontend build
- Python syntax validation
- Backend import tests
- Linting and formatting checks

---

## 🔧 Local Development Setup

### **Backend**

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Install development tools
pip install black flake8 pylint pre-commit

# Run linting
flake8 . --exclude=venv,.venv --max-line-length=120
black . --check --exclude="venv|.venv"

# Test the app
python -c "from wsgi import app; print('✓ Backend OK')"
```

### **Frontend**

```bash
cd frontend

# Install dependencies
npm install

# Install ESLint (if not in package.json)
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Run TypeScript check
npm run build

# Add lint script to package.json if missing:
# "scripts": {
#   "lint": "eslint . --ext .ts,.tsx"
# }
```

---

## 📋 Common Issues and Fixes

### **Issue: `ModuleNotFoundError: No module named 'processors'`**

**Cause:** Python can't find backend modules when running from project root.

**Fix:** Already fixed in `backend/app.py` (lines 18-21):
```python
current_dir = Path(__file__).parent.resolve()
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
```

### **Issue: `ImportError: cannot import name 'cached_download'`**

**Cause:** Version conflict between `sentence-transformers` and `huggingface-hub`.

**Fix:** Already fixed in `requirements.txt`:
```
sentence-transformers==2.5.1
huggingface-hub==0.21.4
```

### **Issue: `SyntaxError: unterminated string literal`**

**Cause:** Multi-line f-strings are not properly closed.

**Prevention:**
- Use pre-commit hooks
- Run `python -m py_compile file.py` before committing
- Extract complex dictionaries before f-strings:
  ```python
  # ❌ Bad
  yield f"data: {json.dumps({
      'key': value
  })}\n"

  # ✅ Good
  data = {'key': value}
  yield f"data: {json.dumps(data)}\n"
  ```

### **Issue: TypeScript unused imports**

**Cause:** Imports declared but never used.

**Prevention:**
- Enable `noUnusedLocals` in `tsconfig.json`
- Run `npm run build` before committing
- Use ESLint with `@typescript-eslint/no-unused-vars` rule

---

## 🎯 Deployment Checklist

Before every deployment:

- [ ] Run `./scripts/pre-deploy-check.sh`
- [ ] All tests pass locally
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend imports successfully
- [ ] No uncommitted changes with sensitive data
- [ ] Environment variables set on Render dashboard
- [ ] Database migrations applied (if any)

---

## 🔑 Required Environment Variables

Make sure these are set in Render dashboard:

**Backend Service:**
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI API key (for audio transcription)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase service role key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `ENCRYPTION_KEY` - 32+ character encryption key
- `FLASK_ENV=production`

**Frontend Service:**
- `VITE_SUPABASE_URL` - Same as backend Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
- `VITE_API_URL=https://dropcal-backend.onrender.com`

---

## 📚 Additional Resources

- [Render Docs](https://render.com/docs)
- [Pre-commit Hooks](https://pre-commit.com/)
- [Python Black](https://black.readthedocs.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint](https://eslint.org/)

---

## 🐛 Troubleshooting

### Render deployment failing?

1. Check the build logs in Render dashboard
2. Look for Python syntax errors or import errors
3. Verify all environment variables are set
4. Check `render.yaml` matches your project structure
5. Run `./scripts/pre-deploy-check.sh` locally

### Need to test locally like Render does?

```bash
# Simulate Render's deployment from project root
cd /path/to/project
export $(cat backend/.env | xargs)  # Load env vars
python -c "import sys; sys.path.insert(0, '.'); import backend.app"
```

### Getting weird import errors?

```bash
# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -name "*.pyc" -delete

# Reinstall dependencies
pip install --force-reinstall -r backend/requirements.txt
```
