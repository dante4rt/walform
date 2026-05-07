"use client"

import { costPerThousandResponses, EPOCHS_DEFAULT, estimateCostMist, formatCostWal } from "@/lib/cost"

interface CostBadgeProps {
  /** If provided, shows actual cost for this many responses alongside the per-1k rate. */
  responseCount?: number
  /** Storage epoch count. Defaults to EPOCHS_DEFAULT (26). */
  epochs?: number
  className?: string
}

/**
 * Inline pill showing estimated Walrus storage cost.
 * Fades in on mount; respects prefers-reduced-motion.
 */
export function CostBadge({ responseCount, epochs = EPOCHS_DEFAULT, className }: CostBadgeProps) {
  const perThousand = costPerThousandResponses(epochs)

  const actualLabel =
    responseCount !== undefined && responseCount > 0
      ? ` · ${formatCostWal(estimateCostMist({ responseCount, epochs }))} now`
      : ""

  return (
    <>
      <style>{`
        @keyframes cost-badge-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cost-badge {
          animation: cost-badge-fade-in 300ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .cost-badge { animation: none; }
        }
      `}</style>
      <span
        className={`cost-badge inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 ${className ?? ""}`}
      >
        <span>~{perThousand} / 1k responses · {epochs} epochs{actualLabel}</span>
      </span>
    </>
  )
}
