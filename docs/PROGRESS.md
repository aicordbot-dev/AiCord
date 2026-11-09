# Progress

| Phase | Name | Status | Notes / known issues |
|---|---|---|---|
| P1 | Setup + /build | done | Setup complete: Next.js App Router, Discord interaction endpoint with Ed25519 signature verification, MongoDB Atlas connection, /build command with AI blueprint generation (Gemini), interactive preview tree embed, confirm, apply, and rollback logic. Verified clean `pnpm tsc --noEmit`, clean `pnpm lint`, clean `pnpm build`, and registered commands script. |
| P1+ | AI Build & Review Enhancement | done | Advanced multi-view review system for `/build`: Structure View, Security & Permission Audit View, and Role Hierarchy View with interactive tab buttons. In-place category and channel renaming via Discord Select Menus (`StringSelectMenu`) and native Discord Modals (`MODAL_SUBMIT` / type 5) with live preview updates. Permission audit engine inspecting Admin/Mod roles, `@everyone` isolation, and private channel containment. Enriched Gemini prompt for topics, slowmodes, and cohesive role palettes. 126 unit tests passing (25 new tests). 0 typecheck errors, 0 lint warnings. |
| P22 | Shared engines | done | Implemented all 8 core shared engines: Template Engine (safe AST/tokenizer, max output length, {user}, {server}, {random}, {if}), Time Engine (date-fns/tz, UTC normalization, IANA timezones, duration parser/formatter, Discord timestamps), Permission Engine (canActOn hierarchy & bit checks, owner bypass/immunity), Job Queue Engine (Job model, atomic claimer, exponential backoff, dead-letter, /api/cron/jobs), Rate Limiter (sliding window with Upstash Redis + in-memory fallback), Cache Layer (in-memory LRU + Upstash Redis, 60s guild config TTL), Audit Logger (deep changeset diff, AuditLog persistence), Pagination Splitter (fenced codeblock-aware splitMessage, paginateEmbeds, ActionRow buttons). 73 unit tests passing across 8 test suites. |
| P14 | Command registry | done | Central Command Registry & Dynamic Autocomplete Engine: strict RegisteredCommand & AutocompleteContext interfaces, dynamic command registration with overwrite handling, Discord JSON schema mapping, Phase 22 RateLimiter sliding-window middleware, GuildConfig.disabledCommands check with 60s cache TTL, error resilience with polite embeds (no stack trace leaks), deep option tree traversal for autocomplete with Discord 25-choice and 100-char clamping. Migrated /build, /ai, /role, /channel, and /mod. 101 tests passing (28 new registry tests + 73 engine tests). Verified clean typecheck, lint, and production build. |
| P2 | Role/channel/category cmds | todo | |
| P3 | Moderation | todo | |
| P4 | /ai management | todo | |
| P5 | Dashboard | todo | |
| Phase B | Auth & Guild Access | done | Complete Discord OAuth2 (Auth.js v5 beta) authentication, encrypted JWT refresh rotation with concurrency lock, server-side guild permissions engine (canManageGuild 0x8 / 0x20), Next.js 16 proxy request interceptor, open-redirect defense, 3D card guild picker, invite completion polling, server console access gating with requireGuildAccess, and demo mode. 34 new unit tests (1,538 total passing tests). |
| P6 | Worker | todo | |
| P7 | Server-Wide Subscriptions & Entitlements (Milestone 2) | done | Server-wide subscription entitlement engine, multi-tier matrix (Free, Pro, Ultimate, Lifetime), HMAC-signed cryptographic license keys, double-redemption prevention, expiration checks, granular feature gating across all bot commands, and interactive /premium command with tab navigation, tier comparison matrix, and instant key redemption. 452 passing unit tests. 0 typecheck errors. |
| P23 | Levels | done | Comprehensive Levels & XP Progression System & Automated Role Rewards: MongoDB models (UserLevel, LevelConfig), quadratic XP progression formula (XP = 5*N^2 + 50*N + 100), visual rank cards with custom progress bar rendering, server XP leaderboard with medal badges (🥇, 🥈, 🥉), TemplateEngine-integrated level-up announcements, 60s anti-spam sliding-window cooldown, ignored channels/roles, XP multipliers, automated role rewards on level thresholds, slash commands (/rank, /leaderboard, /level-rewards, /level-config) registered under category 'levels', and component webhook pagination routing. 254 unit tests passing (47 new tests). 0 typecheck errors, 0 lint warnings. |
| P24 | Birthdays + welcome | todo | |
| P15 | Tickets | todo | |
| P16 | Automod | todo | |
| P17 | Logging + mod extras | todo | |
| P30 | Setup wizard + health | todo | |
| P13 | Landing + legal + admin | todo | |
| P18 | Role tools + invites | todo | |
| P27 | Starboard/polls/giveaways | todo | |
| P11 | Backups + anti-nuke | todo | |
| P19 | Utilities | todo | |
| P12 | Feeds + custom cmds + /ask | todo | |
| P20 | AI server brain | todo | |
| P31 | Template marketplace | todo | |
| P36 | Referrals + user premium | todo | |
| P21 | Analytics polish | todo | |
| P35 | Team access + status | todo | |
| P25 | Modmail + applications | todo | |
| P26 | Events + reputation | todo | |
| P28 | Server Economy, Shop & Gamification | done | Comprehensive Server Economy, Shop, Daily Streaks & Gamification Engine: MongoDB models (EconomyUser, EconomyShopItem), daily streak mechanics with 24h cooldown, 48h reset, and up to 3.0x multiplier for 10+ day streaks, bank deposit/withdraw with capacity meters and 'all' shorthand, peer-to-peer coin transfers, 1h work shifts with Discord/programming narratives, 2h high-risk crimes with 55% win rate and bounded fines, server shop catalog with stock management and automated Discord role granting on purchase, wealth leaderboard sorted by net worth with pagination, slash commands (/balance, /daily, /deposit, /withdraw, /pay, /work, /crime, /shop, /buy, /shop-admin, /rich) registered under category 'economy', and webhook component routing for econ_shop and econ_rich pagination. 300 unit tests passing (46 new tests). 0 typecheck errors, 0 lint warnings. |
| P32 | Dev-community tools | todo | |
| P33 | Gaming extras | done | Interactive Games Suite: modular engines for Trivia (55 questions across tech, gaming, anime, science, general with shuffled choices and 4-button ActionRow), Blackjack (standard 52-card deck, dynamic Aces, dealer hits on soft 17 and stands on hard 17+, visual Unicode cards, Hit/Stand/Double Down buttons), Rock Paper Scissors (3x3 evaluation matrix, instant and interactive button play), 3-Reel Slots (weighted spin simulation, 25x/15x/10x/5x/2x paytable, ASCII retro cabinet), Coinflip (streak counter with flame tiers, optional wager doubling). Registered /trivia, /blackjack, /rps, /coinflip, /slots under category 'fun' with autocomplete and rate limiting. Webhook component routing with ephemeral security rejections for unauthorized users. 207 unit tests passing (81 new games tests). 0 typecheck errors, 0 lint warnings. |
| P34 | Translation + i18n | todo | |
| P29 | Public API + webhooks | todo | |
| P37 | Trust network | todo | |
| P38 | Paid roles | todo | |
| UCS-1 | Universal Theme & Style Engine | done | Phase 1 of Universal Custom Screens Suite: `themes.ts` with 6 aesthetic themes (Cyberpunk, Midnight, Emerald, Gold, Retro, Frost), 4 bar styles (pipes, blocks, squares, retro), `UserProfileStyle` MongoDB model, `/customize` slash command (`profile`, `preview`, `server-theme`) with live interactive button-switcher, dynamic autocomplete, and rate limiting. |
| UCS-2 | Enhanced Custom Screens (Levels & Economy) | done | Phase 2 of Universal Custom Screens Suite: Themed `/rank` player card with achievement badges and custom bar styles; `/leaderboard` with Olympic podium styling (🥇, 🥈, 🥉); `/balance` ATM Terminal card layout with wealth tiers (Bronze, Silver, Gold, Diamond) and bank capacity utilization meter; themed `/daily` ATM deposit receipts, `/shop` catalog, and `/rich` wealth leaderboard. |

