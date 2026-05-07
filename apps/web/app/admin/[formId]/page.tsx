import { AdminDashboard } from "@/components/admin/admin-dashboard"

interface AdminPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  const demoFormId = process.env.NEXT_PUBLIC_WALFORM_DEMO_FORM_ID
  const formIds = ["demo", demoFormId].filter((formId): formId is string => Boolean(formId))

  return [...new Set(formIds)].map((formId) => ({ formId }))
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { formId } = await params

  return <AdminDashboard formId={formId} />
}
