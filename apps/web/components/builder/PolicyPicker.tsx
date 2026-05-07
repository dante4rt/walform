"use client"

import { Icon } from "@iconify/react"
import type { PolicyConfig, PolicyType } from "@walform/shared"

interface PolicyCard {
  type: PolicyType
  icon: string
  name: string
  description: string
}

const POLICY_CARDS: PolicyCard[] = [
  {
    type: "open",
    icon: "solar:global-linear",
    name: "Open Access",
    description: "Anyone can read responses. No restrictions.",
  },
  {
    type: "token_gated",
    icon: "solar:shield-user-linear",
    name: "Token Gated",
    description: "Require a specific on-chain asset to decrypt.",
  },
  {
    type: "allowlist",
    icon: "solar:user-check-linear",
    name: "Allowlist",
    description: "Only whitelisted addresses can read responses.",
  },
  {
    type: "time_locked",
    icon: "solar:clock-circle-linear",
    name: "Time Locked",
    description: "Responses are sealed until a specified epoch window.",
  },
]

interface PolicyPickerProps {
  value: PolicyConfig
  onChange: (policy: PolicyConfig) => void
}

export function PolicyPicker({ value, onChange }: PolicyPickerProps) {
  function selectType(type: PolicyType) {
    onChange({ type, config: {} })
  }

  function setConfig(key: string, val: unknown) {
    onChange({ ...value, config: { ...value.config, [key]: val } })
  }

  const config = value.config as Record<string, string>

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        {POLICY_CARDS.map((card) => {
          const selected = value.type === card.type
          return (
            <button
              key={card.type}
              onClick={() => selectType(card.type)}
              type="button"
              aria-pressed={selected}
              className={[
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-150",
                selected
                  ? "border-sky-500 bg-sky-500/10 text-[var(--color-ink)]"
                  : "border-[var(--color-hairline-soft)] bg-[var(--color-card)] text-[var(--color-slate)] hover:border-sky-500/40 hover:text-[var(--color-ink)]",
              ].join(" ")}
            >
              <Icon
                aria-hidden
                icon={card.icon}
                className={`h-5 w-5 shrink-0 ${selected ? "text-sky-500" : "text-[var(--color-stone)]"}`}
              />
              <span className="text-sm font-semibold leading-tight">{card.name}</span>
              <span className="text-xs leading-relaxed opacity-75">{card.description}</span>
            </button>
          )
        })}
      </div>

      {/* Config panel — slides in when a policy with config is selected */}
      <div
        className="t-panel-slide overflow-hidden"
        data-open={value.type !== "open" ? "true" : "false"}
      >
        {value.type === "token_gated" && (
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Required Move type
            </span>
            <input
              className="h-10 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 font-mono text-xs outline-none focus:border-sky-500 dark:bg-white/5"
              placeholder="0x2::coin::Coin<0x2::sui::SUI>"
              value={config.required_type ?? ""}
              onChange={(e) => setConfig("required_type", e.target.value)}
            />
            <p className="text-xs text-[var(--color-stone)]">
              Full Move type string for the on-chain asset gate.
            </p>
          </label>
        )}

        {value.type === "allowlist" && (
          <label className="grid gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Allowed addresses
            </span>
            <textarea
              className="min-h-24 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-sky-500 dark:bg-white/5"
              placeholder={"0xabc…, 0xdef…"}
              value={config.addresses ?? ""}
              onChange={(e) => setConfig("addresses", e.target.value)}
            />
            <p className="text-xs text-[var(--color-stone)]">
              Comma-separated Sui addresses that can decrypt responses.
            </p>
          </label>
        )}

        {value.type === "time_locked" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[var(--color-ink)]">Open after epoch</span>
              <input
                type="number"
                min={0}
                className="h-10 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-sky-500 dark:bg-white/5"
                placeholder="e.g. 500"
                value={config.open_after_epoch ?? ""}
                onChange={(e) => setConfig("open_after_epoch", e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[var(--color-ink)]">
                Close before epoch
              </span>
              <input
                type="number"
                min={0}
                className="h-10 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-sky-500 dark:bg-white/5"
                placeholder="e.g. 1000"
                value={config.close_before_epoch ?? ""}
                onChange={(e) => setConfig("close_before_epoch", e.target.value)}
              />
            </label>
            <p className="col-span-full text-xs text-[var(--color-stone)]">
              Sui epoch numbers. Responses decrypt only within this window.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
