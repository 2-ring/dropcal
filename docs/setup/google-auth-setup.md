# Authentication Setup Guide

This guide explains how to set up Google OAuth authentication with Supabase for DropCal.

## Prerequisites

- A Supabase project (see [DEPLOYMENT.md](DEPLOYMENT.md) for setup)
- A Google Cloud project with OAuth credentials

---

## Part 1: Google Cloud Console Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Configure the consent screen if you haven't:
   - Choose **External** user type
   - Fill in app name: `DropCal`
   - Add your email as developer contact
   - Add scopes: `email`, `profile`, and `https://www.googleapis.com/auth/calendar`
6. For Application type, select **Web application**
7. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://your-domain.com` (for production)
8. Add **Authorized redirect URIs**:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - For local testing: `http://localhost:54321/auth/v1/callback`
9. Click **Create**
10. **Save the Client ID and Client Secret** - you'll need these next

---

## Part 2: Supabase Setup

### 1. Enable Google OAuth Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Providers**
4. Find **Google** in the list and click to expand
5. Toggle **Enable Google Provider** to ON
6. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
7. Click **Save**

### 2. Configure Redirect URLs

1. In Supabase, go to **Authentication → URL Configuration**
2. Add your site URLs:
   - **Site URL**: `http://localhost:5173` (dev) or `https://your-domain.com` (prod)
3. Add redirect URLs:
   - `http://localhost:5173` (for local development)
   - `https://your-domain.com` (for production)

---

## Part 3: Environment Variables

### Backend (.env)

Add these to your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_service_role_key_here

# Google OAuth (for Calendar API)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Where to find these:**
- **SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
- **SUPABASE_KEY**: Supabase Dashboard → Settings → API → `service_role` key (⚠️ Keep this secret!)
- **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET**: From Google Cloud Console OAuth credentials

### Frontend (.env)

Add these to your `frontend/.env` file:

```env
# Supabase Configuration (Frontend uses ANON key, NOT service role key)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Backend API URL
VITE_API_URL=http://localhost:5000
```

**Where to find these:**
- **VITE_SUPABASE_URL**: Same as backend SUPABASE_URL
- **VITE_SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → `anon` `public` key (✅ Safe for frontend)
- **VITE_API_URL**: Your backend API URL (local or deployed)

---

## Part 4: Install Dependencies

### Frontend

```bash
cd frontend
npm install
```

This will install `@supabase/supabase-js` which was added to package.json.

### Backend

```bash
cd backend
pip install -r requirements.txt
```

This includes the `supabase` Python package.

---

## Part 5: Test Authentication

### 1. Start the Backend

```bash
cd backend
python app.py
```

Backend should be running on `http://localhost:5000`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:5173`

### 3. Test Login Flow

1. Open `http://localhost:5173` in your browser
2. Click the **"Sign in with Google"** button in the sidebar
3. You'll be redirected to Google's OAuth consent screen
4. After authorizing, you'll be redirected back to the app
5. You should see your user info in the sidebar with a logout button

### 4. Test Protected Routes

Once logged in, try creating a session:
- Drop a file or enter text
- The app will send authenticated requests to the backend
- Check browser DevTools → Network tab to see the `Authorization` header with your JWT token

---

## Architecture Overview

### Authentication Flow

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│   Frontend  │  OAuth  │   Supabase   │  Verify │   Backend  │
│  (React)    │────────▶│    Auth      │◀────────│  (Flask)   │
└─────────────┘         └──────────────┘         └────────────┘
      │                        │                         │
      │  1. signInWithGoogle() │                         │
      │───────────────────────▶│                         │
      │                        │                         │
      │  2. Redirect to Google │                         │
      │◀───────────────────────│                         │
      │                        │                         │
      │  3. User authorizes    │                         │
      │───────────────────────▶│                         │
      │                        │                         │
      │  4. Return with JWT    │                         │
      │◀───────────────────────│                         │
      │                        │                         │
      │  5. Store token        │                         │
      │  (localStorage)        │                         │
      │                        │                         │
      │  6. API request with   │                         │
      │     Authorization:     │                         │
      │     Bearer <token>     │                         │
      │────────────────────────┼────────────────────────▶│
      │                        │                         │
      │                        │  7. Verify token        │
      │                        │◀────────────────────────│
      │                        │                         │
      │                        │  8. Return user data    │
      │                        │─────────────────────────▶│
      │                        │                         │
      │  9. Protected resource │                         │
      │◀─────────────────────────────────────────────────│
```

### Key Components

#### Frontend
- **`frontend/src/auth/supabase.ts`**: Supabase client and auth functions
- **`frontend/src/auth/AuthContext.tsx`**: React context for auth state
- **`frontend/src/auth/LoginButton.tsx`**: Login/logout UI component
- **`frontend/src/api/backend-client.ts`**: API client with auth headers

#### Backend
- **`backend/auth/middleware.py`**: `@require_auth` decorator
- **`backend/app.py`**: Protected routes use `@require_auth`

---

## Troubleshooting

### "Invalid token" or 401 Errors

**Possible causes:**
1. Token expired - refresh the page to get a new token
2. Environment variables not set correctly
3. Supabase service role key used instead of anon key in frontend
4. Backend can't reach Supabase (check SUPABASE_URL and SUPABASE_KEY)

**Fix:**
- Verify all environment variables are correct
- Check browser console for auth errors
- Check backend logs for token verification errors
- Try logging out and logging in again

### OAuth Redirect Errors

**Possible causes:**
1. Redirect URI not configured in Google Cloud Console
2. Site URL not configured in Supabase
3. Localhost port mismatch

**Fix:**
- Ensure `https://your-project-id.supabase.co/auth/v1/callback` is in Google's Authorized redirect URIs
- Ensure your frontend URL is in Supabase's redirect URLs
- Check that ports match (default: frontend=5173, backend=5000)

### Google Calendar Permissions

If calendar scope isn't granted:
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Revoke DropCal access
3. Sign in again - you'll be prompted for calendar access

---

## Security Notes

### ⚠️ Important: Service Role Key Security

**NEVER** expose your Supabase service role key:
- ✅ Use in backend (server-side)
- ❌ NEVER use in frontend
- ❌ NEVER commit to git
- ❌ NEVER share publicly

The frontend should **only** use the anon/public key.

### Token Storage

- Tokens are stored in `localStorage` by Supabase client
- Tokens expire after a set period (configurable in Supabase)
- The `AuthContext` handles token refresh automatically

### Protected Routes

All session and user data routes are protected with `@require_auth`:
- `POST /api/sessions`
- `POST /api/upload`
- `GET /api/sessions`
- `GET /api/sessions/<id>`
- `POST /api/personalization/apply`
- `GET /api/personalization/preferences`
- `DELETE /api/personalization/preferences`

---

## Next Steps

After authentication is working:
1. **Agent 5**: Connect AI pipeline to sessions
2. **Agent 6**: Implement Google Calendar event creation
3. Test conflict detection with existing calendar events
4. Deploy to production (see [DEPLOYMENT.md](DEPLOYMENT.md))

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API](https://developers.google.com/calendar/api)
