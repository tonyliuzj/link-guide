import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getLinkById, deleteLink } from "@/lib/db"

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  for (const id of ids) {
    const link = getLinkById(id)
    if (!link) continue

    if (session.user.role !== 'admin' && link.user_id !== parseInt(session.user.id)) {
      continue
    }

    deleteLink(id)
  }

  return NextResponse.json({ success: true })
}
