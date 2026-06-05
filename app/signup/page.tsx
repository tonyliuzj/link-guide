import { SignupForm } from "@/components/signup-form"
import { getSiteSettings } from "@/lib/db"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function Page() {
  const settings = getSiteSettings()

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2">Sign up to get started</p>
        </div>
        <SignupForm
          turnstileSiteKey={settings?.turnstile_site_key || ""}
          turnstileRequired={settings?.turnstile_signup === 1}
        />
      </div>
    </div>
  )
}
