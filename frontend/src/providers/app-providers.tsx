'use client';

import { ConfigProvider } from 'antd';
import type { PropsWithChildren } from 'react';

import { kmsTheme } from '@/config/theme';

export function AppProviders({ children }: PropsWithChildren) {
  return <ConfigProvider theme={kmsTheme}>{children}</ConfigProvider>;
}
