# AmniShield Browser Extension - Roadmap & Technical Milestones

## Technical Baseline (v0.3.0)

AmniShield Browser Extension delivers private, zero-telemetry web filtering, short-form feed blocking, and cross-device cloud policy synchronization via Manifest V3 and declarativeNetRequest.

---

## Strategic Architectural Principles

- **Zero-Knowledge Privacy:** 100% of URL analysis, keyword matching, and feed detection runs locally on-device. Zero telemetry, browsing histories, or user metrics are transmitted externally.
- **Manifest V3 declarativeNetRequest Engine:** High-performance, low-latency declarative network blocking with dynamic rule registration for blocked domains.
- **Unified PolicyPayload v2 Synchronization:** Seamless bi-directional synchronization with the AmniShield ecosystem (Android, Windows, Web Console) using standardized domain, keyword, and schedule representations.
- **Mindful Pause Over Hard Blocks:** Full-screen mindfulness break screens with breathing exercises and reflection quotes rather than jarring technical error walls.

---

## Milestone Tracker

### Milestone 0.1.0 - Foundation & DeclarativeNetRequest Engine [COMPLETED]
- [x] Initial Manifest V3 architecture with background service worker and content script injection.
- [x] High-speed URL matching and domain normalization engine.
- [x] Dynamic declarativeNetRequest rule registration for blocked hostnames.
- [x] Full-screen mindful breathing pause overlay for blocked destinations.

### Milestone 0.2.0 - Short-Form Feed & Keyword Suppression [COMPLETED]
- [x] DOM mutation observers for YouTube Shorts, Instagram Reels, and TikTok feeds.
- [x] Regex-based keyword query interception in leading search engines.
- [x] Options and popup management interface built with React and Tailwind CSS.
- [x] Dual-browser support: Chromium (Chrome, Brave, Edge MV3) and Firefox (AMO MV2).

### Milestone 0.3.0 - Cloud Policy Sync & PolicyPayload v2 Alignment [COMPLETED - CURRENT]
- [x] **PolicyPayload v2 Integration:** Structured payload support separating `blocked_domains`, `blocked_keywords`, and multi-blocker schedule matrices.
- [x] **Pre-Sync Snapshot & Recovery:** Automated snapshot backups prior to applying cloud policies to guarantee non-destructive sync rollback.
- [x] **Dual Conflict Resolution Strategies:** Support for both non-destructive `MERGE` and authoritative `FORCE_REPLACE` policy application modes.
- [x] **Data Collection Privacy Compliance:** Explicit Firefox `data_collection_permissions: { required: ["none"] }` configuration verifying strict zero telemetry.
- [x] **Automated CWS Packaging:** Standardized store zip distribution script generating `AmniShield-Browser-Extension-CWS.zip`.

### Milestone 0.4.0 - Ephemeral Pairing & Ecosystem Realtime [UPCOMING]
- [ ] Ephemeral 6-digit PIN and QR code pairing directly from extension options page to Web Console.
- [ ] Supabase Realtime WebSocket client for instantaneous cross-device policy propagation.
- [ ] Schedule time-window countdown timers within the popup badge.
