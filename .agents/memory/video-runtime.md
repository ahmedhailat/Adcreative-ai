---
name: Video runtime dependencies
description: Environment-specific constraints affecting FFmpeg-backed video generation
---

Video generation depends on a working FFmpeg executable and a font available to drawtext. Nix store paths are not stable between sessions, so runtime code should resolve FFmpeg from PATH first and only use a configured override or package fallback afterward.

**Why:** A stale hardcoded Nix store path caused the application to fail before any generation request could run, making the UI show only a generic generation failure.

**How to apply:** Keep startup dependency checks explicit and log the selected binary. When diagnosing a failed video, check workflow startup logs before investigating the AI provider.