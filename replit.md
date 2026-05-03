# AdCreative AI Platform

## Overview

AI-powered advertising creative generation platform. Users manage brands, generate professional ad creatives using Gemini AI, browse a creative library, and download ads in various platform formats. Includes video upload support and a pricing page UI (Stripe not yet wired in).

## Internationalization (i18n)

- **Languages**: English + Arabic (العربية)
- **Context**: `client/src/contexts/LangContext.tsx` — `LangProvider` wraps the entire app; exposes `useLang()` hook returning `{ lang, setLang, t, isRTL }`
- **Translations**: Full typed translation object (`t`) covering all pages (nav, dashboard, brands, studio, library, login, pricing, common)
- **RTL**: `document.documentElement.dir` is set to `"rtl"` automatically when Arabic is active; `"ltr"` for English
- **Persistence**: Language stored in `localStorage` key `adcreative-lang`
- **Toggle UI**: Language button (Languages icon + "EN"/"ع") in every header

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
- **File Upload**: multer (for video uploads)

## Project Structure

```
client/src/
├── pages/
│   ├── Dashboard.tsx       # Main dashboard (stats, quick actions, recent creatives)
│   ├── Login.tsx           # Login + Register (split-panel design)
│   ├── Brands.tsx          # Brand management CRUD
│   ├── Studio.tsx          # 3-step wizard: brand/format/media-type → product details → result
│   ├── Library.tsx         # Creative library with filters (type, brand, platform)
│   └── Pricing.tsx         # Pricing page (Free/Pro/Business plans, FAQ, yearly toggle — UI only)
├── components/
│   ├── Layout.tsx          # Sidebar + header with user menu, plan badge, upgrade banner
│   └── ThemeToggle.tsx     # Light/dark mode toggle
├── hooks/
│   ├── use-auth.ts         # Auth state (useQuery /api/auth/me + logout mutation)
│   ├── use-brands.ts       # Brand CRUD hooks
│   ├── use-creatives.ts    # Creative hooks (generate, uploadVideo, poll, delete, favorite)
│   ├── use-dashboard.ts    # Dashboard stats hook
│   └── use-toast.ts        # Toast notifications
└── lib/
    └── queryClient.ts      # TanStack Query client (returnNull on 401)

server/
├── index.ts                # Express app + session middleware setup
├── routes.ts               # All API routes (auth + brands + creatives + video upload)
├── storage.ts              # DatabaseStorage class (IStorage interface)
└── db.ts                   # Drizzle DB connection

shared/
├── schema.ts               # DB tables (users, brands, creatives) + types
└── routes.ts               # API route definitions with Zod schemas
```

## Database Schema

- **users**: id, email, password (bcrypt), name, avatarUrl, plan (free/pro/business), stripeCustomerId, stripeSubscriptionId, createdAt
- **brands**: id, name, logoUrl, primaryColor, secondaryColor, fontFamily, industry, website, description, createdAt
- **creatives**: id, brandId, title, platform, formatSize, formatName, productName, productDescription, targetAudience, goal, adCopy (jsonb), imageData (base64), videoUrl (base64 data URL), mediaType (image/video), status, performanceScore, isFavorite, createdAt

> **Note**: DB columns added via raw SQL (not drizzle push) to avoid dropping the sessions table.

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
4. AI video mode: same flow but stores result as `mediaType="video"` (uses image gen as placeholder)

## Video Upload Flow

1. User selects video file (drag-drop or file picker) in Studio — limited to Pro/Business plan users
2. Frontend sends FormData to POST `/api/creatives/upload-video` via `useUploadVideo` hook (multer)
3. Server reads file → converts to base64 data URL → stores in `creatives.video_url`
4. Creative is immediately marked `status="ready"`
5. Library shows video player card with play/pause controls

## Pricing Page

- `/pricing` route — 3 plan cards: Free / Pro ($29/mo or $24/mo annual) / Business ($79/mo or $65/mo annual)
- Monthly/yearly toggle, savings badges, feature lists with checkmarks
- Plan detection: reads `user.plan` field from DB
- Current plan highlighted; CTA changes to "Current Plan" if matched
- FAQ accordion section
- **Stripe NOT connected** — upgrade buttons are UI-only placeholders
- `server/stripeClient.ts` and `server/webhookHandlers.ts` exist but are NOT imported/wired to server

## Important CSS Notes

- Uses Tailwind v3 (NOT v4): `@tailwind base/components/utilities` in index.css
- Theme: violet/purple primary (262 83% 58% light, 262 83% 65% dark)
- Dark mode default, uses `next-themes`
- Custom classes: `.glass-card`, `.text-gradient`, `.hover-lift`

## PWA Support

- `client/public/manifest.json` — PWA manifest for iOS/Android install
- Mobile meta tags in `client/index.html` (apple-mobile-web-app-capable, theme-color)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (provided by Replit)
- `SESSION_SECRET` — Session signing secret (set in Replit secrets)
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini API key (via Replit AI integration)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini base URL (via Replit AI integration)
