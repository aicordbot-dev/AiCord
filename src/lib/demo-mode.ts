/**
 * src/lib/demo-mode.ts
 * Demo mode configuration, mock identity, and production security safeguards.
 */

export interface DemoUser {
  id: string;
  name: string;
  global_name: string;
  image: string;
  isAdminOfAppOwner: boolean;
}

export interface DemoGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  approximate_member_count?: number;
  botPresent: boolean;
}

export const MOCK_USER: DemoUser = {
  id: 'demo-user-123456789',
  name: 'Alex',
  global_name: 'Alex#0001',
  image: 'https://cdn.discordapp.com/embed/avatars/0.png',
  isAdminOfAppOwner: true,
};

export const MOCK_GUILDS: DemoGuild[] = [
  {
    id: '111111111111111111',
    name: 'Apex Legends Syndicate',
    icon: null,
    owner: true,
    permissions: '8', // Administrator
    features: ['COMMUNITY', 'WELCOME_SCREEN_ENABLED'],
    approximate_member_count: 1420,
    botPresent: true,
  },
  {
    id: '222222222222222222',
    name: 'Cyberpunk 2077 Modding',
    icon: null,
    owner: false,
    permissions: '32', // Manage Guild
    features: ['COMMUNITY'],
    approximate_member_count: 890,
    botPresent: true,
  },
  {
    id: '333333333333333333',
    name: 'Indie Game Dev Hub',
    icon: null,
    owner: true,
    permissions: '8', // Administrator
    features: [],
    approximate_member_count: 310,
    botPresent: false,
  },
  {
    id: '444444444444444444',
    name: 'Next.js Architecture Hub',
    icon: null,
    owner: false,
    permissions: '32', // Manage Guild
    features: [],
    approximate_member_count: 45,
    botPresent: false,
  },
];

/**
 * Checks whether demo mode is enabled.
 * Throws a fatal exception if NEXT_PUBLIC_DEMO_MODE is set in a production environment.
 */
export function isDemoMode(): boolean {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && isDemo) {
    throw new Error('FATAL SECURITY ERROR: Demo mode cannot be enabled in production environments.');
  }

  return isDemo && !isProd;
}

/**
 * Returns mock user session for demo mode.
 */
export function getDemoSession() {
  return {
    user: { ...MOCK_USER },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Returns mock guilds list for demo mode.
 */
export function getDemoGuilds(): DemoGuild[] {
  return MOCK_GUILDS.map((g) => ({ ...g }));
}
