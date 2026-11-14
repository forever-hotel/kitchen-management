import type { Metadata } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';

import { AntdRegistry } from '@ant-design/nextjs-registry';

import { AppProviders } from '@/providers/app-providers';

import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Forever Hotel Kitchen Management System',
  description: 'Forever Hotel kitchen operations and order management',
};

/**
 * Global application layout.
 *
 * Public and protected workspace pages share the theme
 * and providers, but use different application shells.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
