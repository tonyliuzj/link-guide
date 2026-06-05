import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDomainById, getLinkById, updateLink, deleteLink } from "@/lib/db"
import { normalizeRedirectUrl } from "@/lib/redirect-url"
import { normalizeExpiresAt, normalizeLinkMode, normalizeRedirectDelay } from "@/lib/link-rules"
import { hash } from "bcryptjs"

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  if (session.user.role !== 'admin' && link.user_id !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(link)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  if (session.user.role !== 'admin' && link.user_id !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const nextMode = body.mode === undefined ? link.mode : normalizeLinkMode(body.mode)
  if (!nextMode) {
    return NextResponse.json({ error: "Invalid redirect mode" }, { status: 400 })
  }

  let destinationUrl: string | undefined
  if (body.destinationUrl !== undefined) {
    const normalizedDestinationUrl = normalizeRedirectUrl(body.destinationUrl)
    if (!normalizedDestinationUrl) {
      return NextResponse.json({ error: "Destination URL must be an absolute http or https URL" }, { status: 400 })
    }
    destinationUrl = normalizedDestinationUrl
  }

  let redirectDelay: number | undefined
  if (body.redirectDelay !== undefined) {
    const normalizedRedirectDelay = normalizeRedirectDelay(body.redirectDelay)
    if (normalizedRedirectDelay === null) {
      return NextResponse.json({ error: "Redirect delay must be a whole number between 0 and 86400 seconds" }, { status: 400 })
    }
    redirectDelay = normalizedRedirectDelay
  }

  let expiresAt: string | null | undefined
  if (body.expiresAt !== undefined) {
    const normalizedExpiresAt = normalizeExpiresAt(body.expiresAt)
    if (body.expiresAt && !normalizedExpiresAt) {
      return NextResponse.json({ error: "Expiration date is invalid" }, { status: 400 })
    }
    expiresAt = normalizedExpiresAt
  }

  let passwordHash: string | null | undefined
  if (nextMode === "password") {
    if (body.password) {
      passwordHash = await hash(body.password, 10)
    } else if (link.mode !== "password" || !link.password_hash) {
      return NextResponse.json({ error: "Password is required for password-protected links" }, { status: 400 })
    }
  } else if (link.password_hash) {
    passwordHash = null
  }

  const customPageConfig = nextMode === "custom_page"
    ? body.customPageConfig
    : null

  if (body.turnstileEnabled === true) {
    const domain = getDomainById(link.domain_id)
    if (!domain?.turnstile_site_key || !domain?.turnstile_secret_key) {
      return NextResponse.json({ error: "Turnstile is not configured for this domain" }, { status: 400 })
    }
  }

  updateLink(parseInt(id), {
    destinationUrl,
    mode: nextMode,
    passwordHash,
    customPageConfig,
    statsEnabled: body.statsEnabled,
    turnstileEnabled: body.turnstileEnabled,
    redirectDelay,
    allowSkip: body.allowSkip,
    expiresAt,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  if (session.user.role !== 'admin' && link.user_id !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  deleteLink(parseInt(id))

  return NextResponse.json({ success: true })
}
