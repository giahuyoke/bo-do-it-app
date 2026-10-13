export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const themeStorageKey = "bo-do-it-theme";
export const darkSchemeQuery = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/** Puts the theme on <html>: CSS reads `data-theme`, native controls read `color-scheme`. */
export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Runs in <head> before the first paint, so a saved dark theme never flashes
 * light. Mirrors `resolveTheme` + `applyTheme`; keep the three in step.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(themeStorageKey)});var d=p==="dark"||(p!=="light"&&matchMedia(${JSON.stringify(darkSchemeQuery)}).matches);var t=d?"dark":"light";var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t}catch(e){}})()`;
