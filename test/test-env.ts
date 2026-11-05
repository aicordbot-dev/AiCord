/**
 * test/test-env.ts
 * Preloads mock environment variables for unit test execution.
 */

if (!process.env.DISCORD_APP_ID) process.env.DISCORD_APP_ID = '123456789012345678';
if (!process.env.DISCORD_PUBLIC_KEY) {
  process.env.DISCORD_PUBLIC_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}
if (!process.env.DISCORD_BOT_TOKEN) {
  process.env.DISCORD_BOT_TOKEN = 'mock_discord_bot_token_placeholder_for_unit_testing_1234567890';
}
if (!process.env.DISCORD_CLIENT_ID) process.env.DISCORD_CLIENT_ID = '123456789012345678';
if (!process.env.DISCORD_CLIENT_SECRET) process.env.DISCORD_CLIENT_SECRET = 'secret1234567890';
if (!process.env.MONGODB_URI) process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = 'gemini-key-12345';
if (!process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = '12345678901234567890123456789012';
if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = 'http://localhost:3000';
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = 'test_cron_secret_123456';
if (!process.env.NEXT_PUBLIC_APP_URL) process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
