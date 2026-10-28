import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getLinkById, getStatsByLinkId } from "@/lib/db"

export const runtime = 'nodejs';

type StatRow = {
  visited_at: string
  country: string | null
  referrer: string | null
  user_agent: string | null
  ip_hash: string | null
}

// Quote every cell, and defuse cells a spreadsheet would otherwise run as a formula.
function csvCell(value: string | null) {
  let text = value ?? ""
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

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

  const rows = getStatsByLinkId(link.id) as StatRow[]
  const lines = [
    ["visited_at_utc", "country", "referrer", "user_agent", "visitor_hash"].map(csvCell).join(","),
    ...rows.map((row) => [row.visited_at, row.country, row.referrer, row.user_agent, row.ip_hash].map(csvCell).join(",")),
  ]

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clicks-${link.short_code}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
