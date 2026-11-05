# Discord Architect - Addendum 4: Extra Modules & Distribution

## 1. TEMPLATE MARKETPLACE

### Overview
A public marketplace where server owners and developers can publish AI-generated server blueprints for others to browse, preview, and apply with one click.

### Publishing Templates
- Any user with Manage Server permission can publish a blueprint via `/template publish <name> [description] [tags]`.
- Templates can be sourced from:
  - A previously run `/build` result (stored snapshot).
  - A current guild structure via `/build-from-server` export.
  - A manually assembled blueprint via the dashboard Template Editor.
- Required publish fields: name (3-80 chars), short description (10-280 chars), category (Gaming, Dev, Study, Creator, Business, Community, Other), at least one tag from a curated tag list.
- Optional: banner image upload (max 2 MB, converted to WebP), long description (Markdown, max 2000 chars), preview screenshots.
- Published templates go into a pending queue; auto-flagged by a content filter (prompt injection, dangerous permission patterns, banned words); approved instantly unless flagged.
- Premium templates (Pro/Premium plan) can be set to private (guild-only) or unlisted (link-only).

### Browsing & Discovery
- Dashboard page `/dashboard/marketplace`: grid of cards with banner, name, author tag, category badge, star rating, apply count, tags.
- Filters: category, tags (multi-select), minimum rating, sort by (Newest, Most Applied, Top Rated, Trending this week).
- Full-text search across name, description, and tags (MongoDB Atlas Search or simple regex fallback).
- Featured section: hand-curated or algorithmically promoted templates surfaced on the landing page.
- Slash command `/template browse [category] [tag]` returns a paginated embed list; `/template info <id>` shows full detail.

### One-Click Apply
- Dashboard "Apply" button or `/template apply <id>` command.
- Shows a PREVIEW embed (category/channel tree, role list, permission summary) with a warning diff if the guild is not empty.
- Confirm button triggers the same step-by-step apply engine as `/build`: roles → categories → channels → welcome content. Live progress updates.
- Optionally merge (preserve existing channels) or replace (wipe and rebuild, requires explicit double-confirm).
- After apply, stores an `AppliedTemplate` record `{ guildId, templateId, appliedAt, appliedBy, snapshotId }` for rollback.

### Fork & AI Remix
- "Fork" button clones a template into the user's private workspace.
- "AI Remix" button opens a modal: `Describe how you want to modify this template`. Gemini receives the base blueprint JSON + the user's delta prompt → returns a new patched blueprint. Standard preview/confirm flow before saving or applying.
- Forks credit the original template with a "Forked from" link.

### Ratings & Reviews
- After applying and spending at least 10 minutes in the guild, the applying user may rate 1-5 stars with an optional text review (max 280 chars).
- Ratings: one per user per template, editable, hidden until template has ≥ 3 ratings (then shows average + count).
- Author can reply to reviews (one reply per review). Flag/report button for abusive reviews.
- Bayesian average used for ranking: `(v/(v+m)) * R + (m/(v+m)) * C` where `m = 10` (minimum votes threshold), `C` is global mean.

### Data Models
`Template { id, authorUserId, authorGuildId, name, description, longDescription, category, tags[], blueprintJson, bannerUrl, screenshotUrls[], isPublished, isPrivate, isUnlisted, applyCount, ratingSum, ratingCount, bayesianRating, createdAt, updatedAt }`, `TemplateRating { templateId, userId, stars, text, authorReply, createdAt }`, `AppliedTemplate { guildId, templateId, appliedAt, appliedBy, snapshotId }`.

---

## 2. SERVER SETUP WIZARD & HEALTH SCORE

### Setup Wizard (on Bot Join)
- Triggered automatically when the bot joins a new guild (gateway GUILD_CREATE event processed by the worker).
- If the guild owner is reachable (DM open), bot sends an interactive DM wizard. Alternatively, the dashboard shows a "Complete Setup" banner until all core modules are configured.
- Wizard steps (each step is a Discord embed with buttons/select menus or a modal):
  1. **Welcome** – choose language and time zone for the guild.
  2. **Core Channels** – select or create mod-log, welcome, rules, general channels.
  3. **Roles** – confirm or auto-generate Staff, Member, Muted roles.
  4. **Moderation** – enable automod presets (strict / standard / relaxed).
  5. **Modules** – toggle on/off: Levels, Birthdays, Economy, Tickets, Social feeds.
  6. **Summary** – show what will be applied; "Finish Setup" applies all selected config in one transaction.
