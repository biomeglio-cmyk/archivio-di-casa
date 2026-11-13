// Whether the active theme is dark, for code outside components that builds display colors
// (db/categories.ts mapCategory: the night tiles of "Pastello"). Kept by the ThemeProvider;
// useDbQuery re-runs its queries when the theme changes, so the colors follow.
let activeDark = false;

export function setActiveDark(dark: boolean): void {
  activeDark = dark;
}

export function isActiveDark(): boolean {
  return activeDark;
}
