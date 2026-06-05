import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getLinkById, updateLink, deleteLink } from "@/lib/db"

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

  updateLink(parseInt(id), {
    destinationUrl: body.destinationUrl,
    mode: body.mode,
    passwordHash: body.passwordHash,
    customPageConfig: body.customPageConfig,
    statsEnabled: body.statsEnabled,
    turnstileEnabled: body.turnstileEnabled,
    redirectDelay: body.redirectDelay,
    allowSkip: body.allowSkip,
    expiresAt: body.expiresAt,
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
