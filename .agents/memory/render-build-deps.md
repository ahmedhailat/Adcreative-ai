---
name: Render build dependencies
description: Dependency placement for deployments that install production packages before running the build.
---

Build tooling is not automatically available during deployment. If the deployment environment installs production dependencies before invoking the build command, every package imported by that build path must be declared as a production dependency rather than only a development dependency.

**Why:** A production-only install can fail before application startup with `ERR_MODULE_NOT_FOUND` for build tools, even though local development succeeds.

**How to apply:** When a hosted build runs a TypeScript/Vite build script, verify the full import chain (runner, bundler, Vite plugins, PostCSS/Tailwind plugins) is available under production installation rules.