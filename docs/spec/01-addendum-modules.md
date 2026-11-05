# Discord Architect - Addendum 1: Public Bot, Plans, Extra Modules

## NEW FEATURE MODULES

### Birthdays
- /birthday set <day> <month> [year] [timezone], /birthday remove, /birthday view [user], /birthday upcoming, /birthday list.
- Per-guild config: announcement channel, message template with variables ({user}, {age}, {server}), optional birthday role (auto-added for 24h and removed), ping role, embed or plain style, hide year option.
- Vercel Cron runs hourly, checks timezones, announces, and assigns/removes the role. Idempotent (store lastAnnouncedYear).

### Levels & XP
- Worker awards XP per message (15-25 random, 60s cooldown per user, configurable), plus optional voice XP.
- /rank [user] (generated rank card image via @vercel/og or satori), /leaderboard (paginated with buttons), /xp add|remove|set|reset (admin).
- Level-up announcements, role rewards (stack or replace), XP multipliers per role/channel, weekly/monthly leaderboard resets.

### Economy (light)
- /daily, /work, /balance, /pay, /shop (admin-defined items and role purchases), /inventory. Currency name and emoji configurable.

### Welcome, Goodbye & Onboarding
- Welcome/goodbye messages (embed or image card), DM welcome, auto-roles, delayed auto-role after verification.
- Verification: button, captcha-style question, or account-age gate.

### Tickets / Support
- Panel with button -> private ticket channel with category, staff role access, claim/close/reopen buttons, transcript saved and sent to log channel/DM, ticket limits per user, AI summary of the ticket on close.

### Community tools
- Giveaways (/giveaway start|end|reroll), Polls (/poll with up to 10 options), suggestions with approve/deny workflow, starboard, reminders (/remind), custom commands and auto-responders, sticky messages, temp voice channels, stats channels, embed builder (/embed), scheduled announcements.
- Social feeds: RSS, YouTube, Twitch announcements to a channel (cron polling, per-plan feed limits).

### AI features (cost-controlled)
- /ask: server FAQ assistant answering ONLY from an admin-provided knowledge base.
- AI ticket summaries, AI moderation, AI announcement writer, translation command.
- Per-plan monthly AI credit quotas, enforced before every model call.

### Server safety tools
- Server backup & restore (snapshot of roles, channels, permissions, settings stored in MongoDB; plan-limited number of backups).
- Anti-nuke (worker): detects mass channel/role deletion or mass bans, strips roles, alerts owner.
- Raid mode lockdown command, verification-level escalation.

## PLANS & MONETIZATION

Plans defined in src/lib/plans.ts:

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| AI server builds / month | 2 | 20 | unlimited |
| AI credits / month | 30 | 500 | 3,000 |
| Level role rewards | 5 | 25 | unlimited |
| Custom commands / auto-responders | 10 | 50 | 200 |
| Ticket panels | 1 | 5 | 20 |
| Backups stored | 1 | 5 | 20 |
| Social feeds | 1 | 10 | 30 |
| Giveaways active | 2 | 10 | 50 |
| Rank card customization | no | basic | full |
| Anti-nuke + auto-restore | no | yes | yes |
| Audit log retention | 7 days | 30 days | 90 days |

Implementation requirements:
- Subscriptions are PER GUILD. Model: Subscription { guildId, ownerUserId, plan, status, provider, providerCustomerId, providerSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd }.
- A single helper getGuildPlan(guildId) and requireFeature(guildId, feature) used by every command and API route.
- Billing: provider abstraction (BillingProvider interface) with one implementation (Lemon Squeezy or Stripe, selectable by env).
- Webhook route with signature verification and idempotency (store processed event IDs).
- Handle: created, renewed, payment failed (grace period 3 days), canceled, expired -> downgrade gracefully.
- 7-day trial option and promo/coupon support.
- Optional: Discord native App Subscriptions (Premium Apps) via entitlements.
- Admin panel (/admin, protected by an env list of owner Discord IDs).

## PUBLIC-BOT REQUIREMENTS

- Landing page (features, pricing, FAQ, invite button, support server link).
- Legal: Terms of Service, Privacy Policy.
- Use only the minimum privileged intents.
- Multi-tenant safety: every query filtered by guildId; per-guild rate limits and abuse protection.
- Observability: structured logs, error reporting (Sentry free tier), health endpoint.

## DATA MODEL ADDITIONS
Birthday, BirthdayConfig, LevelConfig, MemberXP (guildId+userId unique), LevelReward, EconomyAccount, ShopItem, Transaction, WelcomeConfig, VerificationConfig, Ticket, TicketPanel, Giveaway, Poll, Suggestion, StarboardEntry, Reminder, CustomCommand, TempVoiceConfig, FeedSubscription, Backup, AntiNukeConfig, KnowledgeBaseDoc, Subscription, UsageCounter (guildId, month, aiCredits, builds), ProcessedWebhookEvent.
