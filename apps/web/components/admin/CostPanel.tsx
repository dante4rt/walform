"use client"

import { Icon } from "@iconify/react"

import { estimateCostMist, formatCostWal, EPOCHS_DEFAULT } from "@/lib/cost"
import { QUILT_COMPRESSION_FACTOR, QUILT_THRESHOLD, shouldUseQuilt } from "@/lib/quilts"

interface CostPanelProps {
  responseCount: number
}

export function CostPanel({ responseCount }: CostPanelProps) {
  const quiltActive = shouldUseQuilt(responseCount)

  // Real WAL costs based on Walrus testnet pricing
  const soloCostMist = estimateCostMist({ responseCount, epochs: EPOCHS_DEFAULT })
  const quiltedCostMist =
    responseCount > 0 ? soloCostMist / BigInt(QUILT_COMPRESSION_FACTOR) : BigInt(0)
  const savingsPct =
    responseCount > 0
      ? Math.round((Number(soloCostMist - quiltedCostMist) / Number(soloCostMist)) * 1000) / 10
      : 0

  // Bar widths: solo is always 100%, quilted is proportional.
  const quiltedBarPct =
    responseCount > 0 ? Math.max(4, (Number(quiltedCostMist) / Number(soloCostMist)) * 100) : 4

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">Storage cost estimate</h2>
        <p className="mt-1 text-sm text-[var(--color-slate)]">
          Estimated cost over{" "}
          <span className="font-medium text-[var(--color-charcoal)]">{EPOCHS_DEFAULT} epochs</span>{" "}
          based on Walrus testnet pricing.{" "}
          <span className="font-medium text-[var(--color-charcoal)]">
            {QUILT_COMPRESSION_FACTOR}x compression
          </span>{" "}
          assumed for quilt batching. Costs vary by blob size and network epoch prices.
        </p>
      </div>

      {/* Cost comparison table */}
      <div className="overflow-hidden rounded-lg border border-[var(--color-hairline-soft)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-hairline-soft)] bg-[var(--color-canvas)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                Upload method
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                Cost (WAL)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline-soft)] bg-[var(--color-card)]">
            <tr>
              <td className="px-4 py-3 text-[var(--color-charcoal)]">
                Solo uploads ({responseCount} {responseCount === 1 ? "response" : "responses"})
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-charcoal)]">
                {formatCostWal(soloCostMist)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-[var(--color-charcoal)]">
                Quilted uploads ({responseCount} {responseCount === 1 ? "response" : "responses"})
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--color-charcoal)]">
                {formatCostWal(quiltedCostMist)}
              </td>
            </tr>
            <tr className="bg-emerald-50">
              <td className="px-4 py-3 font-semibold text-emerald-700">
                <span className="flex items-center gap-2">
                  <Icon icon="solar:leaf-linear" className="h-4 w-4" />
                  Savings
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-lg font-bold text-emerald-600">
                {savingsPct}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Visual bar comparison */}
      <div
        className="rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4"
        aria-label="Cost ratio chart"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
          Cost ratio
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>Solo</span>
              <span className="font-mono">{formatCostWal(soloCostMist)}</span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-md bg-[var(--color-canvas)]">
              <div
                className="h-full rounded-md bg-[var(--color-primary)] transition-[width] duration-500 ease-out"
                style={{ width: "100%" }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>Quilted</span>
              <span className="font-mono">{formatCostWal(quiltedCostMist)}</span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-md bg-[var(--color-canvas)]">
              <div
                className="h-full rounded-md bg-emerald-500 transition-[width] duration-500 ease-out"
                style={{ width: `${quiltedBarPct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Batch threshold callout */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
          quiltActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] text-[var(--color-charcoal)]"
        }`}
      >
        <Icon
          icon={quiltActive ? "solar:check-circle-linear" : "solar:info-circle-linear"}
          className={`mt-0.5 h-5 w-5 shrink-0 ${quiltActive ? "text-emerald-600" : "text-[var(--color-slate)]"}`}
        />
        <div>
          <p className="font-semibold">Batch threshold</p>
          <p className="mt-0.5">
            {quiltActive ? (
              <>
                Quilt batching is <span className="font-semibold text-emerald-700">active</span> —{" "}
                {responseCount} responses queued, threshold is ≥{QUILT_THRESHOLD}.
              </>
            ) : (
              <>
                Quilt activates when ≥{QUILT_THRESHOLD} responses are queued. Currently{" "}
                <span className="font-semibold">{responseCount}</span> — need{" "}
                <span className="font-semibold">
                  {Math.max(0, QUILT_THRESHOLD - responseCount)}
                </span>{" "}
                more.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
