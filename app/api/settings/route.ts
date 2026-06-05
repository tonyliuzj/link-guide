import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteSettings, updateSiteSettings } from "@/lib/db"

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = getSiteSettings()
  return NextResponse.json(settings || { site_title: 'LinkGuide', site_domain: '' })
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

  updateSiteSettings(
    body.siteTitle,
    body.siteDomain,
    body.turnstileSiteKey,
    body.turnstileSecretKey,
    body.turnstileLandingCreate,
    body.turnstileLogin,
    body.turnstileSignup
  )

  return NextResponse.json({ success: true })
}
