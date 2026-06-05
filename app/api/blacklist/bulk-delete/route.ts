import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteBlacklist } from "@/lib/db"

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

  for (const id of ids) {
    deleteBlacklist(id)
  }

  return NextResponse.json({ success: true })
}
