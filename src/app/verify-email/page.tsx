import { redirect } from "next/navigation"
import { VerifyEmail } from "@/components/verifyEmail"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) redirect("/login")

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <VerifyEmail token={token} />
      </div>
    </div>
  )
}
