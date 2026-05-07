"use client"

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { ThemeToggle } from "@/components/theme-toggle"

const navLinks = [
  { href: "/builder/", label: "Builder" },
  { href: "/templates/", label: "Templates" },
]

export function Navbar() {
  const pathname = usePathname()
  const account = useCurrentAccount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8">
        {/* Left: Logo + Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-serif text-lg font-normal italic tracking-tight text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
          >
            Walform
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href.replace(/\/$/, ""))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-tint-mint)] text-[var(--color-primary)]"
                      : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            {account && (
              <Link
                href={`/admin/demo`}
                className={`rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-[var(--color-tint-mint)] text-[var(--color-primary)]"
                    : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Right: Wallet + Theme + Mobile menu */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Wallet connect */}
          <div className="navbar-wallet">
            <ConnectButton
              connectText="Connect wallet"
              className="!h-8 !rounded-[var(--radius-button)] !border !border-[var(--color-hairline-soft)] !bg-[var(--color-card)] !px-3 !text-xs !font-medium !text-[var(--color-charcoal)] hover:!bg-[var(--color-canvas)]"
            />
          </div>

          {/* Connected address indicator */}
          {account && (
            <span className="hidden items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] px-2.5 py-1 font-mono text-[11px] text-[var(--color-slate)] md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-slate)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-charcoal)] md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href.replace(/\/$/, ""))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-tint-mint)] text-[var(--color-primary)]"
                      : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            {account && (
              <Link
                href="/admin/demo"
                onClick={() => setMobileOpen(false)}
                className="rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
              >
                Admin
              </Link>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline-soft)] pt-3">
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
