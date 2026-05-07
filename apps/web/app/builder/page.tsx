import { Suspense } from "react"

import { BuilderEntry } from "@/components/builder"

export default function BuilderPage() {
  return (
    <Suspense>
      <BuilderEntry />
    </Suspense>
  )
}
