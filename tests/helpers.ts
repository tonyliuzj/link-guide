import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { vi } from "vitest"

type GlobalWithDb = typeof globalThis & { __linkGuideDb?: { close(): void } | null }

// Points the app at a brand-new empty database and reloads every module so nothing is cached.
export function useTempDb() {
  const dir = mkdtempSync(join(tmpdir(), "link-guide-test-"))
  const state = globalThis as GlobalWithDb
  state.__linkGuideDb?.close()
  state.__linkGuideDb = null
  process.env.DATABASE_URL = join(dir, "test.db")
  process.env.APP_URL = "http://app.test"
  vi.resetModules()

  return {
    dir,
    cleanup() {
      state.__linkGuideDb?.close()
      state.__linkGuideDb = null
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://app.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}