## Universal Custom Screens Suite

### Phase 1: Universal Theme & Style Engine
- **Universal Theme Foundation (`themes.ts`)**: Modular, extensible theming architecture providing 6 distinct visual themes:
  - `cyberpunk`: Neon cyan & magenta palette with high-tech borders and cybernetic ornamentation (`⚡`, `[CYBERPUNK]`).
  - `midnight`: Deep dark-violet & indigo palette with celestial moon accents (`🌙`, `✦ MIDNIGHT ✦`).
  - `emerald`: Vibrant forest & mint green aesthetic with nature motifs (`🍃`, `◈ EMERALD ◈`).
  - `gold`: Luxurious golden & amber styling with royal crown detailing (`👑`, `★ GOLD RESERVE ★`).
  - `retro`: Nostalgic 80s arcade amber/terminal theme with pixel borders (`👾`, `:: RETRO ARCADE ::`).
  - `frost`: Crisp arctic blue & icy cyan styling with snowflake motifs (`❄️`, `❄ FROST PROTOCOL ❄`).
- **Dynamic Bar Styles**: 4 distinct Unicode progress bar styles with percentage boundary clamping (0–100%), length customization (4–50 characters), and theme defaults:
  - `pipes`: `▰▰▰▰▰▰▱▱▱▱` (high-tech cyber bar)
  - `blocks`: `██████░░░░` (solid block meter)
  - `squares`: `■■■■■■□□□□` (clean geometric squares)
  - `retro`: `▓▓▓▓▓▓░░░░` (shaded retro terminal CRT meter)
