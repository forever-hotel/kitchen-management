import type { ThemeConfig } from 'antd';

/*
 * Central Ant Design theme for the Kitchen Management System.
 *
 * The colours follow the shared Forever Hotel frontend standard.
 * Feature-specific styling should remain inside feature components rather
 * than expanding this global theme unnecessarily.
 */
export const kmsTheme: ThemeConfig = {
  token: {
    /*
     * Forever Hotel brand colours.
     */
    colorPrimary: '#1A3C5E',
    colorLink: '#1A3C5E',
    colorInfo: '#2E5F8A',

    /*
     * Semantic colours.
     */
    colorSuccess: '#1A6B3C',
    colorWarning: '#7A4F00',
    colorError: '#8B1A1A',

    /*
     * Shared surfaces.
     */
    colorBgLayout: '#F5F3EF',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',

    /*
     * Text and borders.
     */
    colorText: '#1A1A18',
    colorTextSecondary: '#5A5650',
    colorBorder: '#DDD8CF',

    /*
     * Shared sizing.
     *
     * 44px provides the base control size required by the SDS
     * accessibility guidance for interactive touch targets.
     */
    controlHeight: 44,
    fontSize: 16,
    borderRadius: 8,
  },

  components: {
    Button: {
      primaryShadow: 'none',
    },

    Table: {
      headerBg: '#E8EEF4',
      borderColor: '#DDD8CF',
      rowHoverBg: '#F9F7F4',
    },

    Tag: {
      borderRadiusSM: 999,
    },
  },
};
