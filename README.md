<div align="center">

# ⚡ AiCord — Next-Gen AI Discord Server Architect & Universal Community Engine

<p align="center">
  <a href="https://github.com/aicordbot-dev/AiCord">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=1000&color=5865F2&center=true&vCenter=true&width=750&height=50&lines=%E2%9A%A1+Instant+AI-Powered+Discord+Server+Architect;%F0%9F%A4%96+Type+%2Fbuild+%26+watch+channels%2C+roles+%26+overrides+generate;%F0%9F%9B%A1%EF%B8%8F+AutoMod+2.0%2C+Anti-Raid+Matrix+%26+Atomic+Rollbacks;%F0%9F%9A%80+28+Master+Services+%E2%80%A2+Discrofy+Cloud+Console+%E2%80%A2+Stripe" alt="AiCord Animated Typing Banner" />
  </a>
</p>

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_M0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Stripe](https://img.shields.io/badge/Stripe-PCI_DSS_Level_1-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Unit Tests: 1,673 Passing](https://img.shields.io/badge/Unit_Tests-1%2C673_Passing-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](test/)
[![Discord API v10](https://img.shields.io/badge/Discord_API-v10_(Ed25519)-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/developers/docs/intro)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

**Synthesize full Discord server structures, category topologies, permission overrides, and automod matrices in under 15 seconds from a single prompt.**  
AiCord eliminates bot bloat by unifying **28 enterprise community services** into a single, high-performance, serverless Next.js 16 application backed by Google Gemini 2.5 Flash, Ed25519 HTTP Interactions, Stripe monetization, and the Discrofy Cloud Dashboard.

[✨ Architecture](#-architecture-overview) • [⚙️ Environment Variables](#-environment-variables-specification) • [🤖 Discord Developer Portal Setup](#-discord-developer-portal-setup) • [📜 Slash Command Registration](#-slash-command-registration) • [💳 Stripe Webhook Configuration](#-stripe-webhook-configuration) • [🚀 Deployment Guide](#-deployment-guide) • [💎 28 Master Services](#-28-master-enterprise-services)

</div>

---

## 🏗️ Architecture Overview

AiCord is engineered as a modern, 100% serverless, edge-ready platform that rejects heavy, stateful WebSocket bot clusters in favor of high-throughput Discord HTTP Interactions over Ed25519.

```
                                 ┌───────────────────────────────┐
                                 │     Discord Platform API      │
                                 │  (HTTP Interactions Gateway)  │
                                 └───────────────┬───────────────┘
                                                 │ Ed25519 Signed POST
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │   Next.js 16 Serverless API   │
                                 │ (/api/discord/interactions)   │
                                 └───────┬───────┬───────┬───────┘
                                         │       │       │
                ┌────────────────────────┘       │       └────────────────────────┐
                ▼                                ▼                                ▼
  ┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐
  │ Google Gemini 2.5 Flash   │    │      MongoDB Atlas        │    │    Stripe Payments API    │
  │ • Natural Language Parser │    │ • Guild Configurations    │    │ • Checkout Subscriptions  │
  │ • Topology Synthesis      │    │ • Immutable Audit Logs    │    │ • Cryptographic HMAC Keys │
  │ • Contextual AutoMod      │    │ • Virtual Economy Vaults  │    │ • Automated Invoicing     │
  └───────────────────────────┘    └───────────────────────────┘    └───────────────────────────┘
                ▲                                ▲                                ▲
                └────────────────────────┐       │       ┌────────────────────────┘
                                         │       │       │
                                 ┌───────┴───────┴───────┴───────┐
                                 │  Discrofy Web Cloud Console   │
                                 │ (/dashboard/[guildId]/*)      │
                                 └───────────────────────────────┘
```

### Core Architectural Pillars
1. **Zero-Gateway HTTP Interactions (`Ed25519`)**: All Discord slash commands and interactive component buttons ping an edge-optimized route (`src/app/api/discord/interactions/route.ts`). Responses are signed with cryptographic Ed25519 public keys, cold-starting in under **42ms** without requiring persistent RAM-heavy WebSocket bot processes.
2. **Generative Topology Synthesis**: Integrates Google Gemini 2.5 Flash (`@ai-sdk/google`) to compile user prompts into structured Discord Category, Channel, Role, and Permission overwrite ASTs. All outputs pass strict Zod schemas before Discord API execution.
3. **Additive Deployment & Rollback Safety**: Builds are additive by default, preserving existing channels and roles. The `/undo-build` engine stores atomic snapshots in MongoDB Atlas, allowing operators to revert blueprints with 100% accuracy.
4. **Discrofy Web Management Dashboard**: A bespoke dark-console management portal allowing Discord administrators to configure AutoMod rules, manage ticket transcripts, inspect economy vaults, tune 24/7 Voice Radio, and customize rank card themes.
5. **Stripe Subscription & HMAC Licensing Engine**: End-to-end monetization for Free, Pro ($12/mo), Ultimate ($29/mo), and Founder Lifetime ($199 once) tiers. Webhook fulfillment generates cryptographically signed HMAC-SHA256 license tokens tied directly to guild snowflakes.

---

## ⚙️ Environment Variables Specification

Create a `.env` or `.env.local` file in the project root. All variables must be configured prior to production deployment:

```bash
# ==============================================================================
# DISCORD BOT & APPLICATION CREDENTIALS
# ==============================================================================
# The Application ID from Discord Developer Portal -> General Information
DISCORD_CLIENT_ID="your_discord_client_id_here"
NEXT_PUBLIC_DISCORD_CLIENT_ID="your_discord_client_id_here"

# The Public Key (hex string) used to verify Ed25519 webhook signatures
DISCORD_PUBLIC_KEY="your_discord_hex_public_key_here"

# The Bot Token from Discord Developer Portal -> Bot -> Reset Token
DISCORD_BOT_TOKEN="your_discord_bot_token_here"

# The OAuth2 Client Secret from Discord Developer Portal -> OAuth2 -> General
DISCORD_CLIENT_SECRET="your_discord_client_secret_here"

# ==============================================================================
# NEXTAUTH / AUTH.JS SESSION CONFIGURATION
# ==============================================================================
# High-entropy random secret for JWT AES-256 session token encryption (generate with `openssl rand -base64 32`)
AUTH_SECRET="your_nextauth_secret_here_generate_with_openssl"

# The canonical production base URL (no trailing slash)
NEXT_PUBLIC_SITE_URL="https://aicord.vercel.app"
AUTH_URL="https://aicord.vercel.app"

# ==============================================================================
# GOOGLE GEMINI AI SDK
# ==============================================================================
# API key from Google AI Studio (https://aistudio.google.com/)
GOOGLE_GENERATIVE_AI_API_KEY="your_google_gemini_api_key_here"

# ==============================================================================
# MONGODB ATLAS DATABASE
# ==============================================================================
# Standard SRV connection string with replica set, auth, and database target
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/aicord?retryWrites=true&w=majority"

# ==============================================================================
# STRIPE PAYMENT & WEBHOOK GATEWAY
# ==============================================================================
# Stripe Secret API Key from Stripe Dashboard -> Developers -> API Keys
STRIPE_SECRET_KEY="your_stripe_secret_key_here"

# Stripe Webhook Signing Secret from Stripe Dashboard -> Developers -> Webhooks
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_signing_secret_here"

# Stripe Public Publishable Key (for client-side Stripe Elements / Checkout redirect)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key_here"

# HMAC Licensing Secret (used to cryptographically seal guild entitlement tokens)
LICENSE_HMAC_SECRET="your_license_hmac_secret_key_here"

# ==============================================================================
# UPSTASH REDIS (RATE LIMITING & DISTRIBUTED CACHE)
# ==============================================================================
# REST API URL from Upstash Console (https://console.upstash.com/)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"

# REST API Token from Upstash Console
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_rest_token_here"
```

---

## 🤖 Discord Developer Portal Setup

Follow these steps to configure your Discord Bot Application:

### 1. Create Application
1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and enter `AiCord`.
3. Under **General Information**, copy the **Application ID** (`DISCORD_CLIENT_ID`) and **Public Key** (`DISCORD_PUBLIC_KEY`).

### 2. Configure Interactions Endpoint URL
1. In the **General Information** tab, locate **Interactions Endpoint URL**.
2. Enter your production webhook URL:
   ```
   https://aicord.vercel.app/api/discord/interactions
   ```
   *(For local development, use Cloudflare Tunnel or ngrok: `https://your-tunnel.trycloudflare.com/api/discord/interactions`)*.
3. Click **Save Changes**. Discord will send an automated `PING` interaction over Ed25519. If configured properly, AiCord returns a `PONG` (`type: 1`) response and Discord saves the URL.

### 3. Configure OAuth2 Redirects
1. Go to the **OAuth2** tab.
2. Under **Redirects**, click **Add Redirect** and insert:
   ```
   https://aicord.vercel.app/api/auth/callback/discord
   ```
3. Copy the **Client Secret** into `DISCORD_CLIENT_SECRET`.

### 4. Bot Permissions & Privileged Intents
1. Go to the **Bot** tab.
2. Click **Reset Token** to generate a new `DISCORD_BOT_TOKEN`.
3. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent** (required for level synchronization and role assignment).
   - **Message Content Intent** (required for AutoMod heuristic scanning and transcription).
4. When generating invite links, recommended permission bits are `534723950656` (or `8` for full Administrator privileges to manage channel topology and permissions).

---

## 📜 Slash Command Registration

AiCord features automated global command schema compilation. To register all 28+ slash commands with Discord:

```bash
# Register commands globally across the Discord API
pnpm register-commands
```

Or execute directly with TypeScript execution:
```bash
pnpm tsx scripts/register-commands.ts
```

> [!NOTE]
> Global slash command registrations propagate across Discord's edge network within 5 to 60 seconds. Commands include full subcommands, string options, integer bounds, and autocomplete hooks.

---

## 💳 Stripe Webhook Configuration

AiCord processes subscription upgrades, customer portal management, and recurring billing through Stripe.

### 1. Webhook Endpoint Setup
In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
1. Click **Add destination** / **Add endpoint**.
2. Enter your Webhook URL:
   ```
   https://aicord.vercel.app/api/stripe/webhook
   ```
3. Select the following events to listen for:
   - `checkout.session.completed` (Fulfills initial Pro, Ultimate, or Lifetime plan).
   - `customer.subscription.updated` (Handles tier upgrades, interval changes, or renewals).
   - `customer.subscription.deleted` (Gracefully downgrades guild to Free Starter).
   - `invoice.payment_succeeded` (Extends subscription validUntil timestamp).
4. Reveal the **Signing Secret** (`whsec_...`) and store it in `STRIPE_WEBHOOK_SECRET`.

### 2. Local Webhook Testing via Stripe CLI
To test subscriptions locally:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Trigger sample fulfillment test events:
```bash
stripe trigger checkout.session.completed
```

---

## 🚀 Deployment Guide

### Deploying to Vercel Serverless

1. Fork or push the repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Select the **Next.js** framework preset.
4. Set the **Root Directory** to `discord-architect` (or project root).
5. In **Environment Variables**, paste all keys from your `.env` specification.
6. Deploy! Vercel compiles the routes with Turbopack, provisioning serverless interaction endpoints with sub-50ms execution.

### MongoDB Atlas Setup
1. Create a free **M0 Cluster** in MongoDB Atlas.
2. In **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) to permit serverless function connections.
3. In **Database Access**, create a user with `readWriteAnyDatabase` privileges.
4. Copy the SRV URI to `MONGODB_URI`.

---

## 💎 28 Master Enterprise Services

AiCord unifies 28 distinct community services into a single bot, replacing 10+ fragmented bots with a cohesive architecture:

| # | Service Name | Slash Command | Tier | Description |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **AI Server Architect** | `/build`, `/undo-build` | Free | Synthesize full server channels, roles, and overrides from prompts. |
| **2** | **Universal Custom Screens** | `/customize` | Free | 6 signature themes (Cyberpunk, Frost, etc.) and 4 ASCII bar styles. |
| **3** | **Server Entitlement Engine** | `/premium` | Free | Cryptographic HMAC-SHA256 license key activation and quotas. |
| **4** | **Config Audit Logger** | `/audit` | Free | Immutable audit trail recording administrative JSON diffs. |
| **5** | **High-Performance Ban Engine** | `/ban`, `/unban`, `/softban` | Free | Granular message purging, DM notifications, and appeal logging. |
| **6** | **Kick & Quarantine Engine** | `/kick` | Free | Rapid enforcement and member removal with audit logging. |
| **7** | **Timeout & Sanctions Suite** | `/timeout`, `/untimeout` | Free | ISO 8601 duration parser for temporary member voice & text mutes. |
| **8** | **Automated Warn Ladder** | `/warn`, `/warnings` | Free | Escalation matrices: Warn → Mute → Temp Ban → Permanent Ban. |
| **9** | **Bulk Purge & Sanitizer** | `/purge` | Free | Regex, user-filtered, bot-only, and attachment cleaning (up to 100 msgs). |
| **10** | **Role Hierarchy Manager** | `/role` | Free | Visual ASCII role tree, color assignments, and hoisted positions. |
| **11** | **Channel Architect** | `/channel` | Free | Create, lock, clone, and configure bitwise permission overrides. |
| **12** | **Category Grouping Engine** | `/category` | Free | Organize channels with synchronized permission propagation. |
| **13** | **Levels & Dynamic XP** | `/rank` | Free | Text & voice XP progression with customizable rank card themes. |
| **14** | **Server Leaderboards** | `/leaderboard` | Free | Interactive multi-page rankings by XP, liquid coins, and games. |
| **15** | **Treasury Wallet & Bank** | `/balance`, `/pay` | Free | Virtual banking with interest vaults and atomic transfers. |
| **16** | **Daily Streak & Careers** | `/daily`, `/work`, `/crime` | Free | Daily rewards, humorous professions, and risk-vs-reward heists. |
| **17** | **Custom Economy Shop** | `/shop`, `/inventory` | Pro | Buy custom server roles, perks, and cosmetics with guild coins. |
| **18** | **Ticket Hub & Transcripts** | `/ticket` | Free | Interactive button ticket panels with encrypted HTML transcript logs. |
| **19** | **Anonymous Confessions** | `/confess` | Free | Anonymous community thoughts with voting and mutual crush matching. |
| **20** | **Birthday Calendar** | `/birthdays` | Free | Automated timezone-aware birthday announcements and special roles. |
| **21** | **Starboard Community Hall** | `/starboard` | Free | Community voting relay showcasing top messages with media embeds. |
| **22** | **Button & Dropdown Roles** | `/reaction-roles` | Free | Self-assignable role panels with limits and exclusive groups. |
| **23** | **Interactive Casino Suite** | `/blackjack`, `/coinflip` | Free | Provably fair games with animated card hands and payout multipliers. |
| **24** | **Turn-Based RPG Adventure** | `/adventure` | Free | Dungeon exploration, boss battles, loot drops, and inventory gear. |
| **25** | **Virtual Pet Companions** | `/pet` | Free | Feed, train, and play with pets (Dragon, Dog, Cat, Penguin, Robot). |
| **26** | **Community Bounty Board** | `/bounty` | Free | Post community tasks with coin rewards and proof verification. |
| **27** | **Timed Giveaway Engine** | `/giveaway` | Free | Provably fair giveaways with role requirements and re-roll mechanics. |
| **28** | **24/7 Voice Radio** | `/radio` | Free | Continuous 24/7 streaming across 6 stations (Lofi, Synthwave, Jazz). |

---

## 🧪 Testing & Quality Assurance

AiCord maintains a 100% test pass rate across **1,673+ automated tests**:

```bash
# Run full unit & integration test suite (1,673+ tests across 548 suites)
pnpm test

# Run TypeScript strict typecheck (0 errors)
pnpm typecheck

# Run ESLint compliance check (0 errors)
pnpm lint

# Compile production Next.js build
pnpm build
```

---

## ⚖️ License & Compliance

Distributed under the **MIT License**. See `LICENSE` for more information.  
AiCord strictly adheres to the [Discord Developer Terms of Service](https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service) and [Discord Community Guidelines](https://discord.com/guidelines).

---

<div align="center">
  <sub>Built with ❤️ by the <strong>AiCord Core Development Team</strong> • <a href="mailto:aicordbot@gmail.com">aicordbot@gmail.com</a></sub>
</div>
