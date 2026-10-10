import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const MODE_LABELS: Record<string, string> = {
  simple: "Simple Redirect",
  custom_page: "Custom Page",
  password: "Password Protected",
  turnstile: "Turnstile Protected",
}

export function TopLinksTable({ links, limit = 10 }: { links: any[]; limit?: number }) {
  const top = [...links]
    .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
    .slice(0, limit)

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top Links</h2>
        <Link href="/dashboard/links" className="text-sm text-muted-foreground hover:underline">
          View all
        </Link>
      </div>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Short URL</th>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Clicks</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {top.map((link) => {
              const expired = link.expires_at && new Date(link.expires_at) < new Date()
              return (
                <tr key={link.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <Link href={`/dashboard/links/${link.id}`} className="hover:underline">
                      {link.domain}{link.base_path !== '/' ? link.base_path : ''}/{link.short_code}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate p-3">{link.destination_url}</td>
                  <td className="p-3">{MODE_LABELS[link.mode] ?? link.mode}</td>
                  <td className="p-3">{link.owner_name || "Guest"}</td>
                  <td className="p-3 tabular-nums">{link.click_count || 0}</td>
                  <td className="p-3">
                    <Badge variant={expired ? "destructive" : "outline"}>
                      {expired ? "Expired" : "Active"}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {top.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No links yet.</div>
        )}
      </div>
    </div>
  )
}
