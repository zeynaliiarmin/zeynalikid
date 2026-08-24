import { createContext, useContext, type ReactNode } from 'react';

// Settings and legacy content are schema-flexible at the application boundary. Keeping the
// escape hatch here prevents `any` from being repeated across every route while migrations
// progressively add stronger domain types.
export type DynamicRecord = Record<string, any>;
export type AppContextValue = DynamicRecord & {
  cfg: DynamicRecord;
  T: DynamicRecord;
  TH: DynamicRecord;
  S: DynamicRecord;
  lang: 'fa' | 'en';
  view: string;
  setView: (view: string) => void;
  publicText: (key: string, fallback?: string) => string;
  course: DynamicRecord;
  fd: DynamicRecord;
  adminAuthed: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppContext is unavailable outside AppContextProvider.');
  return value;
}
