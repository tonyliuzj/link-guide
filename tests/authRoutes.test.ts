import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { jsonRequest, useTempDb } from "./helpers"

const sendMail = vi.fn(async () => {})
let mailConfigured = true

vi.mock("@/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mail")>()),
  isMailConfigured: () => mailConfigured,
  sendMail: (...args: unknown[]) => (sendMail as (...a: unknown[]) => Promise<void>)(...args),
}))

let cleanup: () => void
const ip = (n: number) => ({ "x-forwarded-for": `10.0.0.${n}` })

function lastLink() {
  const calls = sendMail.mock.calls as unknown as Array<[string, string, string]>
  const text = calls[calls.length - 1][2]
  return text.match(/https?:\/\/\S+/)![0]
}

beforeEach(() => {
  cleanup = useTempDb().cleanup
  sendMail.mockClear()
  mailConfigured = true
})
afterEach(() => cleanup())

describe("POST /api/auth/signup", () => {
  it("creates an unverified account and mails a verification link when SMTP is configured", async () => {
    const { POST } = await import("@/app/api/auth/signup/route")
    const { getUserByEmail } = await import("@/lib/db")

    const res = await POST(jsonRequest("/api/auth/signup", { email: "New@User.io", password: "password123" }, ip(1)))
    expect(await res.json()).toEqual({ success: true, verificationRequired: true })
    expect(getUserByEmail("new@user.io")!.email_verified).toBe(0)
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(lastLink()).toMatch(/^http:\/\/app\.test\/verify-email\?token=[a-f0-9]{64}$/)
  })

  it("creates a verified account straight away without SMTP", async () => {
    mailConfigured = false
    const { POST } = await import("@/app/api/auth/signup/route")
    const { getUserByEmail } = await import("@/lib/db")

    const res = await POST(jsonRequest("/api/auth/signup", { email: "a@b.co", password: "password123" }, ip(2)))
    expect(await res.json()).toEqual({ success: true, verificationRequired: false })
    expect(getUserByEmail("a@b.co")!.email_verified).toBe(1)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("answers an existing address exactly like a new one and emails its owner instead", async () => {
    const { POST } = await import("@/app/api/auth/signup/route")
    const body = { email: "taken@x.io", password: "password123" }

    const fresh = await POST(jsonRequest("/api/auth/signup", body, ip(3)))
    const again = await POST(jsonRequest("/api/auth/signup", body, ip(3)))
    expect(again.status).toBe(fresh.status)
    expect(await again.json()).toEqual(await fresh.json())
    expect(sendMail).toHaveBeenCalledTimes(2)
  })

  it("tells the owner of a verified account that it already exists", async () => {
    const { POST } = await import("@/app/api/auth/signup/route")
    const { createUser } = await import("@/lib/db")
    createUser("owner@x.io", "hash", "user")

    const res = await POST(jsonRequest("/api/auth/signup", { email: "OWNER@x.io", password: "password123" }, ip(4)))
    expect(res.status).toBe(200)
    const calls = sendMail.mock.calls as unknown as Array<[string, string, string]>
    expect(calls[0][0]).toBe("owner@x.io")
    expect(calls[0][1]).toMatch(/already have an account/i)
  })

  it("keeps the explicit error when SMTP is not configured", async () => {
    mailConfigured = false
    const { POST } = await import("@/app/api/auth/signup/route")
    const { createUser } = await import("@/lib/db")
    createUser("x@x.io", "hash", "user")

    const res = await POST(jsonRequest("/api/auth/signup", { email: "x@x.io", password: "password123" }, ip(5)))
    expect(res.status).toBe(400)
  })

  it("validates input and rate limits by IP", async () => {
    const { POST } = await import("@/app/api/auth/signup/route")
    expect((await POST(jsonRequest("/api/auth/signup", { email: "bad", password: "password123" }, ip(6)))).status).toBe(400)
    expect((await POST(jsonRequest("/api/auth/signup", { email: "a@b.co", password: "short" }, ip(6)))).status).toBe(400)
    expect((await POST(jsonRequest("/api/auth/signup", {}, ip(6)))).status).toBe(400)

    let last = 0
    for (let i = 0; i < 10; i++) last = (await POST(jsonRequest("/api/auth/signup", { email: `u${i}@x.io`, password: "password123" }, ip(7)))).status
    expect(last).toBe(200)
    expect((await POST(jsonRequest("/api/auth/signup", { email: "z@x.io", password: "password123" }, ip(7)))).status).toBe(429)
  })
})

describe("email verification flow", () => {
  it("verifies via the emailed link exactly once", async () => {
    const signup = await import("@/app/api/auth/signup/route")
    const verify = await import("@/app/api/auth/verify-email/route")
    const { getUserByEmail } = await import("@/lib/db")

    await signup.POST(jsonRequest("/api/auth/signup", { email: "v@x.io", password: "password123" }, ip(8)))
    const token = new URL(lastLink()).searchParams.get("token")

    expect((await verify.POST(jsonRequest("/api/auth/verify-email", { token: "bad" }, ip(8)))).status).toBe(400)
    expect((await verify.POST(jsonRequest("/api/auth/verify-email", { token }, ip(8)))).status).toBe(200)
    expect(getUserByEmail("v@x.io")!.email_verified).toBe(1)
    expect((await verify.POST(jsonRequest("/api/auth/verify-email", { token }, ip(8)))).status).toBe(400)
  })

  it("resends only for unverified accounts and always answers the same", async () => {
    const resend = await import("@/app/api/auth/resend-verification/route")
    const { createUser } = await import("@/lib/db")
    createUser("unverified@x.io", "hash", "user", false)
    createUser("verified@x.io", "hash", "user", true)

    const a = await resend.POST(jsonRequest("/api/auth/resend-verification", { email: "unverified@x.io" }, ip(9)))
    const b = await resend.POST(jsonRequest("/api/auth/resend-verification", { email: "verified@x.io" }, ip(9)))
    const c = await resend.POST(jsonRequest("/api/auth/resend-verification", { email: "nobody@x.io" }, ip(9)))
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200])
    expect(sendMail).toHaveBeenCalledTimes(1)
  })
})