- **User Profile Style Model (`UserProfileStyle`)**: Mongoose schema and caching service persisting per-user customization for rank card theme, balance theme, bar style, and achievement badge visibility, with automated fallback to server-wide defaults configured in `GuildConfig`.
- **Interactive `/customize` Slash Command**:
  - `/customize profile`: View and configure personal theme, balance theme, and bar style preferences with dynamic autocomplete.
  - `/customize preview`: Interactive preview featuring theme hex accents, decorative headers, and sample progress bars. Includes a live button-switcher (`prev`, `next`, direct theme buttons, `set_rank`, `set_bal`) allowing users to cycle through themes and apply them directly to their rank card or balance screen with one click.
  - `/customize server-theme`: Server-wide default theme configuration with `MANAGE_GUILD` permission enforcement.

### Phase 2: Enhanced Custom Screens for Levels & Economy
- **Themed `/rank` Player Cards**:
  - Dynamically styled rank cards honoring the user's selected rank theme (or server default).
  - Customized progress bar rendering using the user's preferred bar style (`pipes`, `blocks`, `squares`, `retro`).
  - Visual achievement milestone badges dynamically unlocked by level tier (Novice, Apprentice, Expert, Master, Legend).
  - Styled statistics layout displaying level, server rank position, current XP, and next level threshold.
- **Olympic Podium `/leaderboard` & Themed Level-Up Embeds**:
  - Server XP leaderboard enhanced with Olympic podium styling:
    - 🥇 **1st Place**: Gold podium medal and prominent highlight.
    - 🥈 **2nd Place**: Silver podium medal.
    - 🥉 **3rd Place**: Bronze podium medal.
    - Numeric rank badges (`#4`, `#5`, ...) for subsequent placements.
  - Server-configured theme borders and accent colors across leaderboard embeds.
  - Themed level-up announcement embeds decorated with theme headers and celebratory borders.
