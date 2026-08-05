export const themeIds = ['light', 'cream', 'ocean', 'dark'] as const;
export type ThemeId = (typeof themeIds)[number];
