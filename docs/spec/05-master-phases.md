# Discord Architect - Master Phase Plan (05)

> [!IMPORTANT]
> This document is the single source of truth for build sequencing. All implementation work is ordered by this plan. Never start a phase without its prerequisites being marked **done** in `PROGRESS.md`.

---

## HOW TO WORK

1. **Read the phase description** below and cross-reference the relevant spec file(s) before writing any code.
2. **Mark in-progress** immediately in `PROGRESS.md` when you start a phase.
3. **Complete the Definition of Done** (DoD) checklist at the bottom of this file for every phase before marking it done.
4. **Never skip a phase** – phases are ordered by dependency. If a phase seems redundant, check the SUPERSEDED MAP below.
5. **Commit after every phase** – each phase should be one atomic git commit with the message format: `feat(P<n>): <short description>`.
6. If a phase requires a decision (e.g., which billing provider), leave a `TODO(decision):` comment and document the assumption made.
7. The worker (`/worker`) and the Next.js app share MongoDB models. Changes to shared models must be backward-compatible during deployment.

---

## PHASE CATALOG

### Foundation

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P1 | Project Scaffold | 00-core | Monorepo setup: Next.js 14 app router in root, `/worker` as a standalone Node package. ESLint, Prettier, TypeScript strict. `src/lib/limits.ts` with all Discord hard limits. `.env.example` with all required env vars. Zod env validation on startup. |
| P2 | MongoDB Connection & Base Models | 00-core | Mongoose connection singleton. Base models: `GuildConfig`, `AuditLog`, `BuildJob`. Index definitions. Connection health check endpoint `/api/health`. |
| P3 | Discord Interactions Endpoint | 00-core | `POST /api/discord/interactions`. Ed25519 signature verification. Handle `PING`. Deferred response (type 5) pattern. Interaction token storage for follow-up edits. |
| P4 | Command Registry | 02-addendum | Central command registry. `CommandDefinition` type. Auto-generate slash command JSON. Script to bulk-register commands with Discord. Autocomplete handler routing. |
| P5 | Permission & Safety Engine | 00-core, 03-addendum | `canActOn(invoker, target, action)`. Permission bit checks. Role hierarchy. Blueprint safety validator (no Admin to non-staff, channel/role caps). `whitelist of action handlers` pattern. |
| P6 | Job Queue Engine | 03-addendum | MongoDB-backed `Job` model. Cron claimer with atomic findOneAndUpdate. Exponential backoff (max 5 attempts). Dead-letter state. Vercel Cron route `/api/cron/jobs` protected by `CRON_SECRET`. |
| P7 | Rate Limiter & Discord REST Client | 00-core, 03-addendum | `@discordjs/rest` wrapper. Bucketed queue per route+major param. `X-RateLimit-*` header reader. 429 backoff + retry. Global 50 req/s cap. Sequential channel/role creation with delays. |

### Core Bot Features

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P8 | AI Server Builder (superseded) | — | *Superseded by P23. Do not implement.* |
| P9 | AI Server Management Command (superseded) | — | *Superseded by P24. Do not implement.* |
| P10 | Roles & Channels Commands | 00-core | `/role create\|edit\|delete\|assign\|remove`, `/channel create\|edit\|delete\|lock\|unlock\|slowmode`, `/category create\|edit\|delete\|reorder`. Autocomplete for names. |
| P11 | Reaction/Button Role Panels | 00-core, 02-addendum | `/rolepanel` command. `RolePanel` model. Modes: normal, unique, verify, drop, max-N. Button and select-menu layouts. Timed roles, role cooldown. |
| P12 | Moderation Commands | 00-core | `/ban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/clearwarnings`, `/purge`, `/lock`, `/slowmode`, `/modlog-setup`. `ModCase`, `Warning` models. Case numbers, reasons, moderator, temp-action expiry via cron. |
| P13 | Plans & Feature Gating | 01-addendum | `src/lib/plans.ts`. `Subscription` model. `getGuildPlan(guildId)`. `requireFeature(guildId, feature)`. Used by every command and API route. |
| P14 | Billing Webhooks | 01-addendum | `BillingProvider` interface. Lemon Squeezy or Stripe implementation (env-selectable). Webhook route with signature verification. `ProcessedWebhookEvent` deduplication. Handle: created, renewed, failed, canceled, expired. 7-day trial. |

