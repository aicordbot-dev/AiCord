import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      global_name?: string | null;
      image?: string | null;
      isAdminOfAppOwner?: boolean;
    } & DefaultSession['user'];
    error?: string;
  }

  interface User {
    id?: string;
    name?: string | null;
    global_name?: string | null;
    image?: string | null;
    isAdminOfAppOwner?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    sub?: string;
    name?: string;
    global_name?: string;
    picture?: string;
    isAdminOfAppOwner?: boolean;
    error?: string;
  }
}
