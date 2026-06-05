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
  updateSiteSettings(body.siteTitle, body.siteDomain)

  return NextResponse.json({ success: true })
}
