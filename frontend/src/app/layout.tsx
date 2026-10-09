import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AntdRegistry } from '@ant-design/nextjs-registry';

import { KmsShell } from '@/components/layout/kms-shell';
import { AppProviders } from '@/providers/app-providers';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <AppProviders>
            <KmsShell>{children}</KmsShell>
          </AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
