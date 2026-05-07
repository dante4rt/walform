import { PublicForm } from "@/components/form/public-form"
import { getDemoFormSchema } from "@/lib/demo-form"

interface FormPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  const demoFormId = process.env.NEXT_PUBLIC_WALFORM_DEMO_FORM_ID
  const formIds = ["demo", demoFormId].filter((formId): formId is string => Boolean(formId))

  return [...new Set(formIds)].map((formId) => ({ formId }))
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params
  const schema = getDemoFormSchema(formId)

  return <PublicForm formId={formId} schema={schema} />
}
