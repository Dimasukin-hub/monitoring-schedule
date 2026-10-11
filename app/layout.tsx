import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Monitor Schedule 2026 - Operational Dashboard',
  description: 'Enterprise Land Monitoring, Preparation, Planting, and Production Schedule Dashboard 2026',
  icons: {
    icon: [
      { url: '/assets/Favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/assets/Favicon.ico',
    apple: '/assets/Favicon.ico',
  },
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-200`}>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
