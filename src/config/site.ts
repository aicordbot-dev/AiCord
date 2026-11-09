/**
 * src/config/site.ts
 * Core site metadata, social URLs, repository info, and Discord OAuth invite link generator.
 */

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  creator: string;
  version: string;
  discordClientId: string;
  links: {
    github: string;
    discord: string;
    docs: string;
    privacy: string;
    terms: string;
  };
  getInviteUrl: (permissions?: string) => string;
}

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1567565252525170748';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aicord.vercel.app';

export const siteConfig: SiteConfig = {
  name: 'AiCord',
  tagline: 'Your Discord server, built by AI in minutes.',
  description:
    'Synthesize full category layouts, permission overrides, and automod in seconds from a single prompt. Style interactive profiles with 6 universal themes, and supercharge your guild with 28+ zero-bloat enterprise services.',
  url: SITE_URL,
  creator: 'aicordbot-dev',
  version: '2.4.0',
  discordClientId: DEFAULT_CLIENT_ID,
  links: {
    github: 'https://github.com/aicordbot-dev/AiCord',
    discord: 'https://discord.gg/aicord',
    docs: '#faq',
    privacy: '/privacy',
    terms: '/terms',
  },
  getInviteUrl: (permissions: string = '8') => {
    return `https://discord.com/oauth2/authorize?client_id=${DEFAULT_CLIENT_ID}&scope=bot%20applications.commands&permissions=${permissions}`;
  },
};