### Worker & Live Events

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P15 | Gateway Worker Scaffold | 00-core | `/worker` Node.js package. `discord.js` gateway client. Event handler router. Shared MongoDB models import. Env validation. PM2/forever config for self-hosting. Docker Compose for local dev. |
| P16 | Automod Engine | 02-addendum | `AutomodRule` model. Rules: spam, caps, emoji spam, mass mentions, invite links, link filter, banned words + regex (leetspeak normalization), phishing/scam patterns. Strike system + decay. Discord native AutoMod API integration. Worker-only rules. |
| P17 | Anti-Raid & Anti-Nuke | 01-addendum, 02-addendum | Join-rate detection, account-age checks, auto-lockdown, raid mode command. Anti-nuke: mass-delete/ban detection, role stripping, owner alert. |
| P18 | Logging System | 02-addendum | `LogConfig` model. Separate configurable log channels per category (messages, members, roles, channels, voice, bans, threads, etc.). `MessageSnapshot` with TTL. Deleted/edited message logging. |
| P19 | XP & Levels | 01-addendum, 03-addendum | `MemberXP`, `LevelConfig`, `LevelReward` models. MEE6-compatible level curve. Voice XP. Multipliers. Level-up messages. Role rewards. Prestige (Pro). Leaderboards. Rank card via satori/`@vercel/og`. Anti-abuse. |
| P20 | Welcome, Goodbye & Verification | 01-addendum, 03-addendum | `WelcomeConfig`, `VerificationConfig` models. Image card welcome message. DM welcome. Goodbye. Verification modes: button, captcha, account-age, rules question. Auto-nickname, strip-hoist. |
| P21 | Birthdays | 01-addendum, 03-addendum | `Birthday`, `BirthdayConfig` models. Full command set. Cron every 15 min. Timezone-aware. Birthday role grant/remove. Leap year handling. 13+ age validation. |

### Core Engines & Templates

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P22 | Core Engines | 03-addendum | Template/variable engine (`{user}`, `{server}`, `{level}`, `{if:...}`, etc.). Time engine (UTC, IANA, DST-safe, date-fns-tz). Job queue (already exists – wire to engines). Cache layer (in-memory LRU + optional Upstash Redis). Pagination splitter utility (embeds → pages with buttons). |
| P23 | AI Server Builder (Full) | 00-core, 03-addendum | `/build <description>`. Gemini via Vercel AI SDK + `generateObject` + Zod schema. Blueprint struct: roles, categories, channels, permission overwrites, welcome/rules content. Safety layer. PREVIEW embed (tree view). Confirm/Edit/Cancel buttons. Apply step (sequential, live progress). Snapshot + `/undo-build`. Template presets (gaming, dev, study, creator, business). `/build-from-server` diff flow. |
| P24 | AI Server Management | 00-core | `/ai <natural language>`. Typed action list via Zod schema. Whitelist of handlers. Confirm for destructive actions. Audit log storage. |
| P25 | Ticket System | 01-addendum, 02-addendum | `TicketPanel`, `TicketType`, `TicketForm`, `Ticket`, `Transcript`, `TicketRating`, `CannedResponse`, `StaffNote` models. Multiple panels per guild. Pre-ticket modal forms. All ticket actions. HTML transcript. Auto-close. Feedback rating. AI summary + suggested replies. |

### Community & Engagement

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P26 | Economy | 01-addendum, 03-addendum | `EconomyAccount`, `ShopItem`, `Transaction` models. `/daily`, `/work`, `/balance`, `/pay`, `/shop`, `/inventory`. Currency config. Streak bonus. Bank/wallet. Atomic balance updates. |
| P27 | Giveaways, Polls, Suggestions & Starboard | 01-addendum, 03-addendum | `Giveaway`, `Poll`, `Suggestion`, `StarboardEntry` models. Full feature sets per spec §J. Multiple winners, reroll, claim window. Anonymous polls. Bayesian rating for suggestions. Multiple starboards. |
| P28 | Community Utilities | 02-addendum | Custom commands/tags (v2), auto-responders, timers/scheduled messages, sticky messages, embed builder, announcement auto-publish, auto-thread, auto-react, auto-delete, AFK, counting game, confession channel. |
| P29 | Social Feeds & Alerts | 01-addendum, 02-addendum | `FeedSubscription` model. RSS, YouTube, Twitch, Bluesky, Reddit, Kick, GitHub releases polling via cron. Per-plan feed limits. npm/PyPI package release feeds. |
| P30 | Voice Tools | 03-addendum | Join-to-create (owner panel buttons: rename, limit, lock, hide, kick, invite, transfer, claim). Voice stats channels. Voice logs. Voice roles. |
| P31 | Forum, Thread & Channel Automation | 03-addendum | Auto-thread on message. Forum post templates + required tags. "Mark solved" button. Stats/counter channels (coalesced updates, 2/10min limit). Auto-delete TTL. Slowmode schedules. Help-forum workflow (spec §5). |