- Wizard state stored in `SetupSession { guildId, step, answers, expiresAt (24h) }`.
- `/setup restart` to re-run wizard; `/setup skip` to dismiss.

### Health Score (0–100)
- Computed on demand (`/health`) or shown on the dashboard Overview page.
- Runs a series of weighted checks against the current guild state via Discord REST:

| Check | Weight | Pass Condition |
|-------|--------|----------------|
| No @everyone Administrator | 15 | @everyone role has no Admin bit |
| Mod-log channel configured | 10 | LogConfig.modChannel set |
| At least one staff role | 8 | At least 1 role with Kick/Ban bits |
| Welcome channel configured | 7 | WelcomeConfig present |
| Rules channel or rules content | 7 | rulesChannelId set or rules embed posted |
| Automod enabled | 10 | ≥ 1 AutomodRule enabled |
| No orphaned channels (no access) | 5 | All channels reachable by at least 1 role |
| Role count under 80 | 5 | roles.length < 80 |
| Channel count under 200 | 5 | channels.length < 200 |
| Bot has only needed permissions | 8 | No unused permissions granted |
| Verification level ≥ LOW | 5 | guild.verification_level ≥ 1 |
| Backups configured (Pro+) | 5 | At least 1 backup exists |
| 2FA for moderation enabled | 6 | guild.mfa_level = 1 |

- Result embed: score badge (🟢 80+, 🟡 50–79, 🔴 < 50), checklist of passed/failed items with actionable fix buttons.
- Score is recalculated after any config change and cached for 5 minutes.
- Dashboard health widget with trend graph (daily snapshots stored for 30 days).

### Data Models
`SetupSession { guildId, step, answers, expiresAt }`, `HealthSnapshot { guildId, score, checks[], recordedAt }`.

---

## 3. CROSS-SERVER TRUST NETWORK (Opt-In)

### Overview
An opt-in cooperative network allowing guilds to share moderation intelligence. All participation is explicit: guild owners must enable it per server.

### Shared Ban List
- Guilds opt in via `/trust-network join` (requires Administrator).
- When a guild bans a user with reason, the event (userId, reason, moderatorGuildId, timestamp) is broadcast to all network-member guilds.
- Each receiving guild's config controls whether shared bans are: (a) auto-applied, (b) flagged for review, or (c) only visible in dashboard.
- Shared bans are tagged as `source: trust-network` in the mod log. Guild can override/unban locally at any time.
- A "trust threshold" per guild: auto-apply only if ≥ N member guilds have banned the same user (default N = 3).

### Alt-Account Heuristics
- When a user joins, the worker checks: account age < 7 days, shared username/avatar hash with a known banned user, join velocity (same IP geolocation cluster not stored – only join-time correlation).
- If heuristic score exceeds configurable threshold, action: flag in mod-log, DM the mod team, optionally kick pending verification.
- **Privacy**: no raw PII is stored; only Discord user IDs and hashed avatars are shared across network.

### Scam & Phishing Intelligence
- Centralized `PhishingEntry { domain, pattern, severity, reportedBy, confirmedAt }` list maintained by the bot operator.
- Worker and automod rule check outgoing URLs against this list in real time.
- Guilds can submit false-positive reports; operator reviews via admin panel.
- Feed updated hourly; local in-memory cache with 5-minute TTL.

### Governance & Privacy
- Opt-out via `/trust-network leave` immediately removes the guild's data from shared feeds.
- Shared data: only Discord user IDs and ban reasons. No message content, no server names shared without guild's explicit consent.
- Data retention: shared ban entries expire after 2 years unless re-confirmed.
- Network is federated per cluster (by default one cluster = one bot instance). Multi-cluster federation via signed webhook calls between operators (Premium feature).

### Data Models
`TrustNetworkMembership { guildId, joinedAt, autoApply, threshold }`, `SharedBan { userId, reason, sourceGuildId, receivedByGuildIds[], confirmedCount, expiresAt }`, `PhishingEntry { domain, pattern, severity, confirmedAt }`.

---

## 4. COMMUNITY MONETIZATION FOR SERVER OWNERS

### Overview
Server owners can monetize their communities directly through Discord Architect by setting up paid role tiers, generating a hosted checkout page, and automating role grant/removal on payment events.

### Paid Role Tiers
- Dashboard page: **Monetization → Tiers**.
- Admin creates tiers: `{ name, description, roleId, price, currency (USD/EUR/GBP), billingPeriod (monthly/yearly/one-time), trialDays, benefits[] }`.
- Up to 3 tiers on Pro plan, up to 10 on Premium.
- Each tier can be linked to multiple Discord roles (grant all on purchase).

