"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

import {
  applyTheme,
  getStoredTheme,
  onSystemThemeChange,
  resolveTheme,
  setTheme as persistTheme,
  type Theme,
} from "@/lib/theme"

/** Snapshot cache so useSyncExternalStore sees referential stability. */
let currentTheme: Theme = "system"
let listeners: Array<() => void> = []

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot(): Theme {
  return currentTheme
}

function notify(): void {
  for (const listener of listeners) listener()
}

/**
 * Client-side hook that syncs the current theme across components.
 * Returns `[resolvedTheme, setTheme]` — resolvedTheme is always "light" | "dark".
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const resolved = resolveTheme(theme)

  useEffect(() => {
    // Sync from localStorage on mount (handles SSR → hydration mismatch).
    currentTheme = getStoredTheme()
    applyTheme(currentTheme)
    notify()

    // Re-apply when the OS preference changes and user is on "system".
    const unsub = onSystemThemeChange(() => {
      if (currentTheme === "system") {
        applyTheme("system")
        notify()
      }
    })
    return unsub
  }, [])

  const setTheme = useCallback((next: Theme) => {
    currentTheme = next
    persistTheme(next)
    notify()
  }, [])

  return { theme: resolved, rawTheme: theme, setTheme } as const
}

export type { Theme }
