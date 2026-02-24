# DropCal

Turn messy text, images, audio, PDFs, and emails into calendar events. Drop it in, get events out.

**Production:** [dropcal.ai](https://dropcal.ai) | API at api.dropcal.ai

## Stack

Four-package monorepo:

- `backend/` — Flask API, 3-stage AI pipeline (EXTRACT → RESOLVE → PERSONALIZE), Supabase PostgreSQL
- `web/` — React + Vite + TypeScript
- `mobile/` — Expo / React Native
- `shared/` — TypeScript business logic shared between web & mobile

Calendar integrations: Google, Microsoft Outlook, Apple (CalDAV).

## Development

Duckling (temporal parsing service, required):

```
docker-compose up -d duckling
```

Backend (port 5000):

```
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Web (port 5173):

```
cd web
npm install
npm run dev
```

## Deploy

Backend to Elastic Beanstalk:

```
cd backend && eb deploy dropcal-prod
```

Web to S3:

```
cd web && npm run build && aws s3 sync dist/ s3://dropcal-frontend --delete
```

Database migrations:

```
supabase db push
supabase migration new <name>
```

## Tests

```
cd backend && pytest tests/
cd web && npx tsc --noEmit
```
