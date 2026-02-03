# DropCal: Render + Supabase Integration Plan

## Architecture Overview

```
Frontend (React) → Render (Flask API) → Supabase (PostgreSQL + Storage)
                                    ↓
                              Google Calendar API
```

---

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose organization, name it `dropcal`
4. Set a strong database password (save it!)
5. Select region closest to your Render deployment (US East for most)
6. Wait ~2 minutes for provisioning

### 1.2 Database Schema

Go to **SQL Editor** in Supabase dashboard and run this:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Accounts table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  display_name VARCHAR(255),
  photo_url TEXT,

  -- Google Calendar API tokens (will be encrypted in app)
  google_access_token TEXT,
  google_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- User preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "defaultCalendarId": null,
    "timezone": "America/New_York",
    "autoAddEvents": false,
    "conflictBehavior": "warn"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Input data
  input_type VARCHAR(50) NOT NULL CHECK (input_type IN ('text', 'image', 'audio', 'email')),
  input_content TEXT NOT NULL, -- Original text or file path

  -- Processing results (JSONB for flexibility)
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  extracted_events JSONB DEFAULT '[]'::jsonb,
  processed_events JSONB DEFAULT '[]'::jsonb,
  conflicts JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  added_to_calendar BOOLEAN DEFAULT FALSE,
  calendar_event_ids TEXT[], -- Array of Google Calendar event IDs
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Storage Setup

