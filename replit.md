# KingSCADA AI - AI Voice Chatbot for SCADA/Festival

## Overview
This is an AI-powered voice chatbot application for the Siheung Gaetgol Festival, built with Vite + React frontend and Express backend. It uses OpenAI's Realtime API to provide multilingual voice assistance (Korean, English, Japanese, Chinese).

## Recent Changes
**2025-11-14: Backend-Only Deployment Configuration**
- Configured backend-only deployment to Replit (frontend remains on Vercel)
- Added CORS configuration to allow Vercel frontend (https://wellintech.nuguna.ai/) to access Replit backend
- Disabled static file serving in production (backend serves API only)
- Reverted frontend error handling to original implementation
- Deployment configuration: Autoscale with `npm run build` and `npm start`

**2025-11-14: Initial Replit Setup**
- Configured Vite dev server to run on port 5000 with host 0.0.0.0 for Replit compatibility
- Updated package.json dev script to bind to correct host and port
- Set up workflow to run both frontend and backend concurrently
- Added OPENAI_API_KEY to Replit Secrets

## Project Architecture
- **Frontend**: Vite + React + TypeScript (deployed on Vercel at https://wellintech.nuguna.ai/)
- **Backend**: Express + TypeScript (deployed on Replit, runs on port 8080 in dev)
- **API Integration**: OpenAI Realtime API for voice chat
- **Package Manager**: npm

### Key Technical Details
- **Development**: Frontend and backend run concurrently using `concurrently` package
- **Development Proxy**: Vite proxy forwards `/api` requests from localhost:5000 to localhost:8080
- **Production**: 
  - Frontend on Vercel calls Replit backend API directly
  - CORS configured to allow requests from https://wellintech.nuguna.ai/
  - Backend serves API endpoints only (no static files)
- Backend uses dotenv for environment variable management
- Festival information stored in `server/festival-info.json`

## Environment Variables
Required secrets (managed via Replit Secrets):
- `OPENAI_API_KEY`: OpenAI API key for Realtime API access

## Running the Application

### Development
The application runs automatically via the configured workflow:
```bash
npm run dev
```

This starts:
1. Vite dev server on port 5000 (frontend)
2. Express server on port 8080 (backend via tsx)

### Production Build
```bash
npm run build  # Builds frontend
npm start      # Runs backend in production mode
```

## Deployment Notes
- **Development**: Frontend accessible on port 5000 (Replit webview), backend on port 8080
- **Production**: 
  - Frontend deployed on Vercel (https://wellintech.nuguna.ai/)
  - Backend deployed on Replit (API-only, no static files)
  - CORS allows cross-origin requests from Vercel domain
- Backend API endpoints available at `/api/*`

## Testing Voice Feature
The voice assistant can be tested via the "대화" (Chat) tab:
1. Click the microphone button at the bottom
2. Grant microphone permissions when prompted
3. Speak in Korean, English, Japanese, or Chinese
4. The AI will respond with voice and navigate to relevant sections
