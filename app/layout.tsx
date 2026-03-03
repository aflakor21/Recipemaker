import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recipe to Shopping List',
  description: 'Turn recipe and TikTok links into smart, shareable shopping lists.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
