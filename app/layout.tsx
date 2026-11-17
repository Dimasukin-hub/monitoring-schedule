import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: {
    default: 'field establishment',
    template: '%s | field establishment',
  },
  description: 'Field Establishment - Enterprise Land Monitoring, Preparation, Planting, and Production Schedule Dashboard',
  manifest: '/manifest.json',
  applicationName: 'field establishment',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'field establishment',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/assets/Favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full light" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="field establishment" />
      </head>
      <body className="font-sans min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-200">
        <AuthProvider>
          <ThemeProvider>
            <PwaRegister />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