### Advanced Modules

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P32 | Invite Tracking & Growth | 02-addendum | `InviteStat`, `InviteReward` models. Invite tracking (who invited whom, uses, fakes, rejoins). Leaderboard. Role rewards at N invites. Join gate options. Member milestones. Growth analytics. |
| P33 | Modmail & Staff Applications | 03-addendum | Modmail: DM→private thread relay, staff reply→DM, all actions. Staff applications: multi-step modal forms, review channel with action buttons. |
| P34 | Reputation, Events & AI Brain | 03-addendum | `/rep give`. Scheduled Events API + RSVPs + reminder DMs. AI features: summarize channel/thread, daily/weekly digest, server health report, cleanup suggestions, channel topic/description generator, rules generator, announcement drafter, FAQ builder, AI persona. |
| P35 | Web Dashboard (Core) | 00-core | Next.js app router dashboard. Discord OAuth2 (Auth.js). Guild selector (Manage Server + bot present). Pages: Overview (health score widget), AI Builder, Roles, Channels, Moderation, Automod, Audit Log, Templates. Server-side auth on every route. Module toggle marketplace page. |

### Extra Modules (Addendum 4)

| Phase | Name | Spec Reference | Description |
|-------|------|----------------|-------------|
| P36 | Template Marketplace | 04-addendum-extra §1 | Publish, browse, search, filter, one-click apply, fork, AI remix, ratings/reviews. `Template`, `TemplateRating`, `AppliedTemplate` models. Dashboard marketplace page. |
| P37 | Server Setup Wizard & Health Score | 04-addendum-extra §2 | Join-triggered wizard (DM + dashboard banner). Health score 0-100 with weighted checks. Daily snapshots. Dashboard health widget with trend graph. |
| P38 | Cross-Server Trust Network | 04-addendum-extra §3 | Opt-in shared ban list. Alt-account heuristics. Phishing intelligence feed. Governance + privacy controls. |
| P39 | Community Monetization | 04-addendum-extra §4 | Paid role tiers. Hosted checkout page per guild. Role lifecycle on payment events. Stripe connected accounts / marketplace flow. Owner analytics. |
| P40 | Developer-Community Tools | 04-addendum-extra §5 | GitHub integration. Help-forum workflow (if not done in P31). Code formatting helper. Status/uptime monitor. Package/news feeds. |
| P41 | Gaming & Community Extras | 04-addendum-extra §6 | Free-games alerts. Game server status (Minecraft, Source, FiveM). LFG posts. Tournament brackets. Mini-games (trivia, scramble, mathrace, slots). |
| P42 | Communication Bridges & i18n | 04-addendum-extra §7 | Auto-translate channels. Cross-channel announcement fan-out. Dashboard i18n (8 languages). RTL layout support. `next-intl` integration. |
| P43 | Team Access, Reliability & Feedback | 04-addendum-extra §8 | Dashboard team access (Owner/Admin/Moderator/Viewer roles). Config backups (auto + manual). Data export (GDPR). Incident system. Feedback & feature voting with public roadmap page. |
| P44 | Growth & Distribution | 04-addendum-extra §9 | Referral program. Bot-list integrations (top.gg, etc.) + vote rewards. User-level premium subscription. Public server pages (SEO-optimized). |
| P45 | Quality Hardening | 04-addendum-extra §10 | Feature flags system. SSRF-safe `safeFetch` utility (replace all raw `fetch` calls). Money movement idempotency audit across all billing/economy code. Full i18n strings for all 8 languages for all modules. End-to-end guild isolation integration tests. |

---

## SUPERSEDED MAP

Some early placeholder phases were superseded by more detailed implementations. **Do not implement the superseded phases** – implement their replacement instead.

| Superseded Phase | Replaced By | Reason |
|------------------|-------------|--------|
| P8 (AI Server Builder basic) | P23 (AI Server Builder Full) | P23 covers the full spec including templates, diff preview, and rollback |
| P9 (AI Server Management basic) | P24 (AI Server Management) | P24 is the complete implementation |

---

## BUILD ORDER

Phases must be completed in the milestone order below. Within a milestone, phases with no interdependency may be done in parallel, but sequential is safer for a solo developer.

### Milestone A — Infrastructure (P1–P7)
> Goal: Bot responds to slash commands, job queue runs, rate limiting works, plans are enforced.

```
P1 → P2 → P3 → P4 → P5
                     ↓
               P6 → P7 → P13 → P14
```

**Exit criteria**: `/api/health` returns 200, a test slash command is registered and responds, a cron job fires and processes a test job, `requireFeature` blocks a feature on the Free plan.

---

### Milestone B — Core Bot (P10–P12, P15–P21)
> Goal: Fully functional moderation + community bot. Can replace MEE6/Carl-bot for a live server.

