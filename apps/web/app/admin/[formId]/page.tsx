import { AdminDashboard } from "@/components/admin/admin-dashboard"

interface AdminPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  return [{ formId: "demo" }]
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { formId } = await params

  return <AdminDashboard formId={formId} />
}
