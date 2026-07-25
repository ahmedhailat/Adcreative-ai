---
name: Avatar Studio AI providers
description: How D-ID and Replicate are wired into Avatar Studio job creation and polling
---

# Avatar Studio — AI Provider Architecture

## Rule
D-ID Clips API is the **primary** provider when `DID_API_KEY` is set. Replicate LivePortrait is the **fallback** when only `REPLICATE_API_TOKEN` is present. The choice is made once at job-creation time.

**Why:** D-ID is a dedicated talking-avatar service with higher reliability; Replicate is a general model-hosting platform used as backup.

## How to apply
- `server/didClient.ts` — all D-ID API helpers (uploadImageToDID, uploadDriverToDID, createDIDClip, getDIDClip). Auth = `Basic base64("apikey:")`.
- `server/replicateClient.ts` — Replicate SDK init + `LIVE_PORTRAIT_VERSION` hash.
- `avatar_jobs` table has columns: `replicate_prediction_id TEXT` (stores the clip/prediction ID for either provider), `provider TEXT DEFAULT 'did'`.
- `POST /api/avatar/create-job` background task: checks `DID_CONFIGURED`, branches accordingly, uploads files as Buffers/Blobs, stores prediction ID + provider in DB.
- `GET /api/avatar/job/:id` polling: reads `job.provider`, calls `getDIDClip()` or `replicate.predictions.get()`, normalises to `done`/`failed`, deducts 1 credit on success.

## D-ID Clips flow
1. `POST /images` (multipart) → public D-ID image URL
2. `POST /clips/drivers` (multipart) → public D-ID driver URL
3. `POST /clips` (JSON: source_url + driver_url) → clip ID
4. `GET /clips/{id}` → status: `created | started | done | error`, `result_url`

## Replicate LivePortrait flow
- Version hash: `067dd98cc3e5cb396c4a9efb4bba3eec6c4a9d271211325c477518fc6485e146`
- Input: `face_image` + `driving_video` as Blobs (SDK auto-uploads)
- Poll: `replicate.predictions.get(id)` → status: `starting | processing | succeeded | failed | canceled`