```
P10 → P11 → P12
P15 → P16 → P17 → P18
P19 → P20 → P21
```

**Exit criteria**: A test guild can be moderated (ban/kick/warn/timeout), automod fires on a spam message, users gain XP and level up, birthdays are announced, welcome message fires on join.

---

### Milestone C — AI Core (P22–P25)
> Goal: AI server builder, AI management, and ticket system live.

```
P22 → P23 → P24 → P25
```

**Exit criteria**: `/build gaming server` produces a valid blueprint, applies it to a test guild without errors, and can be rolled back with `/undo-build`. A ticket panel is created and a ticket can be opened, claimed, and closed with a transcript.

---

### Milestone D — Community & Engagement (P26–P34)
> Goal: Full community feature set live. Comparable to Statbot + Dyno + Ticket Tool combined.

```
P26 → P27 → P28 → P29 → P30 → P31 → P32 → P33 → P34
```

**Exit criteria**: Economy works (daily, pay, shop). Giveaway runs and picks a winner. Suggestions can be voted on. Social feed posts a new YouTube video. Voice channel auto-creates and deletes. Modmail thread relays DMs correctly.

---

### Milestone E — Dashboard (P35)
> Goal: Web dashboard fully operational for all features built in Milestones A–D.

```
P35 (depends on all prior phases being done)
```

**Exit criteria**: Dashboard loads, guild selector works, all module settings pages save and reflect live. Auth protects all routes. Audit log visible.

---

### Milestone F — Extra Modules & Polish (P36–P45)
> Goal: Addendum 4 features live. Bot is production-ready with quality hardening.

```
P36 → P37 → P38 → P39 → P40 → P41 → P42 → P43 → P44 → P45
```

**Exit criteria**: Template marketplace has at least 3 published templates. Health score computed correctly for a test guild. Trust network opt-in works. Monetization checkout page processes a test payment. All 8 dashboard languages load. `safeFetch` rejects a private-IP URL. All P45 quality checklist items pass.

---

## DEFINITION OF DONE

Every phase must satisfy **all** of the following before being marked `done` in `PROGRESS.md`:

### Code Quality
- [ ] All TypeScript errors resolved (`tsc --noEmit` passes).
- [ ] ESLint passes with no errors (`eslint . --max-warnings 0`).
- [ ] No `any` types introduced without explicit `// eslint-disable-line` comment and justification.
- [ ] All new env vars added to `.env.example` with descriptions.

### Schema & Data
- [ ] All new Mongoose models have: schema defined with types, required fields, defaults, `timestamps: true`, and indexes (at minimum `guildId`).
- [ ] All new API inputs validated with Zod schemas.
- [ ] No raw user input ever passed directly to MongoDB queries or Discord API calls.

### Discord Integration
- [ ] All new slash commands registered in the central command registry.
- [ ] All commands respond within 3 seconds (use deferred response + follow-up for slow operations).
- [ ] Destructive commands require an explicit Confirm button from an authorized user.
- [ ] All Discord API calls go through the rate-limited REST client wrapper (P7).
- [ ] Error responses are user-friendly (no raw error objects or stack traces exposed).

### Authorization & Security
- [ ] Every command checks invoker permissions via `canActOn()` (P5).
- [ ] Every dashboard API route verifies Discord OAuth session and guild membership server-side.
- [ ] Every AI call is metered through `requireFeature` / `UsageCounter`.
- [ ] No new external HTTP calls added without using `safeFetch` (after P45 is done, retroactively; before P45, use a TODO comment).

### Plan Gating
- [ ] Every new feature that has a plan limit has an entry in `src/lib/plans.ts`.
- [ ] `requireFeature` is called before the feature executes.

### Testing
- [ ] Unit tests written for core logic (pure functions, schema validators, engine outputs).
- [ ] Integration test written proving guild data isolation for any new model introduced (query with wrong guildId returns empty/null).

### Audit & Observability
- [ ] Every state-changing action logs to `AuditLog` with: `guildId`, `actorId`, `action` (string), `before` (snapshot), `after` (snapshot), `createdAt`.
- [ ] Critical errors reported to Sentry with `guildId` context tag.

### i18n
- [ ] All user-facing strings (command responses, embed titles/descriptions, button labels) use i18n keys from `/messages/en.json`.
- [ ] New i18n keys added to all 8 locale files (can be English as placeholder for non-English locales, but keys must exist).

### Documentation
- [ ] New commands listed in the auto-generated commands reference (from registry).
- [ ] New dashboard pages linked from the dashboard nav.
- [ ] `PROGRESS.md` updated: phase marked `done` with completion date.
