type Theme = "light" | "dark" | "system"

export type { Theme }

const STORAGE_KEY = "walform:theme"

/**
 * Read the persisted theme preference. Returns "system" when nothing is stored
 * or when called on the server (where localStorage is unavailable).
 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system"
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === "light" || raw === "dark") return raw
  return "system"
}

/** Persist a theme preference and apply it to the document. */
export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

/** Resolve "system" to the OS-level preference. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Apply the theme by toggling the `dark` class on <html>.
 * Called once on mount and whenever the preference changes.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return
  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

/** Subscribe to OS-level theme changes. Returns an unsubscribe function. */
export function onSystemThemeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const handler = (event: MediaQueryListEvent) => callback(event.matches)
  mq.addEventListener("change", handler)
  return () => mq.removeEventListener("change", handler)
}