### Checkout Page
- Each guild gets a hosted public page at `https://discordarchitect.app/servers/<guild-id>/join` (or custom subdomain for Premium).
- Page shows: server banner/icon, server description, tier cards with benefit lists and prices, Discord OAuth "Connect Account" button.
- Payment processed via the same billing provider abstraction (Stripe or Lemon Squeezy) as the bot's own plans, but with the guild owner as the merchant (connected account / marketplace flow).
- After payment, the buyer's Discord account (retrieved via OAuth) is granted the purchased role(s) via REST API.
- Confirmation email sent by the payment provider; bot sends a DM to the buyer with their role and welcome info.

### Role Lifecycle
- **On payment success**: grant role(s), create `GuildSubscriber` record, log to mod-log.
- **On renewal**: no-op if role already present; re-grant if previously revoked.
- **On payment failure**: 3-day grace period; DM warning to subscriber; role retained during grace.
- **On cancellation / expiry**: remove role(s) at period end; DM subscriber; store record for re-join.
- **On refund**: immediately revoke role(s).
- All webhook events idempotent via `ProcessedWebhookEvent` table (deduplicate by event ID).

### Owner Payouts & Analytics
- Dashboard analytics: MRR, subscriber count per tier, churn rate, revenue trend chart (monthly).
- Payouts handled by the payment provider's standard payout schedule (direct to owner's bank/account).
- Bot operator takes a platform fee (configurable, default 5%) via application fee on connected accounts.

### Data Models
`GuildTier { guildId, name, description, roleIds[], price, currency, billingPeriod, trialDays, benefits[], isActive }`, `GuildSubscriber { guildId, tierId, userId, discordUserId, status, currentPeriodEnd, cancelAtPeriodEnd, providerSubscriptionId }`, `MonetizationConfig { guildId, stripeAccountId, publicPageEnabled, customDomain, platformFeePercent }`.

---

## 5. DEVELOPER-COMMUNITY TOOLS

### GitHub Integration
- `/github link <repo>` – connect a GitHub repo to a channel; requires a GitHub App installation (or personal access token for simple setups).
- Notifications posted to the configured channel: new issues, pull requests, pushes, releases, CI status checks, branch protection events.
- Embed format: event type badge, repo name, actor, title/description truncated to 300 chars, link button.
- `/github unlink`, `/github status` to manage.
- Release watcher: announce new releases in a designated releases channel with changelog excerpt.

### Help-Forum Workflow
- Designates a Discord Forum channel as a help forum.
- `/helpforum setup <channel> <solvedTag> <staffRole>` configures it.
- When a post is created, bot reacts with 🆕, posts a "Welcome to your help thread" embed with tips.
- `/solved` (or clicking "Mark as Solved" button in post) adds the solved tag, closes the post, posts a summary.
- AI-assisted: on post creation, searches the guild's knowledge base for similar solved threads and posts top 3 suggestions as an ephemeral reply to the author.
- Auto-close stale posts after configurable days with a warning message first.

### Code Formatting Helper
- Automod-style rule: when a user posts unformatted code (heuristic: contains `\n` and code keywords but no triple-backtick block), bot sends an ephemeral prompt with a "Re-format for me" button.
- "Re-format for me" opens a modal pre-filled with the message text; user corrects the language tag and submits; bot deletes the original message and reposts it formatted (with a note "reformatted by Discord Architect on behalf of @user").
- `/codeformat <language> <code>` as an explicit command for quick formatting.
- Configurable: enabled/disabled per channel, language detection confidence threshold, opt-out for specific roles.

### Status & Uptime Monitor
- Admins register services: `/monitor add <name> <url> [interval_minutes]` (HTTP HEAD/GET check, interval 1–60 min, default 5 min).
- Vercel Cron runs checks; records latency + status code in `UptimeRecord`.
- Posts to a configured status channel on status change (up → down, down → up) with ping of a configured role.
- Dashboard uptime page: 90-day uptime grid (green/red squares per day), response time chart, incident history.
- Slash command `/monitor status [name]` for quick check.
- Plan limits: Free 1 monitor, Pro 10, Premium 50.

### Package & News Feeds
- Subscribe a channel to: npm package releases, PyPI releases, GitHub release RSS, Hacker News "best of", custom RSS/Atom.
- Uses the existing FeedSubscription model; type extended with `packageRegistry` and `hackernews` feed types.
- For package feeds: query the registry API on cron, diff versions, post embed with changelog link on new release.

