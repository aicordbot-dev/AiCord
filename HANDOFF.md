# 📋 AiCord — Master Project Handoff Document

> **Last Updated:** November 5, 2026  
> **Repository:** [`https://github.com/aicordbot-dev/AiCord.git`](https://github.com/aicordbot-dev/AiCord.git)  
> **Status:** Production-Ready Core Architecture • Phase 1 (P1) & Phase 22 (P22) Complete • 73/73 Engine Tests Passing  
> **Active Target:** Phase 14 (P14) — Central Command Registry & Dynamic Autocomplete

---

## 1. Executive Summary & Project Identity

### What is AiCord?
**AiCord** (formerly *Discord Architect*) is an autonomous, AI-driven Discord server management platform and community operating system. It translates natural-language community concepts (e.g. *"Build an esports tournament hub for Valorant with rank verification, ticket support, and caster voice channels"*) into production-grade Discord channel topologies, role hierarchies, and granular permission overrides in under 15 seconds.

### Core Architectural Philosophy: 100% Free-Tier Operation
AiCord is engineered to operate continuously with **zero hosting or infrastructure cost**:
* **Runtime / Hosting:** Vercel Hobby Free Tier (Serverless Next.js App Router + edge-compatible handlers).
* **Database:** MongoDB Atlas M0 Free Cluster (512MB storage, capped connections, pooling enabled).
* **AI Intelligence:** Google Gemini Free Tier via official `@ai-sdk/google` (3 RPM / 15 RPM models with tiered fallback).
* **Interactions Model:** Pure Discord HTTP Interactions (Ed25519 verified), completely eliminating the need for expensive 24/7 WebSocket gateway container dynos.
* **Cron & Background Processing:** Vercel Cron (`CRON_SECRET` authenticated) triggering atomic job workers.

---

## 2. Repository & Account Information

| Parameter | Configuration |
|---|---|
| **GitHub User** | `aicordbot-dev` |
| **GitHub Email** | `aicordbot@gmail.com` |
| **Primary Remote URL** | `https://github.com/aicordbot-dev/AiCord.git` |
| **Active Branches** | `main` (primary default branch), `master` |
| **Secondary Remote** | `techmabdullah` (`https://github.com/TechMabdullah/AiCord.git`) |
| **Package Manager** | `pnpm` (v12.x / v10.x compatible) |
| **Framework** | Next.js 16 (Turbopack, App Router, React 19, TypeScript Strict 5.x) |

---

## 3. Current Implementation Status

### ✅ Phase 1 (P1): Core Setup & `/build` Architect (Complete)
* **Discord Interactions Endpoint:** Located at `src/app/api/discord/interactions/route.ts`. Handles Discord PING/PONG and verifies Ed25519 signatures cryptographically using `discord-interactions`.
* **MongoDB Integration:** Connection pooling and Mongoose caching in `src/lib/db.ts` resilient to serverless cold starts.
* **AI Blueprint Generator:** `src/lib/ai/generate-blueprint.ts` converts user prompts into structured Discord server blueprints with Zod schema validation (`src/lib/ai/blueprint.schema.ts`).
  * **Fallback Chain:** Seamless model degradation to avoid rate limit or availability crashes:
    1. `gemini-3.5-flash-lite` (Ultra-fast primary)
    2. `gemini-2.5-flash` (Resilient secondary)
    3. `gemini-flash-lite-latest` (Stable fallback)
* **Visual Blueprint Preview:** `src/lib/discord/blueprint-preview.ts` builds formatted visual tree embed previews of categories, channels, and roles with pagination support.
* **Atomic Apply Engine:** `src/lib/discord/build-applier.ts` systematically provisions categories, text/voice channels, permission overrides, and role hierarchies with rate-limit dampening.
* **Rollback Engine (`/undo-build`):** Tracks created resource IDs in `BuildJob` records and allows 1-click full rollback restoration.

---

### ✅ Phase 22 (P22): The 8 Core Shared Engines (Complete & Tested)
All 8 shared engines are fully implemented in `src/lib/engines/` and backed by **73 passing unit tests** in `test/engines/`:

```
test/engines/
├── audit-logger.test.ts      (7 tests)  — Deep diffs, array/date changes, AuditLog model schema
├── cache.test.ts             (7 tests)  — In-memory LRU, TTL expiration, cached() wrapper, guild TTL
├── job-queue.test.ts        (10 tests)  — Atomic claiming, exponential backoff + jitter, dead-lettering
├── pagination.test.ts        (10 tests) — Code-block aware splitting, embed paging, ActionRow buttons
├── permission-engine.test.ts(10 tests)  — Role hierarchy math, owner immunity, bot permission bits
├── rate-limiter.test.ts      (4 tests)  — Sliding window quotas, user/guild scopes, reset mechanisms
├── template-engine.test.ts  (11 tests)  — Tokenizer, variable replacement, conditionals, length safety
└── time-engine.test.ts      (14 tests)  — UTC normalization, IANA timezones, duration parse/format
────────────────────────────────────────────────────────────────────────────────────────────
Total: 73 passed, 0 failed, 25 test suites
```

#### Engine Breakdown:
1. **Template Engine (`src/lib/engines/template-engine.ts`)**:
   * Tokenizer & safe string interpolator without `eval`.
   * Variables: `{user}`, `{server}`, `{channel}`, `{stats}`, `{random:a|b|c}`, and `{if condition}...{else}...{endif}` logic.
   * Built-in length capping to prevent Discord 2000-char message or embed overflows.
2. **Time Engine (`src/lib/engines/time-engine.ts`)**:
   * Uses `date-fns` and `date-fns-tz` for daylight-saving-safe calculations.
   * Normalizes timestamps to UTC ISO strings.
   * Full IANA timezone resolution (User preference > Guild default > UTC).
   * Human-readable duration parser (`2h 30m`, `1d`) and formatter.
   * Native Discord markdown timestamp syntax generator (`<t:TIMESTAMP:F>`).
3. **Permission Engine (`src/lib/engines/permission-engine.ts`)**:
   * Bitwise permission calculations against Discord `PermissionFlagsBits`.
   * Enforces role hierarchy rules (`canActOn` hierarchy check): higher role required over target.
   * Hard server owner immunity and absolute owner action bypass.
   * Validates bot's own permission ceiling before issuing API calls to prevent Discord 403 Forbidden errors.
4. **Job Queue Engine (`src/lib/engines/job-queue.ts` & `src/models/Job.ts`)**:
   * Atomic `findOneAndUpdate` job claiming preventing serverless race conditions.
   * Configurable exponential backoff with randomized jitter.
   * Dead-letter queue transition after `maxAttempts` (default 5).
   * Scheduled cron worker route at `/api/cron/jobs` protected by `CRON_SECRET`.
5. **Rate Limiter Engine (`src/lib/engines/rate-limiter.ts`)**:
   * Sliding window algorithm supporting user-level, guild-level, and IP-level keys.
   * Hybrid storage: Upstash Redis REST when configured; zero-dependency in-memory LRU fallback.
6. **Cache Layer (`src/lib/engines/cache.ts`)**:
   * Two-tiered caching (In-Memory LRU + Redis support).
   * `cached(key, ttl, fetcher)` wrapper to memoize expensive database reads.
   * Automated 60-second TTL for `GuildConfig` documents.
7. **Config Audit Logger (`src/lib/engines/audit-logger.ts` & `src/models/AuditLog.ts`)**:
   * Deep object diffing generating dot-notation change paths (`roles.admin.color: "#fff" -> "#000"`).
   * Non-blocking async recording to MongoDB `AuditLog` collection.
8. **Pagination Splitter Engine (`src/lib/engines/pagination.ts`)**:
   * Message splitter respecting 2000-character limits while preserving fenced markdown code blocks across splits (` ```ts ` re-opened cleanly).
   * Embed field pagination (up to 25 fields per embed limit).
   * Standardized 5-button interactive pagination ActionRow (`⏮ First`, `◀ Prev`, `Page X/Y`, `Next ▶`, `Last ⏭`).

---

### ✅ Animated Showcase README (Complete)
* Modern dynamic SVG typing banner (`readme-typing-svg`).
* Feature grid, real-time terminal simulation previews, technical architecture flowchart, and interactive CLI tables.

---

### 🎯 Immediate Next Step: Phase 14 (P14) — Central Command Registry & Autocomplete
The next phase to implement is **P14 (Central Command Registry & Autocomplete)**:
* Standardize all slash command definitions into a unified registry interface.
* Implement centralized autocomplete router for channel, role, template, and tag arguments.
* Guild-level permissions override mapping based on `GuildConfig`.
* Smooth registration pipeline via Discord REST API v10 with ratelimit backoff.

---

## 4. Key Commands & Development Scripts

Run all commands from `c:\DiscroAI\discord-architect`:

```bash
# Install dependencies
pnpm install

# Start local Next.js development server with Turbopack
pnpm dev

# Execute the 73-test engine test suite
pnpm test

# Run strict TypeScript compilation check (0 errors expected)
pnpm typecheck

# Run Next.js and ESLint code quality checks
pnpm lint

# Test production Next.js build
pnpm build

# Register Slash Commands with Discord Guild for testing
pnpm register-commands
```

---

## 5. Environment Variables & Secret Configuration

Create a `.env.local` file inside `c:\DiscroAI\discord-architect` (never committed to git):

```bash
# -----------------------------------------------------------------------------
# REQUIRED: Discord Application Credentials
# (From Discord Developer Portal -> Applications -> Your App)
# -----------------------------------------------------------------------------
DISCORD_APP_ID=your_discord_app_id
DISCORD_PUBLIC_KEY=your_discord_public_key_for_ed25519_verification
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# -----------------------------------------------------------------------------
# REQUIRED: MongoDB Database
# (Free MongoDB Atlas M0 cluster connection URI)
# -----------------------------------------------------------------------------
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aicord?retryWrites=true&w=majority

# -----------------------------------------------------------------------------
# REQUIRED: AI Provider (Google Gemini Free Tier)
# (From Google AI Studio: https://aistudio.google.com/)
# -----------------------------------------------------------------------------
GEMINI_API_KEY=your_gemini_api_key

# -----------------------------------------------------------------------------
# REQUIRED: Security & Auth
# (Generate with: openssl rand -base64 32)
# -----------------------------------------------------------------------------
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=your_secure_random_cron_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -----------------------------------------------------------------------------
# OPTIONAL: Enhancements & Distributed Infrastructure
# -----------------------------------------------------------------------------
# Upstash Redis (Free serverless Redis for multi-instance caching & rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry Error Reporting
SENTRY_DSN=

# Bot Admin Discord User IDs (comma-separated for system access)
ADMIN_DISCORD_IDS=
```

---

## 6. Secret Protection & Git Verification

The repository enforces strict secret protection:
1. `.gitignore` explicitly ignores `.env*`, `.env.local`, and all certificate/key formats (`*.pem`).
2. `.env.example` is maintained with clean placeholder documentation.
3. No secrets or local credentials are staged or tracked in git history.
4. Git commit authorship is verified as:
   `aicordbot-dev <aicordbot@gmail.com>`.

---

## 7. Master Roadmap: Milestone A & Beyond

AiCord development progresses according to the structured Milestone A sequence:

```
[P1: Core Setup & /build] ✅ DONE
        │
[P22: 8 Shared Engines]   ✅ DONE (73 Tests Passing)
        │
[P14: Command Registry]   🚀 ACTIVE NEXT TARGET
        │
[P2: Role/Channel/Cat]    ⏳ PENDING
        │
[P3: Moderation Engine]   ⏳ PENDING
        │
[P4: /ai Management]      ⏳ PENDING
        │
[P5: Admin Dashboard]     ⏳ PENDING
        │
[P6: Async Worker Engine] ⏳ PENDING
        │
[Milestone B+: Levels, Tickets, Automod, Starboard, Economy...]
```

### Full Phase Reference:
* **P14:** Command Registry & Autocomplete (Unified registry, dynamic option search).
* **P2:** Role/Channel/Category management (`/channel create`, `/role modify`, sync checks).
* **P3:** Moderation Suite (`/warn`, `/mute`, `/kick`, `/ban`, `/modcase`, hierarchy-guarded).
* **P4:** AI Management (`/ai ask`, `/ai summarize`, contextual knowledge recall).
* **P5:** Web Dashboard (NextAuth Discord OAuth2, server switcher, analytics overview).
* **P6:** Worker Queue Daemon (Vercel Cron dispatcher, scheduled temp-action expiries).
* **P7 – P38:** Advanced modules including Leveling, Tickets, Automod, Starboard, Backups, and Marketplace.

---

## 8. Directory Architecture Map

```
c:\DiscroAI\discord-architect\
├── scripts/
│   └── register-commands.ts       # Standalone Discord slash command registration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   ├── jobs/                  # Background worker endpoint (/api/cron/jobs)
│   │   │   │   ├── process-build-jobs/    # Long-running async build executor
│   │   │   │   └── process-temp-actions/  # Auto-unban / auto-unmute worker
│   │   │   ├── discord/
│   │   │   │   └── interactions/          # Ed25519 verified HTTP webhook handler
│   │   │   └── health/                    # Ping & connectivity check
│   │   ├── layout.tsx
│   │   └── page.tsx                       # Web landing page
│   ├── commands/                          # Modular slash command handlers
│   │   ├── ai.ts
│   │   ├── build.ts                       # /build & /undo-build implementation
│   │   ├── channel.ts
│   │   ├── mod.ts
│   │   └── role.ts
│   ├── lib/
│   │   ├── ai/                            # Gemini prompt templates & Zod schemas
│   │   ├── discord/                       # Discord REST client, embeds, and previews
│   │   ├── engines/                       # 8 Core Shared Engines
│   │   │   ├── audit-logger.ts
│   │   │   ├── cache.ts
│   │   │   ├── index.ts
│   │   │   ├── job-queue.ts
│   │   │   ├── pagination.ts
│   │   │   ├── permission-engine.ts
│   │   │   ├── rate-limiter.ts
│   │   │   ├── template-engine.ts
│   │   │   └── time-engine.ts
│   │   ├── db.ts                          # MongoDB Atlas Mongoose singleton connection
│   │   └── env.ts                         # Zod-validated environment runtime
│   └── models/                            # Mongoose Schemas & TypeScript interfaces
│       ├── AuditLog.ts
│       ├── AutomodConfig.ts
│       ├── BuildJob.ts
│       ├── GuildConfig.ts
│       ├── Job.ts
│       ├── ModCase.ts
│       ├── RolePanel.ts
│       ├── TempAction.ts
│       └── Warning.ts
└── test/
    └── engines/                           # 73 unit tests across all 8 engines
```

---

*Handoff document maintained and validated by the AiCord Engineering Team.*
