"use client"

import { Icon } from "@iconify/react"

import { useTheme, type Theme } from "@/hooks/use-theme"

const options: Array<{ value: Theme; icon: string; label: string }> = [
  { value: "light", icon: "solar:sun-linear", label: "Light" },
  { value: "dark", icon: "solar:moon-linear", label: "Dark" },
  { value: "system", icon: "solar:monitor-smartphone-linear", label: "System" },
]

/**
 * Three-state theme toggle: light · dark · system.
 * Renders a segmented button row. Respects prefers-reduced-motion.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { rawTheme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`inline-flex rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-0.5 ${className ?? ""}`}
    >
      {options.map(({ value, icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={rawTheme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={`flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-button)-2px)] transition-colors ${
            rawTheme === value
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"
          }`}
        >
          <Icon icon={icon} className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
