"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyTheme,
  darkSchemeQuery,
  isThemePreference,
  resolveTheme,
  themeStorageKey,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// `storage` only fires in other tabs, so this tab announces its own writes.
const localChangeEvent = "bo-do-it-theme-change";

function subscribePreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(localChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(localChangeEvent, onChange);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeSystemDark(onChange: () => void) {
  const media = window.matchMedia(darkSchemeQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    readPreference,
    () => "system" as const,
  );
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    () => window.matchMedia(darkSchemeQuery).matches,
    () => false,
  );
  const theme = resolveTheme(preference, systemDark);

  // The boot script already set this on a hard load; re-applying covers
  // changes, and React's dev remount clearing attributes on <html>.
  useLayoutEffect(() => applyTheme(theme), [theme]);

  const setPreference = (next: ThemePreference) => {
    try {
      if (next === "system") localStorage.removeItem(themeStorageKey);
      else localStorage.setItem(themeStorageKey, next);
    } catch {
      // Storage is blocked (e.g. private mode): the theme keeps following the system.
    }
    window.dispatchEvent(new Event(localChangeEvent));
  };

  return (
    <ThemeContext value={{ preference, theme, setPreference }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
