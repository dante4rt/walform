import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] px-5 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-pressed)]",
        accent: "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[#FBBF24]",
        outline: "border border-[var(--color-hairline-soft)] bg-transparent text-[var(--color-ink)] hover:bg-white/50 dark:hover:bg-white/10",
        ghost: "bg-transparent text-[var(--color-ink)] hover:bg-white/50 dark:hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ asChild = false, className, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />
}

export { buttonVariants }