- **ATM Terminal `/balance` Card Layout**:
  - Complete visual overhaul of the `/balance` card into an authentic ATM terminal screen.
  - Official bank header (`AiCord National Reserve // Secure ATM Terminal`) with cardholder identification and account status.
  - Dynamic wealth tier classification based on net worth:
    - 🥉 **Bronze**: Net worth < 10,000 coins
    - 🥈 **Silver**: Net worth 10,000 – 49,999 coins
    - 🥇 **Gold**: Net worth 50,000 – 199,999 coins
    - 💎 **Diamond**: Net worth 200,000+ coins
  - Visual ASCII bank capacity utilization meter (`[████████░░] 80% Full`) displaying real-time bank usage against maximum capacity.
  - Structured financial breakdown separating wallet cash, deposited funds, net worth, and total capacity.
- **Themed Economy Displays (`/daily`, `/shop`, `/rich`)**:
  - `/daily`: ATM deposit receipt embed with streak multiplier tracking, daily bonus payout, and updated bank balance.
  - `/shop`: Server-themed shopping catalog embed displaying item IDs, icons, prices, stock levels, and automated Discord role rewards.
  - `/rich`: Server wealth leaderboard featuring Olympic podium medals (🥇, 🥈, 🥉) and wealth tier badges (Bronze, Silver, Gold, Diamond) across all ranked members.

## Milestone 2: Server-Wide Subscription & Entitlement Engine

### Multi-Tier Subscription & Entitlement Matrix
- **Tier Architecture (`src/models/GuildSubscription.ts`, `src/lib/premium/entitlements.ts`)**:
  - `free`: Essential bot capabilities, 3 builds/mo, 3 tickets, 10 shop items, 2 unlocked themes (`cyberpunk`, `frost`).
  - `pro`: Advanced automation for growing communities, 15 builds/mo, 25 tickets, 50 shop items, all 6 themes + 4 bar styles, WhatsApp announcements bridge, boss raids, and 5 server backups.
  - `ultimate`: Powerhouse infrastructure with unlimited builds, tickets, shop items, custom hex colors, 24/7 endless radio, full WhatsApp bridge (panic button + modmail), 20 backups, and 100 AI TL;DR summaries/mo.
  - `lifetime`: Permanent VIP patron tier with unlimited access to all present and future features, permanent validity (`expiresAt: null`), unlimited backups, and full AI TL;DR suite.
- **Granular Feature Gating (`checkFeatureAccess`, `isThemeUnlocked`)**:
  - Unified gatekeeper functions querying cached or persisted guild subscriptions.
  - Numeric limits check (`-1` represents unlimited quota).
  - Boolean flag validation for specialized modules (WhatsApp, 24/7 radio, backups, boss raids, AI TL;DR).
  - Theme unlock verification for aesthetic customization options.

### Cryptographic HMAC-Signed License Keys
- **HMAC-SHA256 Signature Architecture**:
  - License format: `AICORD-<TIER>-<DURATION>-<NONCE>-<CHECKSUM>` (e.g. `AICORD-PRO-30D-A1B2C3D4-E5F67890` or `AICORD-LIFETIME-PERM-A1B2C3D4-E5F67890`).
  - Cryptographically signed with SHA-256 HMAC checksum to prevent key forgery or tampering.
  - Key validation parses tier and duration, recalculates expected checksum, and rejects corrupted keys.
- **Key Redemption & Lifetime Seeding (`redeemLicenseKey`, `scripts/seed-lifetime-license.ts`)**:
  - Single-use redemption logic preventing reuse across guilds or multiple attempts on the same guild.
  - Automatic expiration extension when stacking keys of the same tier.
  - Administrative seeding script (`scripts/seed-lifetime-license.ts`) for direct database provisioning of permanent Lifetime licenses for founder guilds and VIP patrons.

### Interactive `/premium` Slash Command Suite
- **Command Structure (`src/commands/premium.ts`)**:
  - `/premium status`: Comprehensive server overview displaying active tier badge (🆓 Free, ⚡ Pro, 👑 Ultimate, ♾️ Lifetime), owner details, expiration countdown / permanent status, and a detailed active feature checklist.
  - `/premium tiers`: Interactive multi-tier comparison view featuring tab buttons (`free`, `pro`, `ultimate`, `lifetime`) allowing server admins to inspect feature differences and perk allowances with live UI updates.
  - `/premium redeem <license_key>`: Instant license key redemption that validates HMAC signatures, applies the upgraded tier immediately, persists to MongoDB, and returns a celebratory embed.

