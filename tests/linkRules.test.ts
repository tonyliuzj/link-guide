import { describe, expect, it } from "vitest"
import { isLinkExpired, normalizeExpiresAt, normalizeLinkMode, normalizeRedirectDelay, normalizeShortCode } from "@/lib/linkRules"
import { normalizeRedirectUrl } from "@/lib/redirectUrl"

describe("redirect URLs", () => {
  it("only allows absolute http(s) URLs", () => {
    expect(normalizeRedirectUrl("https://example.org")).toBe("https://example.org/")
    expect(normalizeRedirectUrl(" http://example.org/a?b=1 ")).toBe("http://example.org/a?b=1")
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.org", "//x.org", "example.org", "", 5, null]) {
      expect(normalizeRedirectUrl(bad)).toBeNull()
    }
  })
})

describe("link rules", () => {
  it("validates short codes", () => {
    expect(normalizeShortCode(" abc-_9 ")).toBe("abc-_9")
    for (const bad of ["", "a/b", "a b", "é", "x".repeat(129), 5]) {
      expect(normalizeShortCode(bad)).toBeNull()
    }
  })

  it("validates modes and redirect delays", () => {
    expect(normalizeLinkMode("simple")).toBe("simple")
    expect(normalizeLinkMode("evil")).toBeNull()
    expect(normalizeRedirectDelay("5")).toBe(5)
    expect(normalizeRedirectDelay(86400)).toBe(86400)
    for (const bad of [-1, 86401, 1.5, "abc"]) expect(normalizeRedirectDelay(bad)).toBeNull()
  })

  it("normalizes and evaluates expiry", () => {
    expect(normalizeExpiresAt("")).toBeNull()
    expect(normalizeExpiresAt("not a date")).toBeNull()
    expect(normalizeExpiresAt("2030-01-01T00:00:00Z")).toBe("2030-01-01T00:00:00.000Z")
    expect(isLinkExpired(null)).toBe(false)
    expect(isLinkExpired("2000-01-01T00:00:00Z")).toBe(true)
    expect(isLinkExpired("2999-01-01T00:00:00Z")).toBe(false)
    expect(isLinkExpired("garbage")).toBe(true)
  })
})
