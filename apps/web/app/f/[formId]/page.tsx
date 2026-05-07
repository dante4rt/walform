import { PublicForm } from "@/components/form/public-form"
import { getDemoFormSchema } from "@/lib/demo-form"

interface FormPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  return [{ formId: "demo" }]
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params
  const schema = getDemoFormSchema(formId)

  return <PublicForm formId={formId} schema={schema} />
}
