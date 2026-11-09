/**
 * src/auth.ts
 * Auth.js (NextAuth v5 beta) configuration for Discord OAuth2 authentication,
 * JWT encryption, automatic token refresh rotation, and session sanitization.
 */

import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import type { JWT } from 'next-auth/jwt';
import { setServerToken } from '@/lib/token-store';

const refreshLocks = new Map<string, Promise<JWT>>();

/**
 * Rotates an expired Discord OAuth access token using the refresh token.
 * Uses an in-memory mutex to ensure concurrent requests do not collide.
 */
async function refreshDiscordToken(token: JWT): Promise<JWT> {
  const userId = token.sub || 'unknown';

  const activeRefresh = refreshLocks.get(userId);
  if (activeRefresh) {
    return activeRefresh;
  }

  const refreshPromise = (async (): Promise<JWT> => {
    try {
      if (!token.refreshToken) {
        return {
          ...token,
          error: 'RefreshTokenError',
        };
      }

      const clientId =
        process.env.DISCORD_CLIENT_ID ||
        process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
        '1567565252525170748';
      const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';

      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      });

      const response = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const refreshedTokens = await response.json();

      if (!response.ok) {
        console.error('[Auth] Failed to refresh Discord access token:', refreshedTokens);
        return {
          ...token,
          error: 'RefreshTokenError',
        };
      }

      const expiresAt = Date.now() + (refreshedTokens.expires_in ?? 604800) * 1000;

      // Update server-side token store securely
      if (token.sub) {
        setServerToken(token.sub, {
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token ?? (token.refreshToken as string),
          expiresAt,
        });
      }

      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        expiresAt,
        error: undefined,
      };
    } catch (err) {
      console.error('[Auth] Token refresh encountered an unhandled exception:', err);
      return {
        ...token,
        error: 'RefreshTokenError',
      };
    } finally {
      refreshLocks.delete(userId);
    }
  })();

  refreshLocks.set(userId, refreshPromise);
  return refreshPromise;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId:
        process.env.DISCORD_CLIENT_ID ||
        process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
        '1567565252525170748',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'dummy-discord-secret',
      authorization: {
        params: {
          scope: 'identify guilds',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign-in with provider details
      if (account && profile) {
        const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        const sub = account.providerAccountId;
        const isAdmin = adminIds.includes(sub);

        // Safe avatar URL computation
        const discordProfile = profile as Record<string, unknown>;
        const avatar = discordProfile.avatar as string | undefined;
        let picture = `https://cdn.discordapp.com/embed/avatars/0.png`;

        if (avatar && sub) {
          picture = `https://cdn.discordapp.com/avatars/${sub}/${avatar}.png`;
        } else if (sub) {
          try {
            const index = Number((BigInt(sub) >> 22n) % 6n);
            picture = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
          } catch {
            picture = `https://cdn.discordapp.com/embed/avatars/0.png`;
          }
        }

        const expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 604800 * 1000;

        // Store tokens securely in server-only token store
        if (account.access_token && sub) {
          setServerToken(sub, {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt,
          });
        }

        return {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt,
          sub,
          name: (discordProfile.username as string) ?? token.name,
          global_name:
            (discordProfile.global_name as string) ??
            (discordProfile.username as string) ??
            token.name,
          picture,
          isAdminOfAppOwner: isAdmin,
        };
      }

      // Return current token if it has not expired (with 60s safety buffer)
      if (token.expiresAt && Date.now() < (token.expiresAt as number) - 60_000) {
        return token;
      }

      // Attempt to refresh expired token
      return refreshDiscordToken(token);
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub as string) || session.user.id;
        session.user.name = (token.name as string) || session.user.name;
        session.user.global_name =
          (token.global_name as string) || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
        session.user.isAdminOfAppOwner = Boolean(token.isAdminOfAppOwner);
      }

      if (token.error) {
        session.error = token.error as string;
      }

      return session;
    },
  },
});
