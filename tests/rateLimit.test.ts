import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useTempDb } from "./helpers"

let cleanup: () => void

beforeEach(() => {
  cleanup = useTempDb().cleanup
})
afterEach(() => cleanup())

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a retry hint", async () => {
    const { rateLimit } = await import("@/lib/rateLimit")
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000).ok).toBe(true)
    const blocked = rateLimit("k", 3, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
    expect(blocked.retryAfter).toBeLessThanOrEqual(60)
  })

  it("tracks keys independently and can be reset", async () => {
    const { rateLimit, resetRateLimit } = await import("@/lib/rateLimit")
    rateLimit("a", 1, 60_000)
    expect(rateLimit("a", 1, 60_000).ok).toBe(false)
    expect(rateLimit("b", 1, 60_000).ok).toBe(true)
    resetRateLimit("a")
    expect(rateLimit("a", 1, 60_000).ok).toBe(true)
  })

  it("starts a new window once the old one expires", async () => {
    const { rateLimit } = await import("@/lib/rateLimit")
    rateLimit("w", 1, 20)
    expect(rateLimit("w", 1, 20).ok).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(rateLimit("w", 1, 20).ok).toBe(true)
  })

  it("persists across a reopened database handle", async () => {
    const first = await import("@/lib/rateLimit")
    first.rateLimit("p", 1, 60_000)
    ;(globalThis as { __linkGuideDb?: { close(): void } | null }).__linkGuideDb?.close()
    ;(globalThis as { __linkGuideDb?: unknown }).__linkGuideDb = null
    expect(first.rateLimit("p", 1, 60_000).ok).toBe(false)
  })
})
