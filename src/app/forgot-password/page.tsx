import { redirect } from "next/navigation"
import { ForgotPasswordForm } from "@/components/forgotPasswordForm"
import { isMailConfigured } from "@/lib/mail"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function Page() {
  if (!isMailConfigured()) redirect("/login")

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
