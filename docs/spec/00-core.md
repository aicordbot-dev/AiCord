# Discord Architect - Core Spec (Part 0)

## Architecture

- Slash commands and AI server building run through Discord's HTTP Interactions endpoint in Next.js API routes (works on Vercel free).
- Live auto-moderation goes in an optional small worker on a free host.
- AI uses free tier (Google Gemini, Groq, or OpenRouter free models).
- Database is MongoDB Atlas free (M0).

## ARCHITECTURE CONSTRAINTS

- Vercel serverless cannot hold a Discord gateway WebSocket.
  1. Use Discord HTTP Interactions: POST /api/discord/interactions with Ed25519 signature verification (discord-interactions), handling PING, slash commands, buttons, select menus, and modals.
  2. Respond to interactions within 3 seconds: immediately return a deferred response (type 5), then do the work and edit the original response via the interaction webhook. Keep each serverless invocation under 10s by processing work in small batches/steps and continuing via follow-up calls (job queue stored in MongoDB, advanced by a self-triggered API route or Vercel Cron).
  3. Use the Discord REST API only (@discordjs/rest + discord-api-types). No discord.js gateway in the Next.js app.
  4. Provide a SEPARATE optional folder /worker with a small discord.js gateway bot (Node) for features that need live events: message-based automod, join/leave logging, anti-raid, XP/levels. It shares the same MongoDB models and config.
- Respect Discord rate limits: queue requests, read X-RateLimit headers, back off and retry on 429. Channel/role creation must be sequential with small delays.

## CORE FEATURES

### 1. AI Server Builder
- Slash command /build <description>. Gemini (via Vercel AI SDK, generateObject with a Zod schema) returns a structured server blueprint: roles (name, color, hoist, mentionable, permissions), categories, text/voice/forum/announcement channels (topic, slowmode, nsfw, private flag), permission overwrites per role, welcome/rules content.
- Validate the blueprint with Zod and a safety layer: never grant Administrator to non-staff roles, cap total channels (<=500), roles (<=250), and names/lengths per Discord limits.
- Show a PREVIEW embed (tree view of categories/channels/roles) with Confirm / Edit / Cancel buttons. Only apply after Confirm.
- Apply step: create roles first (highest to lowest), then categories, then channels with permission overwrites, then post rules/welcome messages. Show live progress by editing the response message. Store a snapshot of created IDs so the build can be rolled back with /undo-build.
- Also support templates: gaming, dev community, study group, creator/community, business support. AI customizes a chosen template.
- Optional /build-from-server: read the current guild structure and let AI suggest improvements (diff preview before applying).

### 2. AI Server Management
- /ai <natural language request>. The model converts it into a list of typed actions (create/edit/delete channel, role, category, permission overwrite, etc.) via a Zod schema; NEVER execute raw model output. Map actions through a whitelist of handlers.
- Destructive actions require explicit Confirm button from a user with Administrator permission.
- Audit log: store every AI action (who, prompt, actions, result) in MongoDB and show in the dashboard.

### 3. Roles & Channels management commands
- /role create|edit|delete|assign|remove, /channel create|edit|delete|lock|unlock|slowmode, /category create|edit|delete|reorder. Use autocomplete for role/channel names.
- Reaction roles / button role panels: /rolepanel creates a message with buttons or select menu to self-assign roles.

### 4. Moderation
- HTTP-based commands: /ban, /kick, /timeout, /warn, /warnings, /clearwarnings, /purge, /lock, /slowmode, /modlog-setup. Cases stored in MongoDB with case numbers, reasons, moderator, and optional duration (temp bans/timeouts expire via Vercel Cron).
- Permission checks: verify invoker permissions and role hierarchy. Clear error messages.
- AI-assisted moderation: /ai-mod-config lets admins enable it per server.
- Anti-raid/anti-spam settings (worker): join rate limits, new-account age checks, link/invite filters, mass-mention limits.

### 5. Web Dashboard (Next.js)
- Discord OAuth2 login (Auth.js/next-auth Discord provider). Show only guilds where the user has Manage Server and the bot is present.
- Pages: Overview, AI Builder, Roles, Channels, Moderation, Automod settings, Audit log, Templates.
- Server-side authorization on EVERY API route.

## DATA MODEL (Mongoose)
GuildConfig, ModCase, Warning, BuildJob (status, steps, createdIds for rollback), AuditLog, RolePanel, AutomodConfig, TempAction (expiry).

## SECURITY & QUALITY
- Env validation with Zod (DISCORD_APP_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, DISCORD_CLIENT_SECRET, MONGODB_URI, GEMINI_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL, CRON_SECRET).
- Verify signatures on interactions; protect cron routes with CRON_SECRET.
- Prompt-injection defense: treat user text as data; strict schemas; whitelist of actions; confirmation for risky operations.
- Per-guild and per-user rate limiting for AI calls.
