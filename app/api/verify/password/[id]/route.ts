import { NextRequest, NextResponse } from "next/server"
import { getLinkById } from "@/lib/db"
import { compare } from "bcryptjs"

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const link = getLinkById(parseInt(id))

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  const formData = await req.formData()
  const password = formData.get("password")?.toString() || ""

  const isValid = await compare(password, link.password_hash)

  if (isValid) {
    return NextResponse.redirect(link.destination_url, 303)
  }

  return new NextResponse("Invalid password", { status: 401 })
}
