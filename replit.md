# KingSCADA AI - AI Voice Chatbot for SCADA/Festival

## Overview
This is an AI-powered voice chatbot application for the Siheung Gaetgol Festival, built with Vite + React frontend and Express backend. It uses OpenAI's Realtime API to provide multilingual voice assistance (Korean, English, Japanese, Chinese).

## Recent Changes
**2025-11-14: Migrated from Vercel to Replit**
- Configured Vite dev server to run on port 5000 with host 0.0.0.0 for Replit compatibility
- Updated package.json dev script to bind to correct host and port
- Set up workflow to run both frontend and backend concurrently
- Added OPENAI_API_KEY to Replit Secrets

## Project Architecture
- **Frontend**: Vite + React + TypeScript (runs on port 5000)
- **Backend**: Express + TypeScript (runs on port 8080)
- **API Integration**: OpenAI Realtime API for voice chat
- **Package Manager**: npm

### Key Technical Details
- Frontend and backend run concurrently using the `concurrently` package
- Vite proxy forwards `/api` requests from frontend (port 5000) to backend (port 8080)
- Backend uses dotenv for environment variable management
- Festival information stored in `server/festival-info.json`

## Environment Variables
Required secrets (managed via Replit Secrets):
- `OPENAI_API_KEY`: OpenAI API key for Realtime API access

## Running the Application
The application runs automatically via the configured workflow:
```bash
npm run dev
```

This starts:
1. Vite dev server on port 5000 (frontend)
2. Express server on port 8080 (backend via tsx)

## Deployment Notes
- Frontend is accessible on port 5000 (Replit webview)
- Backend API endpoints are available at `/api/*`
- CORS is properly configured for cross-origin requests
