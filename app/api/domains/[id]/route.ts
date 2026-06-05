import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDomainById, updateDomain, deleteDomain } from "@/lib/db"

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
  const body = await req.json()

  try {
    updateDomain(parseInt(id), {
      domain: body.domain,
      basePath: body.basePath,
      isActive: body.isActive,
      allowGuestCreate: body.allowGuestCreate,
      turnstileSiteKey: body.turnstileSiteKey,
      turnstileSecretKey: body.turnstileSecretKey,
      baseResponse: body.baseResponse,
      baseRedirectUrl: body.baseRedirectUrl,
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
  deleteDomain(parseInt(id))

  return NextResponse.json({ success: true })
}
