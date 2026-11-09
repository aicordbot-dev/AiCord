import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AiCord — 3D AI Discord Server Architect & Universal Community Engine',
  description:
    'Synthesize entire Discord servers with Google Gemini AI, customize holographic decks with 6 universal themes, and power communities with 30+ enterprise services.',
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
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#070913] text-gray-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
