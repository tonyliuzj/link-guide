import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { StatsBreakdown } from "@/lib/db"

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Card>
      <CardHeader>
        <CardDescription>Last 90 days</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function StatsBreakdownCards({ data }: { data: StatsBreakdown }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3">
      <BreakdownCard title="Top Referrers" rows={data.referrers} />
      <BreakdownCard title="Top Countries" rows={data.countries} />
      <BreakdownCard title="Browsers" rows={data.browsers} />
    </div>
  )
}
