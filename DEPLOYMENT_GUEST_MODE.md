# Guest Mode Deployment Guide

## Overview

This guide covers deploying the guest mode feature with production-ready configurations.

## Critical Fixes Applied

### 1. ✅ Polling Bug Fix
**Problem:** Guest sessions failed during polling because `pollSession()` called authenticated endpoint.

**Solution:** Added `isGuest` parameter to route to correct endpoint.

**Files Changed:**
- `frontend/src/api/backend-client.ts` - Added `isGuest` parameter to `pollSession()`
- `frontend/src/App.tsx` - Pass `!user` as `isGuest` when polling

### 2. ✅ Production Rate Limiting
**Problem:** In-memory rate limiting resets on server restart, not suitable for production.

**Solution:** Redis-based rate limiting with environment variable configuration.

**Files Changed:**
- `backend/config/rate_limit.py` - New configuration module
- `backend/app.py` - Uses Redis when `REDIS_URL` is set
- `backend/requirements.txt` - Added `redis==5.0.1`

### 3. ✅ Guest Formatting Agent
**Problem:** Personalized formatting agent requires user history, breaks for guests.

**Solution:** Separate guest formatting agent using standard rules (no personalization).

**Files Changed:**
- `backend/extraction/agents/guest_formatting.py` - New guest agent
- `backend/processing/session_processor.py` - Conditionally uses guest agent

**When Used:**
- Guest sessions (guest_mode=True)
- Users with < 10 calendar events

---

## Environment Configuration

### Development (Local)

```bash
# .env file - no REDIS_URL needed
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Rate limiting will use in-memory storage (logs warning on startup).

### Production

```bash
# .env file
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Add Redis for production-ready rate limiting
REDIS_URL=redis://localhost:6379
# OR with password:
REDIS_URL=redis://:password@redis-host:6379/0
```

---

## Redis Setup

### Option 1: Local Redis (Development/Testing)

```bash
# Install Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server

# Verify it's running
redis-cli ping  # Should return "PONG"
```

### Option 2: Managed Redis (Production)

**Recommended providers:**
- **Railway**: redis://default:password@hostname:port
- **Render**: redis://hostname:port
- **Upstash**: redis://hostname:port (serverless, free tier)
- **Redis Cloud**: redis://:password@hostname:port

**Setup steps:**
1. Create Redis instance on your provider
2. Copy connection URL
3. Set `REDIS_URL` environment variable
4. Deploy backend

---

## Database Migration

### Apply Guest Mode Migration

```bash
# Connect to Supabase via SQL editor or CLI

# Run migration:
backend/database/migrations/001_add_guest_mode_to_sessions.sql
```

**Migration contents:**
```sql
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS guest_mode BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_guest_mode ON sessions(guest_mode);

COMMENT ON COLUMN sessions.guest_mode IS 'Whether this session was created by a guest user (no authentication)';
```

### Verify Migration

```sql
-- Check column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'guest_mode';

