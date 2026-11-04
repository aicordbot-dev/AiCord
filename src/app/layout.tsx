import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AiCord',
  description: 'AI-powered Discord server builder and manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
