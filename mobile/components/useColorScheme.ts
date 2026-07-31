// ImmoGuinée mobile is explicitly light-only (see design audit 2026-07). Dark mode is
// scaffolded (Colors.dark / themeColors.dark) but not wired to screens; to avoid the
// half-dark inconsistency (dark nav chrome vs. light screens), we opt out of dark mode
// app-wide. Mirrors useColorScheme.web.ts which already returns 'light'.
export function useColorScheme(): 'light' {
  return 'light';
}