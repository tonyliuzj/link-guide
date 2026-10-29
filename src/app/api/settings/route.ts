import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteSettings, purgeOldStats, updateSiteSettings } from "@/lib/db"
import { isMailConfigured } from "@/lib/mail"

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = getSiteSettings()
  return NextResponse.json({ ...(settings || { site_title: 'LinkGuide', site_domain: '' }), mail_configured: isMailConfigured() })
}

export async function PUT(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  if (!body.siteDomain || body.siteDomain.trim() === '') {
    return NextResponse.json({ error: "Site domain is required" }, { status: 400 })
  }

  const requiresTurnstile = body.turnstileLandingCreate || body.turnstileLogin || body.turnstileSignup
  if (requiresTurnstile && (!body.turnstileSiteKey || !body.turnstileSecretKey)) {
    return NextResponse.json({ error: "Turnstile site key and secret key are required before enabling verification" }, { status: 400 })
  }

  let statsRetentionDays: number | undefined
  if (body.statsRetentionDays !== undefined) {
    const days = Number(body.statsRetentionDays)
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      return NextResponse.json({ error: "Statistics retention must be a whole number of days between 0 and 3650" }, { status: 400 })
    }
    statsRetentionDays = days
  }

  updateSiteSettings(
    body.siteTitle,
    body.siteDomain,
    body.turnstileSiteKey,
    body.turnstileSecretKey,
    body.turnstileLandingCreate,
    body.turnstileLogin,
    body.turnstileSignup,
    statsRetentionDays
  )
  purgeOldStats(true)

  return NextResponse.json({ success: true })
}
