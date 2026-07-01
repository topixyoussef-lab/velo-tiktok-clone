import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Web3Provider from '@/components/Web3Provider';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'VELO',
  description: 'VELO - Video sharing platform',
  manifest: '/manifest.json',
  icons: {
    icon: { url: '/favicon.png', type: 'image/png' },
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VELO',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--bg-app)] text-[var(--text-primary)] h-screen overflow-hidden" suppressHydrationWarning>
        <Web3Provider>
          <ThemeProvider>
            <Navbar />
            <main className="h-full pt-14 pb-14">
              {children}
            </main>
            <BottomNav />
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
