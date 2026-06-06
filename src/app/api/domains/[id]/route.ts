import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDomainById, updateDomain, deleteDomain, domainExists, getSiteSettings } from "@/lib/db"
import { normalizeRedirectUrl } from "@/lib/redirectUrl"
import { normalizeDomain } from "@/lib/domainUtils"

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const domain = getDomainById(parseInt(id))

  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  return NextResponse.json(domain)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const domain = getDomainById(parseInt(id))
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  const body = await req.json()
  if (body.domain && domainExists(body.domain, parseInt(id))) {
    return NextResponse.json({ error: "Domain already exists" }, { status: 400 })
  }

  let baseRedirectUrl: string | null | undefined
  if (body.baseResponse === "redirect") {
    const normalizedBaseRedirectUrl = normalizeRedirectUrl(body.baseRedirectUrl)
    if (!normalizedBaseRedirectUrl) {
      return NextResponse.json({ error: "Redirect URL must be an absolute http or https URL" }, { status: 400 })
    }
    baseRedirectUrl = normalizedBaseRedirectUrl
  } else if (body.baseRedirectUrl !== undefined) {
    baseRedirectUrl = null
  }

  try {
    updateDomain(parseInt(id), {
      domain: body.domain,
      basePath: body.basePath,
      isActive: body.isActive,
      allowGuestCreate: body.allowGuestCreate,
      turnstileSiteKey: body.turnstileSiteKey,
      turnstileSecretKey: body.turnstileSecretKey,
      baseResponse: body.baseResponse,
      baseRedirectUrl,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update domain" },
      { status: 400 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const domain = getDomainById(parseInt(id))
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  const siteDomain = getSiteSettings()?.site_domain
  if (siteDomain && normalizeDomain(siteDomain) === normalizeDomain(domain.domain)) {
    return NextResponse.json({ error: "Cannot delete the configured site domain" }, { status: 400 })
  }

  deleteDomain(parseInt(id))

  return NextResponse.json({ success: true })
}
