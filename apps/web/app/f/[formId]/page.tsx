import { getDemoFormSchema } from "@/lib/demo-form"

import { FormWithPreview } from "./form-with-preview"

interface FormPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  const demoFormId = process.env.NEXT_PUBLIC_WALFORM_DEMO_FORM_ID
  const formIds = ["demo", "walrus-sessions-feedback", demoFormId].filter(
    (formId): formId is string => Boolean(formId),
  )

  return [...new Set(formIds)].map((formId) => ({ formId }))
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params
  const schema = getDemoFormSchema()

  return <FormWithPreview formId={formId} fallbackSchema={schema} />
}
