import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/auth/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AiCord — 3D AI Discord Server Architect & Universal Community Engine',
  description:
    'Your Discord server, built by AI in minutes. Synthesize full category layouts, permission overrides, and automod in seconds. Style interactive profiles with 6 universal themes, and power communities with 28+ enterprise services.',
  keywords: [
    'Discord Bot',
    'AI Discord Builder',
    'Discord Architect',
    'Three.js 3D',
    'AiCord',
    'Discord Economy',
    'Discord Moderation',
    'Gemini AI',
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#070913',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark scroll-smooth ${inter.variable} ${jetbrainsMono.variable}`}
      data-theme="cyberpunk"
    >
      <body className="bg-[#070913] text-gray-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-black font-sans bg-blueprint-grid">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
