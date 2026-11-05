# Progress

| Phase | Name | Status | Notes / known issues |
|---|---|---|---|
| P1 | Setup + /build | done | Setup complete: Next.js App Router, Discord interaction endpoint with Ed25519 signature verification, MongoDB Atlas connection, /build command with AI blueprint generation (Gemini), interactive preview tree embed, confirm, apply, and rollback logic. Verified clean `pnpm tsc --noEmit`, clean `pnpm lint`, clean `pnpm build`, and registered commands script. |
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
| P33 | Gaming extras | todo | |
| P34 | Translation + i18n | todo | |
| P29 | Public API + webhooks | todo | |
| P37 | Trust network | todo | |
| P38 | Paid roles | todo | |
