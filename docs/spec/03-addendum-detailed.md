# Discord Architect - Addendum 3: Detailed Behavior Spec

## A. DISCORD HARD LIMITS (centralize in src/lib/limits.ts)
- Interaction: initial response within 3s; token valid 15 min for follow-ups/edits; autocomplete max 25 choices; ephemeral flag = 64.
- Message: content 2000 chars; up to 10 embeds; total embed text 6000 chars; embed title 256, description 4096, 25 fields, field name 256, field value 1024, footer 2048, author name 256.
- Components: 5 action rows; 5 buttons per row; button label 80, custom_id 100; select menu up to 25 options.
- Modal: title 45, up to 5 inputs, input label 45, placeholder 100, value up to 4000.
- Commands: name 32 chars lowercase, description 100, 25 options, 100 global chat-input commands.
- Roles 250, channels 500 per guild, channel/role names 100, topic 1024 (forum 4096), category max 50 children.
- Timeout max 28 days. Bulk delete 2-100 messages, none older than 14 days.
- Write a splitter utility that auto-paginates anything exceeding these (embeds -> pages with buttons).

## B. CORE ENGINES (build in Phase 22, reuse everywhere)
1. Template/variable engine: {user}, {user.mention}, {user.name}, {user.id}, {user.avatar}, {server}, {server.members}, {channel}, {level}, {xp}, {rank}, {age}, {date}, {time}, {timestamp:R}, {inviter}, {ticket.number}, {random:a|b|c}, {if:role=ID}...{/if}. Safe parser (no eval), max output length enforced.
2. Time engine: store all timestamps in UTC, per-user and per-guild IANA timezones, DST-safe via date-fns-tz, relative Discord timestamps in messages.
3. Permission engine: one function canActOn(invoker, target, action) checking Discord permission bits, role hierarchy, owner exceptions, and plan gating. Returns a typed reason code mapped to friendly messages.
4. Job queue (MongoDB): Job { type, guildId, runAt, payload, attempts, lockedUntil, status }. Cron claims jobs atomically, retries with exponential backoff (max 5), dead-letter state.
5. Rate limiter: bucketed queue per route+major parameter reading X-RateLimit-Remaining/Reset-After; global 50 req/s cap; 429 handling.
6. Cache layer: in-memory LRU + Upstash Redis optional; cached guild config with 60s TTL.
7. Audit trail for every config change: who, before/after diff, rollback button.

## C. LEVELS & XP (exact rules)
- XP per message: random 15-25 (configurable range), per-user cooldown 60s, minimum 3 non-whitespace characters, ignore commands, bots, duplicates.
- Level curve default (MEE6-compatible): xp to go from level L to L+1 = 5*L^2 + 50*L + 100.
- Voice XP: 10 XP per full minute in a VC with at least 2 non-bot humans, not muted/deafened/AFK channel, cap 600 XP/hour.
- Multipliers: per role (additive or highest-wins), per channel, global event multipliers with start/end time.
- Level-up message: channel/same channel/DM/off; anti-spam so multiple level-ups produce one message.
- Rewards: role at level, stack or replace mode, remove-on-lose option, retroactive grant command (/level sync).
- Prestige (Pro): reset at max level for a prestige tier with badge + permanent small multiplier.
- Leaderboards: all-time, weekly, monthly (reset via cron), voice-only, message-only; pagination 10 per page.
- Rank card: avatar, username, level, rank #, progress bar, XP numbers, custom background/color (plan-gated), cached image for 60s, fallback text embed if render fails.
- Anti-abuse: detect XP farming (identical messages, bursts).