### Data Models
`GitHubIntegration { guildId, channelId, repoFullName, installationId, events[], releasesChannelId }`, `HelpForumConfig { guildId, channelId, solvedTagId, staffRoleId, autoCloseDays, kbSearchEnabled }`, `MonitorTarget { guildId, name, url, intervalMinutes, lastStatus, lastCheckedAt, notifyChannelId, notifyRoleId }`, `UptimeRecord { monitorId, checkedAt, statusCode, latencyMs, up }`.

---

## 6. GAMING & COMMUNITY EXTRAS

### Free-Games Alerts
- Polls the Epic Games Store free games API (and optionally GOG, Steam free weekends via community-maintained endpoints) on a cron every 4 hours.
- Posts new free games to the configured channel: embed with game banner image, title, description snippet, claim link, end date countdown.
- `/freegames channel <#channel>` to configure; `/freegames list` to see current free games.
- Deduplication: store seen offer IDs per guild to avoid reposting.

### Game Server Status
- `/gameserver add <name> <ip> <port> <game_type>` registers a game server.
- Supported game types: Minecraft (uses mc-server-util protocol), Source Engine games (A2S_INFO), FiveM, generic TCP ping.
- Vercel Cron checks status every 5 minutes; posts to status channel on change; updates a persistent "server status" embed (edits in place).
- Dashboard game servers page: live status, player count graph, peak hours heatmap.

### Looking for Group (LFG)
- `/lfg post <game> <description> [party_size] [platform] [when]` creates an LFG embed with a "Join" button.
- Join button adds joiner's name to the embed and optionally DMs the poster.
- LFG posts auto-expire after 24h (or custom duration); poster can `/lfg close` early.
- Dashboard LFG page shows active listings with join management.
- LFG role auto-assign: users who post LFG get a temporary LFG role for the duration.

### Tournament Brackets
- `/tournament create <name> <game> <max_teams> [format: single/double/round-robin]` starts a tournament.
- Teams sign up via "Register" button; team captain sets team name and roster (up to 10 members).
- Admin `/tournament start` seeds teams (random or by registration order) and generates bracket embed.
- Bracket image rendered as text-art or PNG via a simple bracket rendering utility.
- `/tournament result <match_id> <winner>` advances the bracket; bracket embed updates live.
- Notifications: DM all participants when their match is ready.

### Mini-Games
- `/trivia [category] [difficulty]` – 10-question trivia using Open Trivia Database API; multiple-choice buttons; 15s timer per question; XP reward on win.
- `/scramble` – unscramble a word; first to type answer wins XP.
- `/mathrace` – math problem race; button submit with modal.
- `/slots` – economy-integrated slot machine (optional, disable-able).
- All mini-games: per-channel enable/disable, cooldown config, XP rewards configurable, channel whitelist.

### Data Models
`FreeGameSeen { guildId, offerId, seenAt }`, `GameServer { guildId, name, ip, port, gameType, notifyChannelId, lastStatus, lastPlayerCount }`, `LFGPost { guildId, channelId, messageId, authorId, game, description, partySize, platform, joiners[], expiresAt }`, `Tournament { guildId, name, game, format, maxTeams, teams[], matches[], status, winnerId }`, `TournamentTeam { tournamentId, name, captainId, memberIds[] }`.

---

## 7. COMMUNICATION BRIDGES & LANGUAGE

### Auto-Translate Channels
- `/translate channel <#channel> <target_language>` enables auto-translation for all messages in a channel.
- On new message (via worker): detect source language (LibreTranslate or DeepL free tier); if not target language, post translated version as a bot reply or thread.
- Translation modes: (a) reply below original, (b) edit original with translation appended (requires Manage Messages), (c) post to a parallel mirror channel.
- `/translate message <message_id> <target_language>` for on-demand single-message translation.
- Language detection suppressed for messages shorter than 5 chars or 100% emoji/mentions.
- Plan limits: Free 1 auto-translate channel, Pro 5, Premium 20.

### Cross-Channel Announcement Fan-Out
- `/fanout setup <source_channel>` designates a source channel.
- `/fanout add-target <#channel> [guild_id]` adds a target (within guild or cross-guild if both guilds share trust network).
- When an admin posts or publishes in the source channel, bot relays the message (embeds, attachments included) to all targets.
- Cross-guild fan-out uses the bot's REST API in the target guild; target guild must have opted in and granted the source guild permission via `/fanout trust <source_guild_id>`.
- Deduplication: `FanoutRecord { messageId, sourceGuildId, targetGuildId, targetMessageId }` prevents double-posting on webhook retries.