describe("password reset", () => {
  it("mails a reset link only for real accounts, then resets, verifies and signs out sessions", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route")
    const reset = await import("@/app/api/auth/reset-password/route")
    const db = await import("@/lib/db")
    db.createUser("pw@x.io", "old-hash", "user", false)

    expect((await forgot.POST(jsonRequest("/api/auth/forgot-password", { email: "ghost@x.io" }, ip(10)))).status).toBe(200)
    expect(sendMail).not.toHaveBeenCalled()

    expect((await forgot.POST(jsonRequest("/api/auth/forgot-password", { email: "PW@x.io" }, ip(10)))).status).toBe(200)
    const token = new URL(lastLink()).searchParams.get("token")

    expect((await reset.POST(jsonRequest("/api/auth/reset-password", { token, password: "short" }, ip(10)))).status).toBe(400)
    expect((await reset.POST(jsonRequest("/api/auth/reset-password", { token, password: "brand-new-pass" }, ip(10)))).status).toBe(200)

    const user = db.getUserByEmail("pw@x.io")!
    expect(user.password_hash).not.toBe("old-hash")
    expect(user.email_verified).toBe(1)
    expect(user.session_valid_after).toBeGreaterThan(0)
    expect((await reset.POST(jsonRequest("/api/auth/reset-password", { token, password: "another-pass-1" }, ip(10)))).status).toBe(400)
  })

  it("limits reset requests per address and per IP", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route")
    const db = await import("@/lib/db")
    db.createUser("rl@x.io", "hash", "user")

    for (let i = 0; i < 5; i++) await forgot.POST(jsonRequest("/api/auth/forgot-password", { email: "rl@x.io" }, ip(11)))
    expect(sendMail).toHaveBeenCalledTimes(3) // third request per address is the last that sends
    expect((await forgot.POST(jsonRequest("/api/auth/forgot-password", { email: "rl@x.io" }, ip(11)))).status).toBe(429)
  })
})
