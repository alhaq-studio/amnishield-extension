# AmniShield Browser Extension - System Architecture

## Overview

The AmniShield Browser Extension is a client-side web content filter and digital wellness companion built on the WXT framework, React 19, TypeScript, and Tailwind CSS. It enforces blocking at both the network request layer (`declarativeNetRequest`) and the DOM layer (content script mutations).

---

## Architectural Layers

### 1. Network Layer (`declarativeNetRequest`)
- Intercepts outbound navigation requests before socket connection.
- Redirects blocked domains and categories directly to the extension's local `blocked.html` mindful pause screen.
- Dynamically assigns deterministic rule IDs based on domain hash maps.

### 2. DOM Mutation Layer (Content Scripts)
- Operates within target web pages to suppress short-form video feeds (YouTube Shorts, Instagram Reels, TikTok).
- Intercepts inline search input elements to catch blocked keywords before submission.
- Uses passive MutationObservers with debounced DOM traversal to ensure zero frame drops and minimal battery impact.

### 3. Policy & Storage Engine (`src/lib/cloudSync.ts`, `src/lib/storage.ts`)
- Manages local rule storage via WXT Storage API (`wxt/storage`).
- Implements `PolicyPayload v2`:
  - `schema_version`: Integer (current: 2)
  - `blocked_domains`: Normalized lowercase FQDN array
  - `blocked_keywords`: Normalized lowercase keyword token array
  - `schedules`: Array of weekly recurring schedule definitions (1=Sunday..7=Saturday)
  - `categories`: Adult, Harmful, Gambling, Social Media toggles
- Synchronization Modes:
  - `MERGE`: Unions local rules with remote cloud rules without deleting custom local entries.
  - `FORCE_REPLACE`: Authoritatively overwrites local configuration with the cloud policy snapshot.
  - Automated pre-sync backup snapshot created before every pull or push operation.

### 4. Zero-Knowledge Privacy Invariant
- **No Remote Telemetry:** The extension contains zero tracking pixels, analytics SDKs, or external logging endpoints.
- **Zero Data Collection:** Declares `data_collection_permissions: { required: ["none"] }` in browser manifest settings.
- **Pure Local Verification:** All rule evaluations and regex matching are conducted entirely in memory on the client device.

---

## Build & Distribution Pipeline

- **Chromium Target (MV3):** `npm run build` -> `.output/chrome-mv3/`
- **Firefox Target (MV2):** `npm run build:firefox` -> `.output/firefox-mv2/`
- **Store Submission Zip:** `npm run build:cws` -> `.output/AmniShield-Browser-Extension-CWS.zip`
- **Quality Gates:** `npm run check` (TypeScript verification via `tsc --noEmit` and unit testing via `tsx`).
