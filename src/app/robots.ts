import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * src/app/robots.ts
 * Modern robots.txt configuration for AiCord.
 * Directs search engine crawlers to public marketing, legal, and documentation routes,
 * while protecting private API endpoints and tenant dashboard consoles.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/status', '/changelog', '/terms', '/privacy', '/login'],
        disallow: ['/api/', '/dashboard/', '/checkout/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/docs', '/terms', '/privacy'],
        disallow: ['/api/', '/dashboard/', '/checkout/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
