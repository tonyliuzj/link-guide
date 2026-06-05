import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteDomain, getDomainById, getSiteSettings } from "@/lib/db"
import { normalizeDomain } from "@/lib/domain-utils"

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const siteDomain = normalizeDomain(getSiteSettings()?.site_domain || "")

  for (const id of ids) {
    const domain = getDomainById(id)
    if (!domain) continue
    if (siteDomain && normalizeDomain(domain.domain) === siteDomain) continue

    deleteDomain(id)
  }

  return NextResponse.json({ success: true })
}