## D. BIRTHDAYS (exact rules)
- Input validation: real calendar dates (Feb 29 handled: celebrate on Feb 28 in non-leap years), age must be 13+ if year given; reject future dates.
- Announcement time: guild-configured local time (default 09:00 in user's timezone, else guild timezone, else UTC). Cron every 15 minutes scans only birthdays whose local time window matches.
- Birthday role granted at announcement, removed after 24h via the job queue; recover if the bot was offline (catch-up window 48h).
- Commands: /birthday set|remove|view|upcoming (next 30 days)|month <n>|list; admin: /birthday admin set|remove <user>, import CSV.

## E. WELCOME / VERIFICATION / ONBOARDING
- Welcome message triggers on member add; image card with avatar, name, member number; DM message separate; goodbye message.
- Verification modes: button click; captcha (random 5-char image or math question via modal, 3 attempts, 10-minute timeout); account-age gate; "answer rules question" gate.
- Auto-nickname formatting, strip hoisting characters option, rename inappropriate nicknames.

## F. MODMAIL (new)
- Member DMs the bot -> creates a private thread/channel in the mod category; staff replies relay to member's DM.
- Commands: /modmail close|reply|note|block|unblock|snooze|transfer.
- Works through the gateway worker (DM events).

## G. STAFF APPLICATIONS (new)
- Admin builds application forms: sections of questions (short, paragraph, multiple choice, number), each section max 5 questions per modal step.
- Submissions post to a review channel with Accept / Deny / Interview / Request Info buttons.

## H. SCHEDULED EVENTS & ANNOUNCEMENTS (new)
- /event create (uses Discord Scheduled Events API), RSVP button + reminder DMs at 24h/1h/10min, recurring events.

## I. REPUTATION & RECOGNITION (new)
- /rep give <user> [reason]: 1 per user per 24h, cannot self-rep, min account/server age, rep leaderboard, rep roles.
- Anti-abuse: reciprocal rep pair detection.

## J. STARBOARD / SUGGESTIONS / POLLS / GIVEAWAYS (exact rules)
- Starboard: multiple boards, threshold default 3, count unique users excluding author, ignore NSFW channels, update star count live, hysteresis for removal.
- Suggestions: modal or channel-based submit, anonymous option, voting up/down buttons (one vote per user, change allowed), staff statuses: Approved/Considering/Implemented/Denied.
- Polls: single/multiple choice, 2-10 options, duration 1 minute to 30 days, anonymous or public tallies, role-restricted voting.
- Giveaways: entry by button, requirements (role, level, account age, server age, invites), bonus entries per role, multiple winners, reroll without repeating prior winners, winner claim window (default 48h) with auto-reroll if unclaimed.

## K. ECONOMY (exact rules)
- Currency name/emoji configurable; /daily 100-200 coins with streak bonus (+5%/day, cap +50%, streak breaks after 48h), /work cooldown 1h.
- /pay with 2% optional tax, daily transfer limit, bank vs wallet, interest option.
- Shop with stock, role items, expirable items, refunds, transaction ledger (immutable).
- Anti-dupe via atomic MongoDB updates with $inc and balance >= amount conditions.

## L. VOICE TOOLS
- Join-to-create: creates a channel "{username}'s room", owner panel buttons (rename, limit, lock/unlock, hide/unhide, kick, invite, transfer, claim), delete when empty after 30s grace.
- Voice stats channels, voice logs, voice roles.

## M. FORUM, THREAD & CHANNEL AUTOMATION
- Auto-thread on new message in chosen channels, forum post templates and required tags, "mark solved" button.
- Stats/counter channels refreshed every 10 minutes (Discord limits channel-name edits to 2 per 10 minutes, so queue and coalesce updates).
- Auto-delete in channels (TTL 10s to 7 days, pinned excluded), channel slowmode schedules.

## N. PUBLIC API & DEVELOPER FEATURES (Premium)
- REST API with per-guild API keys (hashed at rest, scoped, revocable, rate-limited 60 req/min).
- Outgoing webhooks for events with HMAC signature header, retries with backoff.

## O. WHITE-LABEL (Premium, feature flag, off by default)
- Guild supplies its own bot token and app ID. Store tokens encrypted (AES-256-GCM).

## P. QUALITY BAR FOR EVERY FEATURE
- Each module ships with: Zod schema, Mongoose model with indexes, command definitions, handlers, dashboard page, docs page content, plan limits entry, audit logging, i18n strings, unit tests for the core logic, and an integration test proving guild data isolation.
- Every user-facing failure has an actionable message.
- Accessibility: embeds readable without color, buttons labeled with text, dashboard keyboard navigable.
