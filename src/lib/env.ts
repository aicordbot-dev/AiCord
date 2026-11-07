import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((val) => {
    if (!val || val === '' || val === 'undefined' || val === 'null') return undefined;
    try {
      new URL(val);
      return val;
    } catch {
      console.warn(`[Env] Ignored invalid URL format for optional variable: ${val}`);
      return undefined;
    }
  });

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((val) => (val && val !== 'undefined' && val !== 'null' ? val : undefined));

const envSchema = z.object({
  // Discord Application
  DISCORD_APP_ID: z.string().min(17, 'DISCORD_APP_ID must be a valid snowflake'),
  DISCORD_PUBLIC_KEY: z.string().length(64, 'DISCORD_PUBLIC_KEY must be 64 hex chars'),
  DISCORD_BOT_TOKEN: z.string().min(50, 'DISCORD_BOT_TOKEN appears invalid'),
  DISCORD_CLIENT_ID: z.string().min(17, 'DISCORD_CLIENT_ID must be a valid snowflake'),
  DISCORD_CLIENT_SECRET: z.string().min(10, 'DISCORD_CLIENT_SECRET appears invalid'),

  // Database
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection string').startsWith('mongodb'),

  // AI
  GEMINI_API_KEY: z.string().min(10, 'GEMINI_API_KEY appears invalid'),
  GROQ_API_KEY: optionalString,

  // Auth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 chars'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // Security
  CRON_SECRET: z.string().min(8, 'CRON_SECRET must be at least 8 chars'),

  // Optional: Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  // Optional: Sentry
  SENTRY_DSN: optionalUrl,

  // Admin IDs (comma-separated Discord user snowflakes)
  ADMIN_DISCORD_IDS: optionalString,

  // Public URL
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}\n\nSee .env.example for the required variables.`);
  }

  return parsed.data;
}

// Singleton — validated once on first import
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Convenience re-export of the validated env object
// Usage: import { env } from '@/lib/env'
export const env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env];
  },
});
