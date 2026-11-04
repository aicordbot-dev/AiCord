# AiCord

A Next.js Discord bot + web dashboard powered by AI. Build and manage Discord servers using natural language.

## Architecture

- **HTTP Interactions** (Vercel serverless): slash commands, buttons, modals
- **Gateway Worker** (optional, free VPS): live automod, XP, logging
- **AI**: Google Gemini via AI SDK (free tier)
- **DB**: MongoDB Atlas M0 (free tier)

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in values
2. Run `pnpm tsx scripts/register-commands.ts` to register slash commands
3. Run `pnpm dev` for local development
4. Deploy to Vercel and set the Interactions Endpoint URL

## Commands

- `/build <description>` - AI-generate a server blueprint and apply it
- `/ai <request>` - Natural language server management
- `/role` - Role management commands
- `/channel` - Channel management commands
- `/mod` - Moderation commands

See `/docs` on the dashboard for full command reference.
