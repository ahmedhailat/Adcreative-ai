# AdCreative AI Platform

## Overview

AI-powered advertising creative generation platform. Users manage brands, generate professional ad creatives using Gemini AI, browse a creative library, and download ads in various platform formats.

## Internationalization (i18n)

- **Languages**: English + Arabic (العربية)
- **Context**: `client/src/contexts/LangContext.tsx` — `LangProvider` wraps the entire app; exposes `useLang()` hook returning `{ lang, setLang, t, isRTL }`
- **Translations**: Full typed translation object (`t`) covering all pages (nav, dashboard, brands, studio, library, login, common)
- **RTL**: `document.documentElement.dir` is set to `"rtl"` automatically when Arabic is active; `"ltr"` for English
- **Persistence**: Language stored in `localStorage` key `adcreative-lang`
- **Toggle UI**: Language button (Languages icon + "EN"/"ع") in every header — dashboard top-right and login page top-right

## Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Google Gemini (via Replit AI Integrations) — `gemini-2.5-flash` (copy) + `gemini-2.5-flash-image` (image generation)
- **Auth**: Session-based with express-session + connect-pg-simple + bcryptjs
- **State**: TanStack Query v5
- **Routing**: wouter
- **Animations**: framer-motion
- **Icons**: lucide-react + react-icons/si

## Project Structure

```
client/src/
├── pages/
│   ├── Dashboard.tsx       # Main dashboard (stats, quick actions, recent creatives)
│   ├── Login.tsx           # Login + Register (split-panel design)
│   ├── Brands.tsx          # Brand management CRUD
│   ├── Studio.tsx          # 3-step AI creative generation wizard
│   └── Library.tsx         # Creative library with filters
├── components/
│   ├── Layout.tsx          # Sidebar + header with user menu
│   └── ThemeToggle.tsx     # Light/dark mode toggle
├── hooks/
│   ├── use-auth.ts         # Auth state (useQuery /api/auth/me + logout mutation)
│   ├── use-brands.ts       # Brand CRUD hooks
│   ├── use-creatives.ts    # Creative hooks (with polling for generating status)
│   ├── use-dashboard.ts    # Dashboard stats hook
│   └── use-toast.ts        # Toast notifications
└── lib/
    └── queryClient.ts      # TanStack Query client (returnNull on 401)

server/
├── index.ts                # Express app + session middleware setup
├── routes.ts               # All API routes (auth + brands + creatives)
├── storage.ts              # DatabaseStorage class (IStorage interface)
└── db.ts                   # Drizzle DB connection

shared/
├── schema.ts               # DB tables (users, brands, creatives) + types
└── routes.ts               # API route definitions with Zod schemas
```

## Database Schema

- **users**: id, email, password (bcrypt), name, avatarUrl, createdAt
- **brands**: id, name, logoUrl, primaryColor, secondaryColor, fontFamily, industry, website, description, createdAt
- **creatives**: id, brandId, title, platform, formatSize, formatName, productName, productDescription, targetAudience, goal, adCopy (jsonb), imageData (base64), status, performanceScore, isFavorite, createdAt

## Auth Flow

- POST `/api/auth/register` — bcrypt hash, create user, set session
- POST `/api/auth/login` — verify password, set session
- POST `/api/auth/logout` — destroy session
- GET `/api/auth/me` — returns user from session (401 if not authenticated)
- Frontend: `use-auth.ts` → `useQuery(["/api/auth/me"])` with `on401: "returnNull"` — returns null when not logged in
- Protected routes: `useEffect` redirect to `/login` when not authenticated

## AI Generation Flow

1. POST `/api/creatives/generate` — creates creative with `status="generating"`, returns immediately
2. Background async: generateAdCopy (Gemini text) → generateAdImage (Gemini image) → updateCreative to `status="ready"`
3. Frontend polls every 2s via `useCreative(id)` until status is no longer "generating"

## Important CSS Notes

- Uses Tailwind v3 (NOT v4): `@tailwind base/components/utilities` in index.css
- Theme: violet/purple primary (262 83% 58% light, 262 83% 65% dark)
- Dark mode default, uses `next-themes`
- Custom classes: `.glass-card`, `.text-gradient`, `.hover-lift`

## PWA Support

- `client/public/manifest.json` — PWA manifest for iOS/Android install
- Mobile meta tags in `client/index.html` (apple-mobile-web-app-capable, theme-color)
- Can be installed on iOS via Safari "Add to Home Screen"
- Can be installed on Android via Chrome "Add to Home Screen" / Play Store via TWA

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (provided by Replit)
- `SESSION_SECRET` — Session signing secret (set in Replit secrets)
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini API key (via Replit AI integration)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini base URL (via Replit AI integration)
