<div align="center">

# ⚡ AiCord

### The Autonomous AI-Powered Discord Server Architect & Community Engine

<p align="center">
  <a href="https://github.com/techmabdullah/AiCord">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=1000&color=5865F2&center=true&vCenter=true&width=750&height=50&lines=%F0%9F%A4%96+Instant+AI-Powered+Discord+Server+Architect;%E2%9A%A1+Type+%2Fbuild+%26+watch+channels%2C+roles+%26+permissions+generate+in+seconds;%F0%9F%94%A1+Smart+Anti-Raid%2C+Automod+%26+Rollback+Protection;%F0%9F%9A%80+Powered+by+Next.js+16%2C+TypeScript+%26+Gemini+AI" alt="AiCord Animated Typing Banner" />
  </a>
</p>

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_M0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_SDK-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Unit Tests: 73 Passing](https://img.shields.io/badge/Unit_Tests-73_Passing-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](test/)
[![Discord API v10](https://img.shields.io/badge/Discord_API-v10_(Ed25519)-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/developers/docs/intro)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

**Transform your Discord vision into production-ready community architecture in under 15 seconds.**  
AiCord marries Google Gemini generative models with Next.js 16 Serverless HTTP Interactions, automated role hierarchy mathematics, and resilient atomic job queuing to deliver a zero-hassle Discord infrastructure platform.

[✨ Key Features](#-key-features) • [🎮 Interactive Showcase](#-interaction-showcase) • [⚙️ 8 Core Shared Engines](#️-8-core-shared-engines) • [🛡️ Reliability & Safety](#️-rock-solid-reliability--safety) • [⚡ Quick Start](#-quick-start) • [🗺️ Roadmap](#-roadmap--progress-tracker)

</div>

---

## 💡 Why AiCord?

Setting up and maintaining a professional Discord server has historically meant spending hours dragging channels, creating roles, configuring granular permission overwrites, and dealing with clunky multi-purpose bots with outdated dashboards.

| Traditional Discord Management | Standard Multipurpose Bots | ⚡ AiCord Autonomous Architect |
| :--- | :--- | :--- |
| ⏱️ **Hours of manual dragging** and permission clicking | ⚙️ Static, rigid templates with manual web dashboards | 🤖 **Single prompt generates entire server in 10s** |
| ❌ Human errors leaving private staff channels exposed | ❌ Generic permissions prone to role escalation leaks | 🛡️ **Mathematical permission engine with owner immunity** |
| 🔄 No undo; mistakes require manual server deletion | ❌ No rollback capability for botched changes | ↩️ **Atomic `/undo-build` cleans up all created resources** |
| 🐌 Heavy gateway connections requiring persistent VPS | ⚠️ High RAM bot clusters prone to gateway disconnects | ⚡ **Next.js 16 Serverless HTTP Interactions (Ed25519)** |
| 💬 Static slash commands with rigid syntax | 💬 Hardcoded commands with no natural context | 🧠 **Conversational `/ai` command executes safe Zod actions** |

---

## ✨ Key Features

```
                                  ┌──────────────────────────┐
                                  │   AiCord Discord Core    │
                                  └─────────────┬────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
      │  /build <prompt>     │      │   /ai <natural lang> │      │  8 Shared Engines    │
      │  Full server synth   │      │   Conversational ops │      │  Tested & validated  │
      │  Interactive preview │      │   Zod action schema  │      │  Zero runtime bloat  │
      │  1-click undo/cancel │      │   Audit logged diffs │      │  73 Unit Tests Pass  │
      └──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

### 1. 🏗️ `/build <description>` — Instant AI Server Architect
- **Natural Language Blueprint Synthesis**: Describe what your server is for (e.g., *"Competitive Valorant Esports team with scrim channels, staff area, and coach voice rooms"*) or choose from curated templates (`gaming`, `dev`, `study`, `creator`, `business`).
- **Interactive Tree Preview**: Generates an ASCII hierarchy preview embed inside Discord displaying all planned roles, categories, channels, and permission overwrites before anything is created.
- **Human-in-the-Loop Confirmation**: Tap **[ 🚀 Confirm Build ]** or **[ ❌ Cancel ]**.
- **Live Progress Updates**: Watch your server build in real-time with step-by-step progress cards.
- **Instant Rollback (`/undo-build`)**: Don't like the result? Press **[ ↩️ Undo Build ]** to completely delete created roles, categories, and channels atomically without touching existing channels.

### 2. 🧠 `/ai <natural language>` — Conversational Server Administration
- **Natural Language Execution**: Say *"Create a private VIP lounge for Nitro Boosters with orange role and secret voice channel"* — AiCord handles the rest.
- **Strict Zod Action Guardrails**: Raw AI output is never fed directly to Discord. Model outputs are strictly mapped to a strongly typed schema (`create_channel`, `edit_role`, `set_permission_overwrite`, etc.).
- **Diff & Confirmation Modal**: Inspect exactly what actions AiCord plans to perform before executing.
- **Immutable Audit Logging**: Every AI mutation is saved to MongoDB with actor attribution and previous/new state diffs.

### 3. 🛡️ Rock-Solid Reliability & Safety
- **Dual Fallback Gemini Chain**: Queries `gemini-3.5-flash-lite`, automatically failing over to `gemini-2.5-flash` and `gemini-flash-lite-latest` if any endpoint encounters rate limits or upstream degradation.
- **Community Channel Auto-Detection**: Dynamically inspects guild features (`COMMUNITY`). Automatically downgrades `Announcement` channels to `GuildText` and `StageVoice` to `GuildVoice` for standard servers, preventing Discord API 400 Bad Request errors.
- **Centralized Discord API Limits**: Enforces hard boundaries (`limits.ts`) with safety buffers (safe caps: 490 channels, 240 roles, 6,000 characters across embeds) to prevent rate limits and Discord payload rejections.

---

## ⚙️ 8 Core Shared Engines

AiCord is powered by 8 decoupled, production-tested shared engines located in `src/lib/engines/`. All 8 engines are covered by **73 comprehensive unit tests** in `test/`.

```
src/lib/engines/
├── template/      → Safe AST parser & variable substitution engine
├── time/          → DST-safe IANA timezone & duration formatting engine
├── permissions/   → Discord role hierarchy & bitwise permission engine
├── queue/         → Distributed MongoDB atomic job queue with backoff
├── ratelimit/     → Sliding window rate limiter (Redis + Memory fallback)
├── cache/         → Dual-tier LRU cache layer with 60s guild config TTL
├── audit/         → Structural changeset diffing & audit logging engine
└── pagination/    → Codeblock-aware message & embed pagination splitter
```

| Engine | Description | Key Capabilities |
| :--- | :--- | :--- |
| **📝 Template Engine** | Tokenizes and renders dynamic text templates safely without `eval`. | • Supports `{user.mention}`, `{server.memberCount}`, `{channel:name}`<br/>• Deterministic `{random:optionA\|optionB}` selector<br/>• Conditional rendering: `{if isStaff}...{else}...{/if}`<br/>• Hard max output length truncation protection |
| **⏱️ Time Engine** | High-precision timezone and duration calculations powered by `date-fns-tz`. | • IANA timezone resolution: User ➔ Guild ➔ Fallback ➔ UTC<br/>• Compound duration parser: `"1d 4h 30m"` ➔ milliseconds<br/>• Native Discord markdown timestamp formatting (`<t:1700000000:R>`)<br/>• DST-safe same-day verification & start-of-day math |
| **👑 Permission Engine** | Discord API v10 permission calculator and hierarchy enforcer. | • `canActOn()` checks ensuring bot and invoker outrank target<br/>• Server owner immunity & absolute action bypass<br/>• Raw 64-bit BigInt bitwise permission math<br/>• Self-target and bot-target safety guards |
| **📬 Job Queue Engine** | Distributed, crash-resilient asynchronous task execution queue. | • Atomic job reservation using MongoDB `findOneAndUpdate`<br/>• Exponential backoff with randomized jitter<br/>• Dead-letter routing after configurable retry attempts<br/>• HTTP cron endpoint worker (`/api/cron/jobs`) |
| **🚦 Rate Limiter** | Sliding-window throughput controller protecting against spam and abuse. | • Dual-backend: Upstash Redis sliding window with memory fallback<br/>• Separate user-level and guild-level quota buckets<br/>• Remaining quota tracking & instant reset capability |
| **⚡ LRU Cache Layer** | High-throughput sub-millisecond memory caching layer. | • Dual-tier: In-memory LRU + distributed Redis layer<br/>• 60-second cached guild configurations with event-driven invalidation<br/>• TTL expiration & least-recently-used eviction policy |
| **📜 Config Audit Logger** | Deep object diffing engine recording every administrative mutation. | • Deep recursive diff detecting additions, removals, and modifications<br/>• Clean dot-notation change tracking (`automod.links.enabled: false ➔ true`)<br/>• MongoDB `AuditLog` persistence with actor and guild context |
| **📑 Pagination Splitter** | Discord message and embed chunking utility. | • Splits 2000+ character text while keeping Markdown code blocks intact<br/>• Paginates embed fields adhering to Discord's 25-field limit<br/>• Generates 5-button Discord `ActionRow` components (`⏮ ◀ 1/5 ▶ ⏭`) |

---

## 🎮 Interaction Showcase

### 1. `/build` Command Flow

```discord
[USER]  /build description: "Gaming community for RPG and FPS players with LFG and VIP lounge"

[BOT]   🤖 AiCord • Blueprint Preview
        Generated architecture for "Gaming community for RPG and FPS players with LFG and VIP lounge"
        
        📂 📢 INFORMATION
        ├── 💬 #announcements (Announcement / Text)
        ├── 📜 #rules (Read-Only)
        └── 👋 #welcome
        
        📂 💬 COMMUNITY
        ├── 💬 #general-chat
        ├── 🎮 #rpg-discussion
        ├── 🎯 #fps-discussion
        └── 🤝 #lfg-finder
        
        📂 🔊 VOICE CHANNELS
        ├── 🔊 Squad Voice 1
        └── 🔊 Squad Voice 2
        
        📂 💎 VIP LOUNGE (Private)
        ├── 💬 #vip-chat
        └── 🔊 VIP Lounge

        Roles: @Admin (Staff), @Moderator (Staff), @VIP, @Member
        
        [ 🚀 Confirm Build ]   [ ❌ Cancel ]
```

```discord
[BOT]   ⚡ Building your server… (Step 3/4)
        [██████████████████░░░░] 75%
        
        ✔ Created 4 Roles (@Admin, @Moderator, @VIP, @Member)
        ✔ Created 4 Categories (INFORMATION, COMMUNITY, VOICE, VIP)
        ⏳ Creating Channels & Permission Overwrites (9/11)...
```

```discord
[BOT]   ✅ Server Build Complete!
        Created 4 roles, 4 categories, and 11 channels in 4.2 seconds.
        
        [ ↩️ Undo Build ]
```

### 2. `/ai` Natural Language Management

```discord
[USER]  /ai request: "Create a private moderator review channel and alert the mod role"

[BOT]   🔍 AiCord Action Preview
        The following actions will be executed on your server:
        
        ➕ CREATE CHANNEL
           Name: #mod-review
           Category: 🛡️ STAFF
           Type: GuildText
           Overwrites:
             • @Moderator: VIEW_CHANNEL (ALLOW), SEND_MESSAGES (ALLOW)
             • @everyone: VIEW_CHANNEL (DENY)
             
        [ ✅ Approve & Execute ]   [ ❌ Dismiss ]
```

### 3. Unit Test Verification (All 73 Passing)

```bash
$ pnpm test

▶ Config Audit Logger Engine (12.1ms)
  ✔ detects deep diff for nested objects with dot-notation keys
  ✔ declares expected schema paths on AuditLog model
▶ Cache Layer (91.6ms)
  ✔ evicts least recently used item when max capacity is reached
  ✔ verifies guild config cache TTL is 60s and can be invalidated
▶ Job Queue Engine (33.6ms)
  ✔ transitions job to completed on successful execution
  ✔ transitions job to dead_letter when attempts reach maxAttempts
▶ Pagination Splitter Engine (13.5ms)
  ✔ preserves code block language and closes/reopens blocks across splits
  ✔ clamps itemsPerPage to maximum allowed Discord fields per embed (25)
▶ Permission Engine (15.8ms)
  ✔ enforces server owner immunity & allows owner to bypass hierarchy checks
  ✔ denies when bot highest role position is lower than or equal to target
▶ Rate Limiter Engine (9.2ms)
  ✔ allows requests within limit and provides guild & user bucket isolation
▶ Template Engine (87.3ms)
  ✔ handles {random:a|b|c} choices deterministically with choiceFn
  ✔ evaluates conditional rendering with operators and {else}
  ✔ enforces maximum output length safely without throwing
▶ Time Engine (87.5ms)
  ✔ resolves timezone precedence (user > guild > fallback > UTC)
  ✔ parses compound durations like "2h 15m 30s"
  ✔ computes start of day in timezone accurately & DST-safe operations

ℹ tests 73
ℹ suites 25
ℹ pass 73
ℹ fail 0
ℹ duration_ms 3433.66
```

---

## 🏗️ Core Architecture

AiCord is architected specifically for **Vercel Serverless HTTP Interactions**. Discord delivers interactions directly to our Next.js App Router endpoint via HTTPS POST requests signed with Ed25519 cryptography.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Discord User
    participant DC as Discord Gateway / API
    participant API as Next.js 16 (/api/interactions)
    participant AI as Gemini 3.5 AI Fallback Chain
    participant DB as MongoDB Atlas & Upstash
    participant Q as Shared Engine Core

    Admin->>DC: Runs /build "Cyberpunk Tech Hub"
    DC->>API: POST /api/interactions (Ed25519 Signed)
    API->>API: Verify Ed25519 signature
    API-->>DC: HTTP 200 (Deferred Channel Message With Source)
    
    API->>AI: Generate Blueprint Schema
    alt Gemini 3.5 Flash Lite Available
        AI-->>API: Blueprint JSON
    else Upstream Rate Limit / Error
        API->>AI: Failover to Gemini 2.5 Flash
        AI-->>API: Blueprint JSON
    end

    API->>DB: Save BuildJob (status: preview)
    API->>DC: Edit original response with Tree Preview & Buttons
    
    Admin->>DC: Clicks [ 🚀 Confirm Build ]
    DC->>API: POST /api/interactions (Button custom_id)
    API->>Q: Role Hierarchy & Community Detection
    API->>DC: Batch Create Roles, Categories & Overwrites
    API->>DB: Save created IDs & AuditLog
    API->>DC: Edit response with Completion Card & [ ↩️ Undo ]
```

---

## 🗺️ Roadmap & Progress Tracker

AiCord is developed under a disciplined, multi-phase master specification. Below is our live status tracker:

```
[████████████░░░░░░░░░░░░░░░░░░░░] 2 / 38 Phases Active & Verified
```

### ✅ Completed & Production Ready
- [x] **Phase 1: Project Setup + `/build` Engine**
  - Next.js 16 App Router foundation with Tailwind CSS v4.
  - Ed25519 signature verification on `/api/interactions`.
  - Google Gemini server blueprint generation with multi-model fallback.
  - Interactive ASCII preview tree, live progress updates, and atomic `/undo-build` rollback.
  - Hard limit guards (`limits.ts`) and Discord `COMMUNITY` feature auto-detection.
- [x] **Phase 22: 8 Core Shared Production Engines**
  - Implemented all 8 foundational engines in `src/lib/engines/`.
  - **73 Unit Tests** passing across 25 suites with 100% test pass rate.

### 🚀 Upcoming Milestones (Master Phases)
- [ ] **Phase 14: Global Slash Command Registry** — Centralized auto-sync of commands across development and production guilds.
- [ ] **Phase 2: Channel & Role Management Suite** — `/role create/color/give`, `/channel lock/hide/slowmode`.
- [ ] **Phase 3: Moderation Engine** — `/mod ban/kick/timeout/warn` with hierarchy checks and DM notifications.
- [ ] **Phase 4: `/ai` Conversational Server Copilot** — Expanded multi-intent action planner with confirmation dialogues.
- [ ] **Phase 5: Web Dashboard** — Next.js 16 + NextAuth v5 server management portal.
- [ ] **Phase 6: Gateway Background Worker** — Autonomous background agent for real-time automod and message analysis.
- [ ] **Phase 11: Anti-Nuke & Backup Vault** — Scheduled guild snapshots and instant automated anti-raid quarantine.
- [ ] **Phase 15: Support Ticket System** — Reaction & button-based ticket threads with transcript exports.
- [ ] **Phase 16: Intelligent Automod** — AI spam, toxicity, and phishing link scanner.

---

## ⚡ Quick Start

### Prerequisites
Before running AiCord, ensure you have:
- **Node.js**: `v20.x` or later
- **Package Manager**: `pnpm` (`v9.x` or `v10.x`)
- **Discord Developer Application**: Create one at [Discord Developer Portal](https://discord.com/developers/applications)
  - Create a Bot under the **Bot** tab and enable `SERVER MEMBERS INTENT`.
  - Copy **Application ID**, **Public Key**, and **Bot Token**.
- **MongoDB Atlas**: Free M0 tier connection string
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/)

---

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/techmabdullah/AiCord.git
cd AiCord/discord-architect
```

#### 2. Install Dependencies
```bash
pnpm install
```

#### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate your credentials:
```bash
cp .env.example .env.local
```

```env
# ─── Discord Credentials ───────────────────────────────────────────────────
DISCORD_APPLICATION_ID="123456789012345678"
DISCORD_PUBLIC_KEY="your_hex_encoded_ed25519_public_key"
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_GUILD_ID="your_dev_guild_id_for_instant_command_testing"

# ─── Database & Storage ────────────────────────────────────────────────────
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/aicord?retryWrites=true&w=majority"

# ─── AI Engine ─────────────────────────────────────────────────────────────
GEMINI_API_KEY="your_google_gemini_api_key"

# ─── Optional: Upstash Redis (For distributed caching and rate-limiting) ───
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# ─── App Configuration ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_a_secure_random_string_here"
```

#### 4. Register Slash Commands with Discord
Sync slash command definitions with Discord's API:
```bash
pnpm register-commands
```

#### 5. Run the Automated Test Suite
Verify that all 8 shared engines pass all 73 unit tests:
```bash
pnpm test
```

#### 6. Start the Development Server
```bash
pnpm dev
```
AiCord will be running on `http://localhost:3000`.

#### 7. Connect Discord Interactions Webhook
Since Discord interactions run over HTTP:
1. Expose your local port `3000` via Cloudflare Tunnel or ngrok:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
2. In your [Discord Developer Portal](https://discord.com/developers/applications), set the **Interactions Endpoint URL** to:
   ```
   https://<your-tunnel-url>/api/interactions
   ```
3. Discord will send a `PING` payload. AiCord will verify the Ed25519 signature and acknowledge it with `PONG`.

---

## 🛠️ Available Scripts

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js 16 development server with Turbopack |
| `pnpm build` | Compiles the production build |
| `pnpm start` | Starts the production server |
| `pnpm test` | Runs all 73 engine unit tests across 25 suites using `tsx --test` |
| `pnpm typecheck` | Validates TypeScript types across the codebase (`tsc --noEmit`) |
| `pnpm lint` | Runs Next.js ESLint checks |
| `pnpm register-commands` | Syncs slash commands (`/build`, `/ai`, `/role`, etc.) with Discord |

---

## 🛡️ Discord Permission & Limit Reference

AiCord adheres to strict security standards to ensure your Discord servers stay protected:
- **Administrator Role Guard**: AiCord will never automatically assign `Administrator` to any role unless explicitly marked as staff AND requested by the server owner.
- **Role Position Safety**: AiCord verifies that its own bot role is higher than any role it creates, modifies, or deletes.
- **Server Owner Immunity**: Moderation actions targeting the server owner are strictly rejected at the engine level.
- **Community Channel Graceful Degradation**: Guilds without the `COMMUNITY` badge are automatically mapped to supported channel primitives.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for Discord Communities by the AiCord Engineering Team.**

[⭐ Star us on GitHub](https://github.com/techmabdullah/AiCord) • [🐛 Report a Bug](https://github.com/techmabdullah/AiCord/issues) • [💬 Request a Feature](https://github.com/techmabdullah/AiCord/issues)

</div>