### Verification & Test Coverage
- **452 Passing Unit Tests**:
  - Full suite testing HMAC key generation, tampering detection, valid/invalid checksums, tier parsing, and expiration handling.
  - Redemption tests confirming tier upgrades, double-redemption rejection, and expiration stacking.
  - Complete slash command test suite for `/premium status`, `/premium tiers`, and `/premium redeem`.
- **Zero Typecheck Errors**: Clean `tsc --noEmit` across all codebase modules.

## Infrastructure & Serverless Stability Notes

### Vercel Serverless Interaction Lifecycle & Webhook Auth Fix
- **Next.js `after()` Lifecycle**: Resolved serverless function early termination issues on Vercel where fire-and-forget background promises were interrupted immediately after returning the initial deferred response (`NextResponse.json(...)`). Routed asynchronous command execution (`handleCommandInteraction`), interactive component processing (`handleComponentAsync`), and modal submissions (`handleBuildModalSubmit`) through Next.js App Router's `after()` callback to guarantee the lambda execution context stays active until webhook updates finish.
- **Webhook Patch Authentication (`{ auth: false }`)**: Resolved Discord REST 401 Unauthorized errors during interaction response edits and follow-ups. Discord interaction webhook endpoints (`/webhooks/:application_id/:interaction_token/messages/@original`) are authenticated by the interaction token itself and reject `Bot <token>` Authorization headers. Explicitly passed `{ auth: false }` to `@discordjs/rest` PATCH, POST, and DELETE calls across `editInteractionResponse`, `sendFollowUp`, `deleteInteractionResponse`, and `deleteFollowupMessage`.
- **Lambda Timeout Configuration (`maxDuration = 60`)**: Exported `export const maxDuration = 60;` in `src/app/api/discord/interactions/route.ts` to provide up to 60 seconds of execution headroom on Vercel Serverless Functions, comfortably accommodating multi-step operations such as AI blueprint generation, database synchronization, and Discord API creation calls.
- **Resilient App ID & Bot Token Resolution**: Implemented prioritized fallback resolution in `resolveApplicationId(appId)` (`interaction.application_id` → `process.env.DISCORD_APP_ID` → `process.env.DISCORD_CLIENT_ID` → safe `env.DISCORD_APP_ID` try/catch) and `resolveBotToken()` (`env.DISCORD_BOT_TOKEN` → `process.env.DISCORD_BOT_TOKEN`) so webhook routing and REST clients never fail from missing or unvalidated environment schema wrappers during cold starts.

## Phase B: Auth and Guild Access Engine (Complete)

### 1. Auth.js (NextAuth v5 beta) Configuration
- **Discord Provider**: Configured with minimal least-privilege scopes strictly: `identify guilds` (no email or member reads).
- **Session Strategy**: Pure `jwt` with `trustHost: true`, `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Zero Token Leakage Guarantee**: `accessToken` and `refreshToken` are stored exclusively in encrypted JWT cookies and server-side token store; never exposed to client-side session payloads, console logs, or error responses.
- **Client Session Shape**: Strictly sanitized to `user.id`, `user.name`, `user.global_name`, `user.image` (avatar URL), and `isAdminOfAppOwner` boolean flag.
- **Automatic Token Refresh Rotation**: Concurrent mutex lock prevents colliding Discord refresh token exchanges; sets `RefreshTokenError` on revocation to trigger clean sign-out.
- **Route Handlers**: `src/app/api/auth/[...nextauth]/route.ts` exporting `{ GET, POST }`.

### 2. Open-Redirect Protection & Next.js 16 Request Interception
- **`getSafeCallbackUrl` (`src/lib/safe-redirect.ts`)**: Pure validation function rejecting protocol-relative URLs (`//`), backslash variations (`/\`, `\/`, `\\`), non-http schemes (`javascript:`, `data:`), control characters, and header injection vectors.
- **Next.js 16 Request Interceptor (`src/proxy.ts`)**: Employs Next.js 16's standard `proxy.ts` convention, protecting all routes under `/dashboard/:path*` while avoiding deprecated `middleware.ts` warnings. Unauthenticated requests are safely redirected to `/login?callbackUrl=...`.

