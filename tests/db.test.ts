import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useTempDb } from "./helpers"

let cleanup: () => void
let dir: string

beforeEach(() => {
  const temp = useTempDb()
  cleanup = temp.cleanup
  dir = temp.dir
})
afterEach(() => cleanup())

describe("users and emails", () => {
  it("stores emails lowercase and matches them case-insensitively", async () => {
    const db = await import("@/lib/db")
    db.createUser("Mixed.Case@Example.COM", "hash", "user")
    expect(db.getUserByEmail("mixed.case@example.com")?.email).toBe("mixed.case@example.com")
    expect(db.getUserByEmail("  MIXED.CASE@EXAMPLE.COM ")?.id).toBeDefined()
    expect(() => db.createUser("MIXED.case@example.com", "hash", "user")).toThrow(/UNIQUE/)
  })

  it("lowercases existing mixed-case emails on startup, skipping collisions", async () => {
    const path = join(dir, "legacy.db")
    const legacy = new Database(path)
    legacy.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','user')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO users (email, password_hash, role) VALUES ('Upper@X.io','h','admin'), ('dup@x.io','h','user'), ('DUP@x.io','h','user');`)
    legacy.close()

    process.env.DATABASE_URL = path
    ;(await import("vitest")).vi.resetModules()
    const db = await import("@/lib/db")
    const emails = db.getAllUsers().map((user) => user.email).sort()
    expect(emails).toContain("upper@x.io")
    expect(emails).toContain("dup@x.io")
    expect(emails).toContain("DUP@x.io")
  })

  it("marks self-service users unverified and reports their session info", async () => {
    const db = await import("@/lib/db")
    db.createUser("new@x.io", "hash", "user", false)
    const user = db.getUserByEmail("new@x.io")!
    expect(user.email_verified).toBe(0)
    expect(db.getUserSessionInfo(user.id)).toMatchObject({ email: "new@x.io", role: "user", session_valid_after: 0 })
    db.invalidateUserSessions(user.id)
    expect(db.getUserSessionInfo(user.id)!.session_valid_after).toBeGreaterThan(0)
    expect(db.getUserSessionInfo(99999)).toBeUndefined()
  })
})

describe("email verification tokens", () => {
  it("verifies once and rejects reuse and unknown tokens", async () => {
    const db = await import("@/lib/db")
    const { createToken, tokenExpiry } = await import("@/lib/tokens")
    db.createUser("v@x.io", "hash", "user", false)
    const user = db.getUserByEmail("v@x.io")!
    const { token, tokenHash } = createToken()
    db.createEmailVerification(user.id, tokenHash, tokenExpiry(60_000))

    const { hashToken } = await import("@/lib/tokens")
    expect(db.consumeEmailVerification(hashToken("nope"))).toBe("invalid")
    expect(db.consumeEmailVerification(hashToken(token))).toBe("ok")
    expect(db.getUserById(user.id)!.email_verified).toBe(1)
    expect(db.consumeEmailVerification(hashToken(token))).toBe("invalid")
  })

  it("rejects expired tokens", async () => {
    const db = await import("@/lib/db")
    const { createToken } = await import("@/lib/tokens")
    db.createUser("e@x.io", "hash", "user", false)
    const user = db.getUserByEmail("e@x.io")!
    const { token, tokenHash } = createToken()
    db.createEmailVerification(user.id, tokenHash, "2000-01-01 00:00:00")
    const { hashToken } = await import("@/lib/tokens")
    expect(db.consumeEmailVerification(hashToken(token))).toBe("invalid")
  })

  it("applies an email change only when its link is used, and not if the address was taken meanwhile", async () => {
    const db = await import("@/lib/db")
    const { createToken, hashToken, tokenExpiry } = await import("@/lib/tokens")
    db.createUser("me@x.io", "hash", "user")
    db.createUser("other@x.io", "hash", "user")
    const me = db.getUserByEmail("me@x.io")!

    const first = createToken()
    db.createEmailVerification(me.id, first.tokenHash, tokenExpiry(60_000), "Fresh@X.io")
    expect(db.getUserById(me.id)!.email).toBe("me@x.io")
    expect(db.consumeEmailVerification(hashToken(first.token))).toBe("ok")
    expect(db.getUserById(me.id)!.email).toBe("fresh@x.io")

    const second = createToken()
    db.createEmailVerification(me.id, second.tokenHash, tokenExpiry(60_000), "other@x.io")
    expect(db.consumeEmailVerification(hashToken(second.token))).toBe("taken")
    expect(db.getUserById(me.id)!.email).toBe("fresh@x.io")
  })
})

describe("statistics retention", () => {
  it("purges only records older than the configured number of days", async () => {
    const db = await import("@/lib/db")
    db.createUser("o@x.io", "hash", "user")
    const database = db.getDb()
    database.exec("INSERT INTO domains (domain) VALUES ('x.io')")
    database.exec("INSERT INTO links (short_code, destination_url, domain_id, user_id, mode) VALUES ('a','https://e.org',1,1,'simple')")
    database.exec(`INSERT INTO stats (link_id, visited_at) VALUES (1, datetime('now','-40 days')), (1, datetime('now','-2 days')), (1, datetime('now'))`)

    expect(db.purgeOldStats(true)).toBe(0) // retention 0 keeps everything
    db.updateSiteSettings("T", "x.io", undefined, undefined, false, false, false, 30)
    expect(db.purgeOldStats(true)).toBe(1)
    expect((database.prepare("SELECT COUNT(*) AS c FROM stats").get() as { c: number }).c).toBe(2)
  })
})

describe("backup and restore", () => {
  it("restores data in place, signs everyone out and tolerates older schemas", async () => {
    const db = await import("@/lib/db")
    db.createUser("admin@x.io", "hash", "admin")
    db.createUser("keep@x.io", "hash", "user")
    const backupPath = join(mkdtempSync(join(tmpdir(), "lg-backup-")), "backup.sqlite")
    await db.backupDatabase(backupPath)
    expect(db.validateBackupFile(backupPath)).toBeNull()

    db.createUser("later@x.io", "hash", "user")
    db.getDb().exec("UPDATE users SET session_valid_after = 0")

    // Simulate a backup taken before newer columns existed.
    const old = new Database(backupPath)
    old.exec("ALTER TABLE users DROP COLUMN email_verified; ALTER TABLE users DROP COLUMN session_valid_after;")
    old.close()

    await db.restoreDatabase(backupPath)
    const emails = db.getAllUsers().map((user) => user.email)
    expect(emails).toContain("keep@x.io")
    expect(emails).not.toContain("later@x.io")
    const restored = db.getUserByEmail("keep@x.io")!
    expect(restored.email_verified).toBe(1)
    expect(restored.session_valid_after).toBeGreaterThan(0)
    expect(db.getUserById(0)).toBeDefined() // guest user survives
  })

  it("rejects files that are not usable LinkGuide databases", async () => {
    const db = await import("@/lib/db")
    const { writeFileSync } = await import("node:fs")
    const junk = join(dir, "junk.sqlite")
    writeFileSync(junk, "not a database")
    expect(db.validateBackupFile(junk)).toMatch(/not a valid SQLite/i)

    const other = join(dir, "other.sqlite")
    const foreign = new Database(other)
    foreign.exec("CREATE TABLE things (id INTEGER)")
    foreign.close()
    expect(db.validateBackupFile(other)).toMatch(/missing/)
  })
})
