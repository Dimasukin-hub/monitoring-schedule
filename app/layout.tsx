import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: {
    default: 'Field Establishment',
    template: '%s | Field Establishment',
  },
  description: 'Field Establishment - Enterprise Land Monitoring, Preparation, Planting, and Production Schedule Dashboard',
  manifest: '/manifest.json',
  applicationName: 'Field Establishment',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Field Establishment',
  },
  icons: {
    icon: [
      { url: '/assets/logo.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/assets/logo.png', type: 'image/png' },
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
        <meta name="apple-mobile-web-app-title" content="Field Establishment" />
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
