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
| P23 | Levels | todo | |
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
| P28 | Economy + voice tools | todo | |
| P32 | Dev-community tools | todo | |
| P33 | Gaming extras | done | Interactive Games Suite: modular engines for Trivia (55 questions across tech, gaming, anime, science, general with shuffled choices and 4-button ActionRow), Blackjack (standard 52-card deck, dynamic Aces, dealer hits on soft 17 and stands on hard 17+, visual Unicode cards, Hit/Stand/Double Down buttons), Rock Paper Scissors (3x3 evaluation matrix, instant and interactive button play), 3-Reel Slots (weighted spin simulation, 25x/15x/10x/5x/2x paytable, ASCII retro cabinet), Coinflip (streak counter with flame tiers, optional wager doubling). Registered /trivia, /blackjack, /rps, /coinflip, /slots under category 'fun' with autocomplete and rate limiting. Webhook component routing with ephemeral security rejections for unauthorized users. 207 unit tests passing (81 new games tests). 0 typecheck errors, 0 lint warnings. |
| P34 | Translation + i18n | todo | |
| P29 | Public API + webhooks | todo | |
| P37 | Trust network | todo | |
| P38 | Paid roles | todo | |