### Dashboard Languages
The web dashboard is fully internationalized (i18n via `next-intl`). Supported locale codes:

| Language | Locale Code | RTL? |
|----------|-------------|------|
| English | `en` | No |
| Urdu | `ur` | Yes |
| Arabic | `ar` | Yes |
| Hindi | `hi` | No |
| Spanish | `es` | No |
| Portuguese | `pt` | No |
| French | `fr` | No |
| German | `de` | No |

- RTL languages automatically flip the dashboard layout via `dir="rtl"` on `<html>`.
- Translation files stored in `/messages/<locale>.json`; missing keys fall back to `en`.
- Language auto-detected from browser `Accept-Language` header on first visit; user can override in profile settings (stored in `UserPreference`).
- Slash command responses use the guild-configured language (stored in `GuildConfig.locale`).

### Data Models
`TranslateChannelConfig { guildId, channelId, targetLanguage, mode }`, `FanoutConfig { guildId, sourceChannelId, targets[{ channelId, guildId }] }`, `FanoutRecord { messageId, sourceGuildId, targetGuildId, targetMessageId }`, `UserPreference { userId, locale, timezone }`.

---

## 8. TEAM, ACCESS & RELIABILITY

### Dashboard Team Access
- Guild owner can invite team members to the dashboard via `/dashboard invite <@user> <role>`.
- Dashboard roles (separate from Discord roles):
  - **Owner** – full access, billing, delete server config.
  - **Admin** – all settings except billing and team management.
  - **Moderator** – mod log, ticket management, member lookup; read-only elsewhere.
  - **Viewer** – read-only access to all dashboard pages.
- Team members must log in with Discord OAuth and appear in the guild's member list.
- Invitation stored as `DashboardInvite { guildId, invitedUserId, role, invitedBy, expiresAt (7 days) }`.
- Revoke access: `/dashboard revoke <@user>` or via dashboard Team page.

### Guild-Level Config Backups
- Beyond the server structure backups (spec §01), config backups capture the full GuildConfig document state: all module configs, automod rules, ticket panels, role panels, custom commands, embed templates, etc.
- Auto-backup on every config change (last 10 versions kept, plan-gated); manual backup via `/config backup create`.
- Restore: `/config backup restore <backup_id>` with a diff preview and Confirm button.
- Dashboard Config → Backups page: table of backups with timestamps, trigger (auto/manual), size, restore and delete buttons.

### Data Export
- Dashboard Settings → Export: generates a JSON export of all guild data (configs, mod cases, ticket transcripts, XP table, etc.) and emails a download link to the guild owner.
- Export is queued as a background job (can take minutes for large guilds); owner receives a DM when ready.
- Export complies with GDPR data portability obligations (user data included if owner requests it).
- Data purge: `/config purge-data` deletes all guild data from MongoDB after a 30-day grace period with a confirmation email.

### Incident System
- When a critical error occurs (unhandled exception in a command, billing webhook failure, etc.), the system creates an `Incident` record and:
  1. Posts an alert to the guild's configured admin-alert channel (if set).
  2. Emails the guild owner (if email provided in settings).
  3. Reports to Sentry with guild context.
- Dashboard Incidents page: list of incidents with status (open, investigating, resolved), timeline, and resolution notes.
- Bot operator sees all incidents across all guilds in the super-admin panel.

### Feedback & Feature Voting
- `/feedback <suggestion>` submits feedback; stored in `FeedbackEntry` and posted to an internal feedback board.
- Dashboard Feedback page (guild members can access if enabled): list of suggestions with upvote button (one vote per user), status tags (Under Review, Planned, In Progress, Done, Declined).
- Monthly digest email to the guild owner summarizing top-voted feedback items.
- Public roadmap page (optional, toggleable per guild) at `/servers/<guild-id>/roadmap`.

### Data Models
`DashboardMember { guildId, userId, dashboardRole, invitedBy, addedAt }`, `DashboardInvite { guildId, invitedUserId, role, invitedBy, expiresAt }`, `ConfigBackup { guildId, trigger, configSnapshot, createdAt }`, `DataExportJob { guildId, requestedBy, status, downloadUrl, expiresAt }`, `Incident { guildId, type, message, status, resolvedAt, sentryId }`, `FeedbackEntry { guildId, authorId, text, upvotes, status, createdAt }`.

---

## 9. GROWTH & DISTRIBUTION

