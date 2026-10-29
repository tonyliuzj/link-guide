import { describe, expect, it } from "vitest"
import { isValidEmail, isValidPassword, isValidRole, normalizeEmail } from "@/lib/validation"

describe("validation", () => {
  it("accepts ordinary emails and rejects malformed ones", () => {
    expect(isValidEmail("a@b.co")).toBe(true)
    expect(isValidEmail("  a@b.co  ")).toBe(true)
    for (const bad of ["", "a", "a@b", "a b@c.d", "@b.co", 5, null, undefined, `${"a".repeat(250)}@b.co`]) {
      expect(isValidEmail(bad)).toBe(false)
    }
  })

  it("normalizes emails to trimmed lowercase", () => {
    expect(normalizeEmail("  New.Admin@X.IO ")).toBe("new.admin@x.io")
  })

  it("enforces password length bounds", () => {
    expect(isValidPassword("1234567")).toBe(false)
    expect(isValidPassword("12345678")).toBe(true)
    expect(isValidPassword("x".repeat(128))).toBe(true)
    expect(isValidPassword("x".repeat(129))).toBe(false)
    expect(isValidPassword(12345678)).toBe(false)
  })

  it("only allows the two roles", () => {
    expect(isValidRole("admin")).toBe(true)
    expect(isValidRole("user")).toBe(true)
    expect(isValidRole("root")).toBe(false)
    expect(isValidRole(undefined)).toBe(false)
  })
})
