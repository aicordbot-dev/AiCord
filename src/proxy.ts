/**
 * src/proxy.ts
 * Next.js 16 request interceptor (proxy convention).
 * Protects dashboard routes, enforces authentication, and defends against open-redirects.
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getSafeCallbackUrl } from '@/lib/safe-redirect';

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isProtected = pathname.startsWith('/dashboard');

  if (isProtected) {
    // If demo mode is active, allow seamless access
    if (isDemoMode()) {
      return NextResponse.next();
    }

    const isLoggedIn = Boolean(req.auth?.user);
    if (!isLoggedIn) {
      const fullPath = getSafeCallbackUrl(`${pathname}${search}`, '/dashboard');
      const loginUrl = new URL('/login', req.nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', fullPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
