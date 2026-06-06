import { LoginForm } from "@/components/loginForm"
import { getSiteSettings } from "@/lib/db"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function Page() {
  const settings = getSiteSettings()

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <LoginForm
          turnstileSiteKey={settings?.turnstile_site_key || ""}
          turnstileRequired={settings?.turnstile_login === 1}
        />
      </div>
    </div>
  )
}