### Referral Program
- Each guild gets a unique referral link: `https://discordarchitect.app/invite?ref=<guild_id>`.
- When a new guild adds the bot via this link, the referring guild earns referral credits.
- Credits redeem for: extra AI credits (100 credits per referral), plan upgrade discounts (10% off for 1 month per 5 referrals), or cosmetic features (custom bot status text).
- Dashboard Growth → Referrals page: total referrals, earned credits, redemption history.
- `/referral link` to get the guild's referral link; `/referral stats` for summary.

### Bot-List Integrations
- Bot is listed on: top.gg, discordbotlist.com, discords.gg, bots.ondiscord.xyz.
- Vercel API route `/api/botlist/vote` receives vote webhooks (each provider's format, verified by their auth token).
- On vote: award voter with configurable per-guild rewards (bonus XP, economy coins, special role for 12h).
- Auto-posting monthly bot stats (guild count, user count) to each bot list API via a cron job.
- Dashboard Growth → Bot Lists page: vote count per list, total votes this month, vote rewards config.

### User-Level Premium
- In addition to guild-level plans, individual users can purchase a "Discord Architect Pro User" subscription.
- Pro User benefits (apply across all guilds they're in): custom rank card themes, priority AI response speed, extended audit log access, early access to beta features, custom bot interaction style (formal/casual/fun).
- Purchased via the bot's landing page or `/premium user upgrade` command (opens checkout in DM).
- Stored as `UserSubscription { userId, plan, status, currentPeriodEnd }`.

### Public Server Pages
- Each guild can opt in to a public page at `https://discordarchitect.app/servers/<guild-id>`.
- Page shows: server name, icon, banner, member count, description, feature highlights (which Discord Architect modules are active), invite button.
- SEO-optimized (server-side rendered, Open Graph meta tags, JSON-LD structured data).
- Guild owner controls: page enabled/disabled, description (Markdown, 2000 chars max), featured channels list, featured roles list, hide member count toggle.
- Public pages are indexed by search engines by default; guild can set `noindex` via settings.

### Data Models
`ReferralRecord { referringGuildId, joinedGuildId, joinedAt, creditsAwarded }`, `BotListVote { platform, voterId, guildId, votedAt }`, `UserSubscription { userId, plan, status, providerSubscriptionId, currentPeriodEnd }`, `PublicPageConfig { guildId, enabled, description, featuredChannelIds[], featuredRoleIds[], hideMemberCount, noindex }`.

---

## 10. QUALITY BAR

### Feature Flags
- All new major features ship behind a feature flag stored in `FeatureFlag { key, enabledGuildIds[], enabledForAll, rolloutPercent }`.
- Dashboard (super-admin only): toggle flags per guild or set a rollout percentage for gradual release.
- Code gate: `isFeatureEnabled(guildId, 'FEATURE_KEY')` checked at command dispatch and dashboard route level.
- Flags cached in Redis/in-memory LRU for 60 seconds.

### SSRF-Safe Fetchers
- All outgoing HTTP requests from the server (RSS, webhooks, monitor checks, translation APIs, game server queries) go through a centralized `safeFetch(url, options)` utility.
- `safeFetch` validates the URL before making the request: rejects private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, link-local), rejects non-http/https schemes, enforces a 10s timeout, follows at most 3 redirects (re-validates each redirect target).
- Returns a typed `Result<Response, FetchError>` to enforce error handling at call sites.

### Money Movement Idempotency
- Every billing webhook handler: check `ProcessedWebhookEvent { eventId, provider, processedAt }` before processing; insert atomically before acting; skip and return 200 if already present.
- Every role grant/removal triggered by payment events uses a database transaction (MongoDB session) to prevent partial updates.
- Every economy transfer uses `findOneAndUpdate` with `{ balance: { $gte: amount } }` condition to prevent overdrafts atomically.
- Payout and subscription creation calls to Stripe/Lemon Squeezy include idempotency keys derived from `guildId + tierId + periodStart`.

### Additional Quality Standards
- Every module from Addendum 4 ships with: Zod schema validation, Mongoose models with appropriate indexes, command definitions, dashboard pages, plan limit entries, audit logging, i18n strings for all 8 supported languages, unit tests for core logic, integration test for guild data isolation.
- Zero trust between modules: each module's API route re-validates authentication and authorization independently.
- Graceful degradation: if an external service (GitHub API, translation API, game server) is unreachable, fail silently with a user-facing "Service temporarily unavailable" message; never block core bot functionality.