1. Go to **Storage** in Supabase dashboard
2. Click "Create bucket"
3. Name it `uploads`
4. Set as **Private** (we'll control access via backend)
5. Go to bucket policies → Add this policy:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');
```

**Note:** For now, we'll use the service role key in Flask to bypass RLS (Row Level Security). We'll add proper auth later.

### 1.4 Get Supabase Credentials

Go to **Settings → API** and copy:
- `Project URL` (e.g., `https://abcdefgh.supabase.co`)
- `Project API Key` → `service_role` key (keep this secret!)
- `Database Password` (from step 1.1)

---

## Phase 2: Render Setup

### 2.1 Prepare Flask App for Deployment

Create `requirements.txt` in `/backend`:

```txt
Flask==3.0.0
Flask-CORS==4.0.0
supabase==2.3.0
python-dotenv==1.0.0
gunicorn==21.2.0
langchain==0.1.0
langchain-anthropic==0.1.0
anthropic==0.18.0
google-auth==2.27.0
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.115.0
Pillow==10.2.0
```

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: dropcal-backend
    env: python
    region: oregon
    buildCommand: "pip install -r backend/requirements.txt"
    startCommand: "gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
```

### 2.2 Deploy to Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render auto-detects Python
5. Settings:
   - **Name:** `dropcal-backend`
   - **Region:** Oregon (or closest to Supabase)
   - **Branch:** `main`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`
6. Add Environment Variables:
   ```
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_KEY=<your-service-role-key>
   ANTHROPIC_API_KEY=<your-anthropic-key>
   FLASK_ENV=production
   ```
7. Click "Create Web Service"
8. Wait for deployment (~3-5 minutes)

---

## Phase 3: Flask Integration

### 3.1 Create Supabase Client

Create `backend/database/supabase_client.py`:

```python
import os
from supabase import create_client, Client
from typing import Optional

class SupabaseClient:
    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client singleton."""
        if cls._instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")

            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")

            cls._instance = create_client(url, key)

        return cls._instance

# Convenience function
def get_supabase() -> Client:
    return SupabaseClient.get_client()
```

### 3.2 Database Models and Operations

Create `backend/database/models.py`:

```python
from datetime import datetime
from typing import Optional, List, Dict, Any
from supabase_client import get_supabase
from uuid import UUID

class User:
    """User model for database operations."""

    @staticmethod
    def create(email: str, google_id: Optional[str] = None,
               display_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new user."""
        supabase = get_supabase()

        data = {
            "email": email,
            "google_id": google_id,
            "display_name": display_name
        }

        response = supabase.table("users").insert(data).execute()
        return response.data[0]

    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        supabase = get_supabase()
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        supabase = get_supabase()
        response = supabase.table("users").select("*").eq("email", email).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def update_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update user preferences."""
        supabase = get_supabase()
        response = supabase.table("users").update({
            "preferences": preferences
        }).eq("id", user_id).execute()
        return response.data[0]


class Session:
    """Session model for database operations."""

    @staticmethod
    def create(user_id: str, input_type: str, input_content: str) -> Dict[str, Any]:
        """Create a new session."""
        supabase = get_supabase()

        data = {
            "user_id": user_id,
            "input_type": input_type,
            "input_content": input_content,
            "status": "pending"
        }

        response = supabase.table("sessions").insert(data).execute()
        return response.data[0]

    @staticmethod
    def get_by_id(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID."""
        supabase = get_supabase()
        response = supabase.table("sessions").select("*").eq("id", session_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def get_by_user(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions for a user."""
        supabase = get_supabase()
        response = supabase.table("sessions").select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit).execute()
        return response.data

    @staticmethod
    def update_status(session_id: str, status: str,
                     error_message: Optional[str] = None) -> Dict[str, Any]:
        """Update session status."""
        supabase = get_supabase()

        data = {"status": status}
        if error_message:
            data["error_message"] = error_message

        response = supabase.table("sessions").update(data).eq("id", session_id).execute()
        return response.data[0]

    @staticmethod
    def update_events(session_id: str,
                     extracted_events: Optional[List[Dict]] = None,
                     processed_events: Optional[List[Dict]] = None,
                     conflicts: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Update session with processed events."""
        supabase = get_supabase()

        data = {}
        if extracted_events is not None:
            data["extracted_events"] = extracted_events
        if processed_events is not None:
            data["processed_events"] = processed_events
        if conflicts is not None:
            data["conflicts"] = conflicts

        response = supabase.table("sessions").update(data).eq("id", session_id).execute()
        return response.data[0]

    @staticmethod
    def mark_added_to_calendar(session_id: str,
                              calendar_event_ids: List[str]) -> Dict[str, Any]:
        """Mark session events as added to calendar."""
        supabase = get_supabase()

        response = supabase.table("sessions").update({
            "added_to_calendar": True,
            "calendar_event_ids": calendar_event_ids,
            "status": "processed"
        }).eq("id", session_id).execute()
        return response.data[0]
```

### 3.3 Storage Operations

Create `backend/storage/file_handler.py`:

```python
import os
from typing import Optional, BinaryIO
from supabase_client import get_supabase
import mimetypes
from uuid import uuid4

class FileStorage:
    """Handle file uploads to Supabase Storage."""

    BUCKET_NAME = "uploads"
    ALLOWED_TYPES = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg'],
        'document': ['application/pdf', 'text/plain']
    }

    @staticmethod
    def upload_file(file: BinaryIO, filename: str,
                   user_id: str, file_type: str) -> str:
        """
        Upload file to Supabase Storage.

        Returns the public URL or storage path.
        """
        supabase = get_supabase()

        # Generate unique filename
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{user_id}/{uuid4()}{ext}"

        # Upload to Supabase Storage
        response = supabase.storage.from_(FileStorage.BUCKET_NAME)\
            .upload(unique_filename, file)

        # Return the path (we'll construct URLs in the app)
        return unique_filename

    @staticmethod
    def get_file_url(file_path: str, expires_in: int = 3600) -> str:
        """
        Get a signed URL for a file (valid for 1 hour by default).
        """
        supabase = get_supabase()

        response = supabase.storage.from_(FileStorage.BUCKET_NAME)\
            .create_signed_url(file_path, expires_in)

        return response['signedURL']

    @staticmethod
    def download_file(file_path: str) -> bytes:
        """Download file from storage."""
        supabase = get_supabase()

        response = supabase.storage.from_(FileStorage.BUCKET_NAME)\
            .download(file_path)

        return response

    @staticmethod
    def delete_file(file_path: str) -> bool:
        """Delete file from storage."""
        supabase = get_supabase()

        try:
            supabase.storage.from_(FileStorage.BUCKET_NAME).remove([file_path])
            return True
        except Exception:
            return False

    @staticmethod
    def validate_file_type(mimetype: str, expected_type: str) -> bool:
        """Validate if file type is allowed."""
        allowed = FileStorage.ALLOWED_TYPES.get(expected_type, [])
        return mimetype in allowed
```

### 3.4 Update Flask App

Update `backend/app.py`:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

from database.models import User, Session
from storage.file_handler import FileStorage

load_dotenv()

app = Flask(__name__)
CORS(app)

# Test route
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "dropcal-backend"})

