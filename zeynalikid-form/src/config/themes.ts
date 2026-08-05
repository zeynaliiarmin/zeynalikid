export const themeIds = ['light', 'cream', 'ocean', 'dark', 'motherly', 'trust', 'blend', 'motherly-trust'] as const;
export type ThemeId = (typeof themeIds)[number];
