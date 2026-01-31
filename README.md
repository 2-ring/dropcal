# Project Setup

A full-stack application with a TypeScript React frontend (Vite) and a Flask Python backend.

## Project Structure

```
.
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── backend/           # Flask Python API
    ├── app.py
    ├── requirements.txt
    └── venv/
```

## Prerequisites

- Node.js (v18 or higher)
- Python 3.8+
- npm or yarn

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment (if not already created):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## Running the Application

1. Start the backend server first (in one terminal):
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```

2. Start the frontend development server (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

4. Click the "Test Backend Connection" button to verify the frontend can communicate with the backend

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/hello` - Returns a hello message

## Development Notes

- The frontend is configured to proxy API requests to the backend (see [vite.config.ts](frontend/vite.config.ts))
- CORS is enabled on the backend using Flask-CORS
- The backend runs in debug mode for development
