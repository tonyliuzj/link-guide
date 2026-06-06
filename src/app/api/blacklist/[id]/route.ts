import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteBlacklist } from "@/lib/db"

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  deleteBlacklist(parseInt(id))

  return NextResponse.json({ success: true })
}
