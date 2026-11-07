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
| P6 | Worker | todo | |
| P7 | Plans + billing | todo | |
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

## Infrastructure & Serverless Stability Notes

### Vercel Serverless Interaction Lifecycle & Webhook Auth Fix
- **Next.js `after()` Lifecycle**: Resolved serverless function early termination issues on Vercel where fire-and-forget background promises were interrupted immediately after returning the initial deferred response (`NextResponse.json(...)`). Routed asynchronous command execution (`handleCommandInteraction`), interactive component processing (`handleComponentAsync`), and modal submissions (`handleBuildModalSubmit`) through Next.js App Router's `after()` callback to guarantee the lambda execution context stays active until webhook updates finish.
- **Webhook Patch Authentication (`{ auth: false }`)**: Resolved Discord REST 401 Unauthorized errors during interaction response edits and follow-ups. Discord interaction webhook endpoints (`/webhooks/:application_id/:interaction_token/messages/@original`) are authenticated by the interaction token itself and reject `Bot <token>` Authorization headers. Explicitly passed `{ auth: false }` to `@discordjs/rest` PATCH, POST, and DELETE calls across `editInteractionResponse`, `sendFollowUp`, `deleteInteractionResponse`, and `deleteFollowupMessage`.
- **Lambda Timeout Configuration (`maxDuration = 60`)**: Exported `export const maxDuration = 60;` in `src/app/api/discord/interactions/route.ts` to provide up to 60 seconds of execution headroom on Vercel Serverless Functions, comfortably accommodating multi-step operations such as AI blueprint generation, database synchronization, and Discord API creation calls.
- **Resilient App ID & Bot Token Resolution**: Implemented prioritized fallback resolution in `resolveApplicationId(appId)` (`interaction.application_id` → `process.env.DISCORD_APP_ID` → `process.env.DISCORD_CLIENT_ID` → safe `env.DISCORD_APP_ID` try/catch) and `resolveBotToken()` (`env.DISCORD_BOT_TOKEN` → `process.env.DISCORD_BOT_TOKEN`) so webhook routing and REST clients never fail from missing or unvalidated environment schema wrappers during cold starts.