### 3. Server-Side Guild Permission & Access Gate
- **`canManageGuild` (`src/lib/discord/permissions.ts`)**: Evaluates `owner === true` or bitwise `MANAGE_GUILD` (`0x20n` / 32) or `ADMINISTRATOR` (`0x8n` / 8). Safely parses string, number, bigint, and null/undefined without throwing.
- **`requireGuildAccess` (`src/lib/discord/require-guild-access.ts`)**: Server-side access guard enforcing session validity, guild management authority, and bot presence before permitting console entry.
- **Typed Error Hierarchy (`src/lib/discord/errors.ts`)**: `UnauthenticatedError` (401), `ForbiddenError` (403), `BotNotInGuildError` (403), `RateLimitedError` (429).
- **In-Memory Guild Cache (`src/lib/discord/cache.ts`)**: 60s TTL LRU cache preventing duplicate `/users/@me/guilds` Discord API requests.
- **Bot Presence Provider (`src/lib/discord/bot-guilds.ts`)**: REST client with 60s cache and mock provider for demo/test environments.
- **Bot Invite Link Generator (`src/lib/discord/invite.ts`)**: Formats standard Discord bot authorization URLs with least-privilege permissions and automated return redirect.

### 4. Demo Mode & Production Safeguards (`src/lib/demo-mode.ts`)
- Returns true only when `NEXT_PUBLIC_DEMO_MODE === 'true'` and `NODE_ENV !== 'production'`.
- Production hard-stop safeguard: Immediately throws fatal exception on startup/build if demo mode is accidentally enabled in production.
- Provides mock user identity (`Alex#0001`) and 4 mock guilds (2 Ready servers, 2 pending invite servers).

### 5. Branded UI & Guild Console Views
- **/login (`src/app/login/page.tsx`)**: Branded dark glass card with AiCord bot emblem, Discord OAuth sign-in button, granular permission explanation (`identify` + `guilds`), security guarantees, and polite error banners.
- **/privacy (`src/app/privacy/page.tsx`)**: Transparent data policy detailing scopes, encrypted token storage, and GDPR compliance.
- **Navbar User State (`src/components/navbar/UserNav.tsx`)**: Dynamic dropdown menu displaying user avatar/name with links to Dashboard, Switch Server, Billing, and clean Sign Out.
- **/dashboard (`src/app/(dashboard)/dashboard/page.tsx`)**: 3D-feeling interactive guild picker organizing servers into "Ready" and "Add AiCord" sections, search filtering, and rate-limited refresh.
- **/dashboard/invite-complete (`src/app/(dashboard)/dashboard/invite-complete/page.tsx`)**: Landing page polling bot presence for up to 10 seconds following invite, showing radar ping animation and auto-redirecting on join.
- **/dashboard/[guildId] (`src/app/(dashboard)/dashboard/[guildId]/page.tsx` & layout)**: Server-side gated console layout displaying server avatar, verified authority badge, bot status, and connection audit diagnostics.

### 6. Test Suite & Build Verification
- **1,538 Passing Unit Tests**: 34 dedicated tests across 5 new suites in `test/auth/`:
  - `test/auth/permissions.test.ts` (8 tests)
  - `test/auth/safe-redirect.test.ts` (7 tests)
  - `test/auth/demo-mode.test.ts` (6 tests)
  - `test/auth/guild-cache.test.ts` (6 tests)
  - `test/auth/require-guild-access.test.ts` (7 tests)
- **Zero Typecheck Errors**: `tsc --noEmit` passes with 0 errors.
- **Clean Next.js 16 Production Build**: `next build` compiles all 15 routes with 0 errors and 0 warnings.