-- Check index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'sessions' AND indexname = 'idx_sessions_guest_mode';
```

---

## Deployment Checklist

### Backend

- [ ] Run database migration
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Set `REDIS_URL` environment variable (production only)
- [ ] Verify rate limiting logs on startup:
  - Dev: "Rate limiting: Using in-memory storage (development only)"
  - Prod: "Rate limiting: Using Redis at redis://..."
- [ ] Test guest endpoints:
  ```bash
  curl -X POST http://localhost:5000/api/sessions/guest \
    -H "Content-Type: application/json" \
    -d '{"input_type": "text", "input_content": "Meeting tomorrow at 2pm"}'
  ```

### Frontend

- [ ] No changes needed (automatically uses guest endpoints when not authenticated)
- [ ] Test guest flow:
  1. Open app (not signed in)
  2. See guest toast
  3. Process 3 sessions
  4. Try 4th → auth modal appears
  5. Click "Add to calendar" → auth modal appears
  6. Sign in → sessions migrate

---

## Monitoring

### Rate Limiting

**Check Redis keys (production):**
```bash
redis-cli
> KEYS LIMITER/*
> GET LIMITER/127.0.0.1:POST:/api/sessions/guest
```

**Log warnings:**
- Look for "Rate limiting: Using in-memory storage" in production (indicates REDIS_URL not set)
- Monitor 429 errors (rate limit exceeded)

### Guest Formatting Agent

**Check agent selection:**
```bash
# Look for these logs in backend:
"Using guest formatting agent for session {session_id}"
"Using personalized formatting agent for session {session_id}"
"User has only {count} events (threshold: 10)"
```

### Guest Sessions

**Query guest sessions:**
```sql
-- Count guest sessions
SELECT COUNT(*) FROM sessions WHERE guest_mode = true;

-- Guest sessions not migrated (orphaned)
SELECT * FROM sessions
WHERE guest_mode = true
  AND created_at < NOW() - INTERVAL '7 days';

-- Guest sessions by date
SELECT DATE(created_at) as date, COUNT(*)
FROM sessions
WHERE guest_mode = true
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Performance

### Rate Limiting Performance

**In-memory (dev):**
- ✅ Fast (microseconds)
- ❌ Resets on restart
- ❌ Doesn't work with multiple servers

**Redis (prod):**
- ✅ Persistent across restarts
- ✅ Works with multiple servers
- ✅ Fast (milliseconds)
- ✅ Can monitor usage

### Guest Formatting Agent

**Performance vs. Personalized Agent:**
- Similar latency (~1-2s per event)
- No database queries needed (faster for new users)
- More predictable output (no user-specific patterns)

---

## Security Notes

### IP-Based Rate Limiting

**Limitations:**
- Can be bypassed with VPN/proxy
- Shared IPs (offices, schools) affect all users

**Mitigations:**
- Combined with localStorage tracking (frontend)
- Conservative limits (10/hour for creation)
- Higher limits for reads (50/hour)

**Future improvements:**
- Add CAPTCHA for suspicious IPs
- Fingerprinting (browser characteristics)
- Account for proxy headers (`X-Forwarded-For`)

### Guest Session Cleanup

**Recommended cron job (weekly):**
```sql
-- Delete guest sessions older than 30 days that weren't migrated
DELETE FROM sessions
WHERE guest_mode = true
  AND created_at < NOW() - INTERVAL '30 days';
```

**Also clean up orphaned files in Supabase storage:**
```sql
-- Find guest sessions with file uploads
SELECT input_content FROM sessions
WHERE guest_mode = true
  AND input_type IN ('image', 'audio')
  AND created_at < NOW() - INTERVAL '30 days';

-- Manually delete files from Supabase storage bucket
```

---

## Testing

### Manual Test Plan

1. **Guest Flow**
   - [ ] Process text as guest (no auth)
   - [ ] See guest toast with remaining sessions
   - [ ] Process 2 more times (3 total)
   - [ ] Try 4th → blocked with auth modal
   - [ ] Click "Add to calendar" → auth modal
   - [ ] Sign in → sessions migrate
   - [ ] Check session history shows migrated sessions

2. **Rate Limiting**
   - [ ] Make 11 guest requests in 1 hour
   - [ ] Verify 11th returns 429 error
   - [ ] Check Redis keys (if using Redis)

3. **Guest Formatting Agent**
   - [ ] Create guest session → check logs for "Using guest formatting agent"
   - [ ] Sign in with new account → should still use guest agent (<10 events)
   - [ ] Add 10+ events → should switch to personalized agent

4. **Session Protection**
   - [ ] Create guest session, copy URL
   - [ ] Open in incognito → should block (not their guest session)
   - [ ] Sign in → should see session

---

## Troubleshooting

### "Rate limiting: Using in-memory storage" in Production
- **Cause:** `REDIS_URL` environment variable not set
- **Fix:** Set `REDIS_URL` and restart server

### Guest Sessions Not Polling
- **Cause:** Polling bug (calling authenticated endpoint)
- **Fix:** Ensure `pollSession()` gets `isGuest: true` parameter

### Guest Formatting Agent Not Used
- **Cause:** `guest_mode` column missing or event count check failing
- **Fix:** Run migration, check `Event.count_by_user()` method exists

### Rate Limit 429 Errors
- **Cause:** IP exceeded rate limit
- **Fix:**
  - Check if legitimate traffic spike
  - Adjust limits in `config/rate_limit.py` if needed
  - Clear Redis keys for that IP (temporary fix)

### Sessions Not Migrating on Sign-in
- **Cause:** `guest_session_ids` not passed to `/api/auth/sync-profile`
- **Fix:** Check App.tsx calls `migrateGuestSessions()` in useEffect

---

## Cost Considerations

### Redis Costs

**Free tiers available:**
- Upstash: 10,000 requests/day free
- Railway: $5/month includes Redis
- Render: $7/month for 25MB Redis

**Cost estimate (1000 daily guest users):**
- ~10,000 Redis requests/day
- Well within free tier limits

### AI Processing Costs

**Guest sessions use same pipeline:**
- Same cost per session as authenticated users
- 3 free sessions per guest (localStorage enforced)
- Rate limited to 10/hour per IP (prevents abuse)

**With 3-session limit:**
- Max 3 sessions per guest before requiring sign-in
- Encourages conversion at optimal point
- Prevents unlimited free usage

---

## Next Steps (Optional Enhancements)

### Priority 1: Production Monitoring
- [ ] Add PostHog/analytics for guest conversion tracking
- [ ] Alert on high rate limit rejections
- [ ] Dashboard for guest session metrics

### Priority 2: Cleanup Automation
- [ ] Cron job for old guest session deletion
- [ ] Automated Supabase storage cleanup
- [ ] Guest-to-abandoned session alerts

### Priority 3: Security Hardening
- [ ] CAPTCHA for suspicious IPs
- [ ] Browser fingerprinting
- [ ] Rate limiting by session, not just IP

### Priority 4: Enhanced Guest Experience
- [ ] Show progress bar (X/3 sessions used)
- [ ] "Upgrade to save your sessions" CTA
- [ ] Guest session expiry warning (30 days)
