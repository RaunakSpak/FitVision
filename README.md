# FitVision AI

**Train smarter with real-time AI form correction.**

FitVision AI is a full-stack browser fitness platform that combines live pose detection, voice coaching, workout history, progress analytics, video analysis, and experimental ML assist — without expensive hardware or paid vision APIs.

> **Disclaimer:** FitVision AI provides general fitness feedback and is not a medical or professional coaching substitute.

## Screenshots

<!-- Add screenshots here after deployment -->
| Landing | Live Trainer | Dashboard |
|---------|--------------|-----------|
| _screenshot_ | _screenshot_ | _screenshot_ |

## Features

- **Live AI Trainer** — Webcam pose detection, rep counting, form feedback, voice coach
- **Gym AI Mode** — Auto-detect exercises and suggest what to train next
- **Video Analysis** — Upload MP4/MOV/WebM for local frame-by-frame analysis
- **Progress Dashboard** — Charts, streaks, insights, mistake trends
- **Workout History** — Cloud-synced sessions with JWT httpOnly cookie auth
- **ML Lab** — Experimental hybrid classifier + dataset export for future TF.js models
- **9+ Exercises** — Push-up, squat, plank, curls, lunges, presses, and more

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts, MediaPipe |
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL (Supabase) |
| Auth | JWT in httpOnly cookies (bcrypt password hashing) |
| ML (MVP) | Heuristic classifier + feature extraction pipeline |

## Architecture

```
Browser (Next.js)
├── MediaPipe Pose Landmarker (client-side)
├── Exercise analyzers + voice coach
├── Video analysis (local, no upload)
└── API proxy /api/* → FastAPI backend

FastAPI Backend
├── Auth (register/login/logout/me)
├── Workout CRUD + analytics
└── PostgreSQL (Supabase)

ML Pipeline (client)
├── featureExtractor.ts → 20-dim pose vectors
├── formClassifier.ts → pluggable classifier interface
└── hybridAnalyzer.ts → rule-based + ML assist
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (Supabase recommended)
- Webcam (for live trainer)

### Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env — DATABASE_URL, JWT_SECRET_KEY, FRONTEND_URL
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

> **Note:** Port 8001 is used if 8000 is occupied. Update `NEXT_PUBLIC_API_URL` in `.env.local` to match.

### Database Migrations

```bash
cd backend
alembic upgrade head          # Apply migrations
alembic revision --autogenerate -m "description"  # New migration
alembic downgrade -1          # Rollback one step
```

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL for Next.js API rewrites |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler recommended on Windows) |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens |
| `FRONTEND_URL` | CORS origin(s), comma-separated for multiple |
| `COOKIE_SECURE` | `true` in production (HTTPS) |
| `COOKIE_SAMESITE` | `lax` recommended |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in (sets cookie) |
| POST | `/api/auth/logout` | No | Sign out |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/workouts` | Yes | Save workout |
| GET | `/api/workouts` | Yes | List workouts |
| GET | `/api/workouts/analytics` | Yes | Progress analytics |
| GET | `/api/workouts/{id}` | Yes | Get workout |
| DELETE | `/api/workouts/{id}` | Yes | Delete workout |

## Deployment

### Frontend (Vercel recommended)

1. Push repo to GitHub
2. Import project in Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

### Backend (Railway, Render, Fly.io, etc.)

1. Set all variables from `backend/.env.example`
2. Set `FRONTEND_URL=https://your-frontend.vercel.app`
3. Set `COOKIE_SECURE=true` for HTTPS
4. Run migrations: `alembic upgrade head`
5. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Production CORS

Backend `FRONTEND_URL` must exactly match your deployed frontend origin. For multiple environments:

```
FRONTEND_URL=https://fitvision.vercel.app,https://staging-fitvision.vercel.app
```

### Supabase

- Use **session pooler** URI on Windows if direct connection is IPv6-only
- Run migrations against direct connection when possible
- Never commit `backend/.env` with real credentials

## Project Structure

```
/app                    Next.js app router
/components             UI components
/hooks                  Auth, ML assist, analytics hooks
/lib                    Pose utils, analyzers, ML pipeline, API client
/backend                FastAPI + Alembic
/types                  Shared TypeScript types
```

## Roadmap

- [ ] TensorFlow.js trained classifier from exported datasets
- [ ] Social sharing / workout plans
- [ ] Mobile PWA install prompt
- [ ] Multi-language voice coach
- [ ] Coach dashboard for trainers

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

FitVision AI provides general fitness feedback and is not a medical or professional coaching substitute. Always consult a qualified professional before starting a new exercise program.
