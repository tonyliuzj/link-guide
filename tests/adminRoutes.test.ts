import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTempDb } from "./helpers"

type Session = { user: { id: string; role: string; email?: string } } | null
let session: Session = null

vi.mock("@/lib/auth", () => ({ auth: async () => session }))

let cleanup: () => void
const admin = { user: { id: "1", role: "admin", email: "admin@x.io" } }
const user = { user: { id: "2", role: "user", email: "user@x.io" } }

async function seed() {
  const db = await import("@/lib/db")
  db.createUser("admin@x.io", "hash", "admin")
  db.createUser("user@x.io", "hash", "user")
  const database = db.getDb()
  database.prepare("INSERT INTO domains (domain, turnstile_site_key, turnstile_secret_key) VALUES ('x.io', 'site-key', 'SECRET-KEY')").run()
  database.prepare("INSERT INTO links (short_code, destination_url, domain_id, user_id, mode) VALUES ('mine','https://e.org',1,2,'simple')").run()
  database.prepare("INSERT INTO links (short_code, destination_url, domain_id, user_id, mode) VALUES ('theirs','https://e.org',1,1,'simple')").run()
  return db
}

beforeEach(() => {
  cleanup = useTempDb().cleanup
  session = null
})
afterEach(() => cleanup())

describe("GET /api/domains", () => {
  it("never exposes Turnstile secret keys to non-admins", async () => {
    await seed()
    const { GET } = await import("@/app/api/domains/route")

    session = user
    const asUser = await (await GET()).json()
    expect(asUser[0].turnstile_site_key).toBe("site-key")
    expect(JSON.stringify(asUser)).not.toContain("SECRET-KEY")

    session = admin
    expect(JSON.stringify(await (await GET()).json())).toContain("SECRET-KEY")

    session = null
    expect((await GET()).status).toBe(401)
  })
})

describe("GET /api/links/[id]/export", () => {
  const call = async (id: number) => {
    const { GET } = await import("@/app/api/links/[id]/export/route")
    return GET(new Request("http://app.test/x") as never, { params: Promise.resolve({ id: String(id) }) })
  }

  it("exports CSV for the owner, defusing spreadsheet formulas", async () => {
    const db = await seed()
    db.createStat(1, "1.2.3.4", "Mozilla", '=HYPERLINK("x")', "GB")
    session = user

    const res = await call(1)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-disposition")).toContain("clicks-mine.csv")
    const csv = await res.text()
    expect(csv.split("\r\n")[0]).toBe('"visited_at_utc","country","referrer","user_agent","visitor_hash"')
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).not.toContain("1.2.3.4")
  })

  it("rejects other users' links and anonymous callers, but lets admins export any", async () => {
    await seed()
    session = user
    expect((await call(2)).status).toBe(403)
    session = admin
    expect((await call(1)).status).toBe(200)
    session = null
    expect((await call(1)).status).toBe(401)
    session = admin
    expect((await call(999)).status).toBe(404)
  })
})

describe("/api/backup", () => {
  it("is admin-only and requires explicit confirmation to restore", async () => {
    await seed()
    const { GET, POST } = await import("@/app/api/backup/route")

    session = user
    expect((await GET()).status).toBe(401)

    session = admin
    const download = await GET()
    expect(download.status).toBe(200)
    const bytes = Buffer.from(await download.arrayBuffer())
    expect(bytes.subarray(0, 15).toString()).toBe("SQLite format 3")

    const form = new FormData()
    form.set("file", new File([bytes], "backup.sqlite"))
    const noConfirm = await POST(new Request("http://app.test/api/backup", { method: "POST", body: form }))
    expect(noConfirm.status).toBe(400)

    const junk = new FormData()
    junk.set("file", new File(["not sqlite"], "bad.sqlite"))
    junk.set("confirm", "RESTORE")
    expect((await POST(new Request("http://app.test/api/backup", { method: "POST", body: junk }))).status).toBe(400)
  })

  it("restores a valid backup", async () => {
    const db = await seed()
    const { GET, POST } = await import("@/app/api/backup/route")
    session = admin
    const bytes = Buffer.from(await (await GET()).arrayBuffer())

    db.createUser("after@x.io", "hash", "user")
    const form = new FormData()
    form.set("file", new File([bytes], "backup.sqlite"))
    form.set("confirm", "RESTORE")
    const res = await POST(new Request("http://app.test/api/backup", { method: "POST", body: form }))
    expect(res.status).toBe(200)
    expect(db.getAllUsers().map((u) => u.email)).not.toContain("after@x.io")
  })
})

describe("GET /api/site", () => {
  it("is available to everyone and only returns the site title", async () => {
    const db = await seed()
    db.updateSiteSettings("My Links", "x.io", "site", "TOP-SECRET", false, false, false)
    const { GET } = await import("@/app/api/site/route")

    session = null
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ site_title: "My Links" })
  })
})

describe("GET /api/settings", () => {
  it("is admin-only", async () => {
    await seed()
    const { GET } = await import("@/app/api/settings/route")
    session = user
    expect((await GET()).status).toBe(401)
    session = admin
    const body = await (await GET()).json()
    expect(body).toHaveProperty("mail_configured")
  })
})