# Create session (text input)
@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new session with text input."""
    data = request.json

    # TODO: Get user_id from auth token (for now, use placeholder)
    user_id = data.get('user_id', 'temp-user-id')
    input_text = data.get('text')

    if not input_text:
        return jsonify({"error": "No text provided"}), 400

    # Create session in database
    session = Session.create(
        user_id=user_id,
        input_type='text',
        input_content=input_text
    )

    # TODO: Trigger AI processing pipeline

    return jsonify(session), 201

# Upload file
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload an image or audio file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    file_type = request.form.get('type', 'image')  # 'image' or 'audio'

    # TODO: Get user_id from auth token
    user_id = request.form.get('user_id', 'temp-user-id')

    # Validate file type
    if not FileStorage.validate_file_type(file.content_type, file_type):
        return jsonify({"error": "Invalid file type"}), 400

    # Upload to Supabase Storage
    file_path = FileStorage.upload_file(file, file.filename, user_id, file_type)

    # Create session in database
    session = Session.create(
        user_id=user_id,
        input_type=file_type,
        input_content=file_path
    )

    # TODO: Trigger AI processing pipeline

    return jsonify({
        "session_id": session['id'],
        "file_path": file_path
    }), 201

# Get session by ID
@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get a session by ID."""
    session = Session.get_by_id(session_id)

    if not session:
        return jsonify({"error": "Session not found"}), 404

    return jsonify(session)

# Get all sessions for user
@app.route('/api/sessions', methods=['GET'])
def get_user_sessions():
    """Get all sessions for a user."""
    # TODO: Get user_id from auth token
    user_id = request.args.get('user_id', 'temp-user-id')

    sessions = Session.get_by_user(user_id)
    return jsonify(sessions)

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Phase 4: Environment Setup

### 4.1 Local Development

Create `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
FLASK_ENV=development
```

Add to `.gitignore`:
```
backend/.env
.env
*.pyc
__pycache__/
```

### 4.2 Test Locally

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Test endpoints:
```bash
# Health check
curl http://localhost:5000/health

# Create text session
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "text": "Meeting with John tomorrow at 2pm"}'

# Upload file
curl -X POST http://localhost:5000/api/upload \
  -F "file=@test.png" \
  -F "type=image" \
  -F "user_id=test-user"
```

---

## Phase 5: Auth Integration (For Later)

When you're ready to add auth, here's the plan:

### 5.1 Enable Google OAuth in Supabase

1. Go to **Authentication → Providers** in Supabase
2. Enable **Google**
3. Add Google OAuth credentials from Google Cloud Console
4. Set redirect URL: `https://your-app.supabase.co/auth/v1/callback`

### 5.2 Frontend Auth Flow

```typescript
// frontend/src/auth/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY! // Use anon key in frontend
)

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar'
    }
  })
  return { data, error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signOut() {
  await supabase.auth.signOut()
}
```

### 5.3 Backend Auth Middleware

```python
# backend/auth/middleware.py
from functools import wraps
from flask import request, jsonify
from supabase_client import get_supabase

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No authorization token"}), 401

        token = auth_header.split(' ')[1]

        # Verify token with Supabase
        supabase = get_supabase()
        try:
            user = supabase.auth.get_user(token)
            request.user_id = user.id
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated_function

# Usage:
# @app.route('/api/sessions', methods=['POST'])
# @require_auth
# def create_session():
#     user_id = request.user_id  # Set by middleware
#     ...
```

---

## Testing Checklist

- [ ] Supabase project created and tables exist
- [ ] Storage bucket created and accessible
- [ ] Flask app runs locally
- [ ] Can create text sessions
- [ ] Can upload files
- [ ] Can retrieve sessions
- [ ] Render deployment successful
- [ ] Environment variables set in Render
- [ ] Production endpoints work

---

## Next Steps After Integration

1. **Connect AI Pipeline**: Wire up LangChain processors to session creation
2. **Add Google Calendar Integration**: Use tokens from users table
3. **Implement Auth**: Follow Phase 5 when ready
4. **Add Frontend API calls**: Update React app to use new endpoints

---

**Stack Summary:**
- **Frontend:** React (existing)
- **Backend Hosting:** Render
- **Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage
- **Auth:** Supabase Auth (to be added later)
- **AI:** LangChain + Claude Sonnet 4
- **Calendar:** Google Calendar API
