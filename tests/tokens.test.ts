import { describe, expect, it } from "vitest"
import { createToken, hashToken, tokenExpiry } from "@/lib/tokens"
import { getRequestIp } from "@/lib/turnstile"

describe("tokens", () => {
  it("creates random tokens whose stored value is only a hash", () => {
    const a = createToken()
    const b = createToken()
    expect(a.token).toMatch(/^[a-f0-9]{64}$/)
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).toBe(hashToken(a.token))
    expect(a.tokenHash).not.toContain(a.token)
  })

  it("formats expiry as an SQLite datetime in the future", () => {
    const expiry = tokenExpiry(60_000)
    expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(new Date(expiry.replace(" ", "T") + "Z").getTime()).toBeGreaterThan(Date.now())
  })
})

describe("getRequestIp", () => {
  const headers = (values: Record<string, string>) => new Headers(values)

  it("prefers CF-Connecting-IP, then X-Real-IP", () => {
    expect(getRequestIp(headers({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" }))).toBe("1.1.1.1")
    expect(getRequestIp(headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" }))).toBe("2.2.2.2")
  })

  it("uses the last X-Forwarded-For entry because earlier ones are client-controlled", () => {
    expect(getRequestIp(headers({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 3.3.3.3" }))).toBe("3.3.3.3")
    expect(getRequestIp(headers({}))).toBeNull()
  })
})
