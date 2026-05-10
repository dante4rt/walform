"use client"

import { Icon } from "@iconify/react"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui"
import { loadKnownForms, type KnownForm } from "@/lib/form-registry"
import { getConfiguredPackageId } from "@/lib/sui"
import { formatFormId } from "@/lib/utils"

type FormSource = "local" | "wallet" | "local+wallet"

interface AdminLookupForm extends KnownForm {
  source: FormSource
}

export function AdminLookup() {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const accountAddress = currentAccount?.address ?? null
  const suiClient = useSuiClient()
  const [formId, setFormId] = useState("")
  const [knownForms, setKnownForms] = useState<KnownForm[]>([])
  const [walletForms, setWalletForms] = useState<KnownForm[]>([])
  const [walletLoadState, setWalletLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setKnownForms(loadKnownForms()), 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    let cancelled = false
    const packageId = getConfiguredPackageId()

    if (!accountAddress || !packageId) {
      return
    }

    window.setTimeout(() => {
      if (!cancelled) {
        setWalletLoadState("loading")
      }
    }, 0)

    suiClient
      .getOwnedObjects({
        owner: accountAddress,
        filter: { StructType: `${packageId}::form::Form` },
        options: { showType: true },
        limit: 50,
      })
      .then((result) => {
        if (cancelled) {
          return
        }

        const localForms = loadKnownForms()
        const forms = result.data.flatMap((item) => {
          const objectId = item.data?.objectId
          if (!objectId) {
            return []
          }

          const localMatch = localForms.find((form) => form.formId === objectId)
          return [
            {
              formId: objectId,
              title: localMatch?.title ?? "Sui Form object",
              owner: accountAddress,
              createdAtMs: localMatch?.createdAtMs ?? 0,
            },
          ]
        })

        setWalletForms(forms)
        setWalletLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) {
          setWalletForms([])
          setWalletLoadState("error")
        }
      })

    return () => {
      cancelled = true
    }
  }, [accountAddress, suiClient])

  const visibleWalletLoadState = accountAddress ? walletLoadState : "idle"
  const forms = useMemo(
    () =>
      mergeLookupForms(
        knownForms,
        accountAddress ? walletForms.filter((form) => form.owner === accountAddress) : [],
      ),
    [accountAddress, knownForms, walletForms],
  )
  const normalizedFormId = formId.trim()

  function openAdmin(targetFormId = normalizedFormId) {
    const trimmed = targetFormId.trim()
    if (!trimmed) {
      return
    }

    router.push(`/admin/?formId=${encodeURIComponent(trimmed)}`)
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)] md:px-8">
      <section className="mx-auto max-w-4xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-tint-mint)] text-[var(--color-primary)]">
            <Icon icon="solar:shield-keyhole-linear" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">
              Admin lookup
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-[var(--color-ink)]">
              Open a form dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">
              Paste a form object ID, or connect the creator wallet to list Form objects owned by
              that wallet.
            </p>
          </div>
        </div>

        <form
          className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            openAdmin()
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Form ID</span>
            <input
              value={formId}
              onChange={(event) => setFormId(event.target.value)}
              placeholder="0x... or demo"
              className="w-full h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-charcoal)] outline-none transition-colors placeholder:font-sans placeholder:text-[var(--color-stone)] focus:border-[var(--color-primary)]"
            />
          </label>
          <div className="flex items-end">
            <Button
              className="h-11 w-full rounded-[var(--radius-button)] px-4 sm:w-auto"
              disabled={!normalizedFormId}
              type="submit"
            >
              <Icon icon="solar:magnifer-linear" className="h-4 w-4" />
              Open admin
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 rounded-[var(--radius-button)] text-xs">
            <Link href="/admin/?formId=demo">
              <Icon icon="solar:play-circle-linear" className="h-4 w-4" />
              Demo admin
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-9 rounded-[var(--radius-button)] text-xs">
            <Link href="/builder/">
              <Icon icon="solar:add-square-linear" className="h-4 w-4" />
              Create form
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-4xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-2 border-b border-[var(--color-hairline-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Available forms</h2>
            <p className="mt-1 text-xs text-[var(--color-slate)]">
              Local deployments are saved in this browser. Wallet forms are read from Sui.
            </p>
          </div>
          <WalletState state={visibleWalletLoadState} connected={Boolean(accountAddress)} />
        </div>

        {forms.length > 0 ? (
          <div className="divide-y divide-[var(--color-hairline-soft)]">
            {forms.map((form) => (
              <FormLookupRow key={form.formId} form={form} onOpen={openAdmin} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[var(--color-slate)]">
              <Icon icon="solar:folder-open-linear" className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
              No forms found yet
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-6 text-[var(--color-slate)]">
              Paste a form ID above, connect the owner wallet, or deploy a form from the builder.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function FormLookupRow({
  form,
  onOpen,
}: {
  form: AdminLookupForm
  onOpen: (formId: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">{form.title}</h3>
          <SourceBadge source={form.source} />
        </div>
        <p className="mt-1 truncate font-mono text-xs text-[var(--color-slate)]">
          {formatFormId(form.formId)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-9 rounded-[var(--radius-button)] px-3 text-xs"
          onClick={() => onOpen(form.formId)}
          type="button"
        >
          <Icon icon="solar:shield-user-linear" className="h-4 w-4" />
          Admin
        </Button>
        <Button asChild variant="outline" className="h-9 rounded-[var(--radius-button)] text-xs">
          <Link href={`/f/?formId=${encodeURIComponent(form.formId)}&from=admin`}>
            <Icon icon="solar:eye-linear" className="h-4 w-4" />
            Public
          </Link>
        </Button>
      </div>
    </div>
  )
}

function WalletState({
  state,
  connected,
}: {
  state: "idle" | "loading" | "ready" | "error"
  connected: boolean
}) {
  if (!connected) {
    return (
      <span className="text-xs font-medium text-[var(--color-slate)]">
        Connect wallet to scan owned forms
      </span>
    )
  }

  if (state === "loading") {
    return <span className="text-xs font-medium text-[var(--color-slate)]">Scanning Sui...</span>
  }

  if (state === "error") {
    return <span className="text-xs font-medium text-[var(--color-error)]">Sui scan failed</span>
  }

  if (state === "idle") {
    return (
      <span className="text-xs font-medium text-[var(--color-slate)]">Wallet scan unavailable</span>
    )
  }

  return <span className="text-xs font-medium text-[var(--color-success)]">Wallet scan ready</span>
}

function SourceBadge({ source }: { source: FormSource }) {
  const label =
    source === "local+wallet" ? "Local + wallet" : source === "wallet" ? "Wallet" : "Local"

  return (
    <span className="rounded-[var(--radius-pill)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-slate)]">
      {label}
    </span>
  )
}

function mergeLookupForms(localForms: KnownForm[], walletForms: KnownForm[]): AdminLookupForm[] {
  const forms = new Map<string, AdminLookupForm>()

  for (const form of localForms) {
    forms.set(form.formId, { ...form, source: "local" })
  }

  for (const form of walletForms) {
    const existing = forms.get(form.formId)
    forms.set(form.formId, {
      ...form,
      title: existing?.title ?? form.title,
      createdAtMs: Math.max(existing?.createdAtMs ?? 0, form.createdAtMs),
      source: existing ? "local+wallet" : "wallet",
    })
  }

  return [...forms.values()].sort((first, second) => second.createdAtMs - first.createdAtMs)
}
