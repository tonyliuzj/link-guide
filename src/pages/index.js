import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const Turnstile = dynamic(
  () =>
    import("@marsidev/react-turnstile").then((mod) => mod.Turnstile),
  { ssr: false }
);

export default function Home({
  domains: initialDomains,
  turnstileEnabled,
  turnstileSiteKey,
}) {
  const domains = initialDomains;
  const [form, setForm] = useState({
    url: "",
    domain: initialDomains.length === 1 ? initialDomains[0] : "",
    alias: "",
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (turnstileEnabled && !token) {
      setError("Please complete the captcha.");
      return;
    }

    const alias = form.alias.trim();
    const redirectUrl = form.url.trim();

    setSubmitting(true);

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: alias,
          domain: form.domain,
          redirectUrl,
          turnstileResponse: token,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.message || "Failed to shorten URL.");
      } else {
        window.location.href = `/success?path=${encodeURIComponent(
          alias
        )}&domain=${encodeURIComponent(form.domain)}`;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const routePreview =
    form.domain && form.alias.trim()
      ? `${form.domain}/url/${form.alias.trim()}`
      : form.domain
        ? `${form.domain}/url/launch-q2`
        : "your-domain.com/url/launch-q2";
  const destinationPreview =
    form.url.trim() || "https://destination.example.com/campaign";

  const stats = [
    {
      label: "Connected Domains",
      value: String(domains.length).padStart(2, "0"),
      detail: domains.length
        ? "Ready for new short links"
        : "Add a domain in admin to publish links",
    },
    {
      label: "Verification",
      value: turnstileEnabled ? "On" : "Off",
      detail: turnstileEnabled
        ? "Turnstile is protecting submissions"
        : "Launcher is currently open",
    },
    {
      label: "Publishing Mode",
      value: "Custom",
      detail: "Aliases are chosen manually per route",
    },
  ];

  const useCases = [
    "Product launches",
    "Campaign links",
    "Partner handoffs",
    "Docs routing",
  ];

  const featureCards = [
    {
      title: "Landing page polish",
      description:
        "Link Guide introduces the product clearly, but still lets visitors create a route without dropping into an admin-only experience.",
      icon: SparklesIcon,
    },
    {
      title: "Operational context",
      description:
        "Route preview, connected domains, verification status, and publishing mode stay visible while the link is being created.",
      icon: GlobeAltIcon,
    },
    {
      title: "Admin when needed",
      description:
        "The public launcher handles creation, while the admin console covers domains, redirects, and global settings once you need deeper control.",
      icon: Cog6ToothIcon,
    },
  ];

  const guardrails = [
    {
      label: "Domain routing",
      value: domains.length
        ? `${domains.length} domain${domains.length === 1 ? "" : "s"} available`
        : "No connected domains",
    },
    {
      label: "Human verification",
      value: turnstileEnabled ? "Captcha required" : "Captcha disabled",
    },
    {
      label: "Primary domain rule",
      value: "Server-side redirect checks stay active",
    },
  ];

  const checklist = [
    {
      label: "Destination added",
      done: Boolean(form.url.trim()),
      detail: form.url.trim() || "Paste the final URL for the redirect target.",
    },
    {
      label: "Domain selected",
      done: Boolean(form.domain),
      detail: form.domain || "Choose one of the connected domains.",
    },
    {
      label: "Alias ready",
      done: Boolean(form.alias.trim()),
      detail: form.alias.trim() || "Use a memorable custom slug.",
    },
  ];

  const adminLinks = [
    {
      title: "Admin access",
      href: "/login",
      description: "Sign in for domains, settings, and password management.",
      icon: Cog6ToothIcon,
    },
    {
      title: "Redirect library",
      href: "/admin/redirects",
      description: "Review and manage published aliases in the admin table.",
      icon: ChartBarIcon,
    },
  ];

  return (
    <>
      <Head>
        <title>Link Guide | Short Links for Teams</title>
        <meta
          name="description"
          content="Link Guide combines a polished SaaS landing page with a working redirect launcher, so teams can create and manage short links from one place."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-[#f3f4ed] text-slate-950">
        <div className="relative isolate overflow-hidden">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-emerald-200/70 blur-3xl" />
          <div className="absolute right-[-8rem] top-28 h-96 w-96 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-1/3 h-80 w-80 rounded-full bg-amber-100/80 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
            <header className="sticky top-4 z-20">
              <div className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      SaaS Launcher
                    </p>
                    <p className="text-base font-semibold text-slate-950">
                      Link Guide
                    </p>
                  </div>
                </div>

                <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
                  <a href="#product" className="transition hover:text-slate-950">
                    Product
                  </a>
                  <a href="#launch-panel" className="transition hover:text-slate-950">
                    Try It
                  </a>
                  <a href="#ops" className="transition hover:text-slate-950">
                    Operations
                  </a>
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Admin
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <a
                    href="https://github.com/tonyliuzj/link-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Source
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </header>

            <section className="grid gap-10 pt-14 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
              <div className="max-w-3xl pt-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                  <SparklesIcon className="h-4 w-4" />
                  Landing page and working launcher in one surface
                </div>

                <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                  Short links that market the product and do the job.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Link Guide combines a polished SaaS landing page with the real
                  redirect creation workflow. Introduce the product clearly,
                  show how it works, and let people publish a route without
                  landing on a bare utility screen.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="#launch-panel"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Create a link
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Open admin
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {useCases.map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm shadow-slate-200/60"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.4)] backdrop-blur-sm"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="launch-panel" className="relative">
                <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-emerald-200/70 via-white to-sky-200/70 blur-2xl" />
                <div className="relative rounded-[30px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_32px_120px_-60px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-7">
                  <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Live route preview
                        </p>
                        <p className="mt-2 break-all text-lg font-medium">
                          {routePreview}
                        </p>
                      </div>
                      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                        {turnstileEnabled ? "Protected" : "Open"}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Destination
                      </p>
                      <p className="mt-2 break-all text-sm text-slate-100">
                        {destinationPreview}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Try Link Guide
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Launch a redirect from the landing page
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This is the real creation flow. Add the destination,
                      choose a domain, and publish a memorable alias directly
                      from the homepage.
                    </p>
                  </div>

                  {!domains.length && (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      No domains are connected yet. Add one in the admin
                      workspace before publishing links.
                    </div>
                  )}

                  {error && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <label
                        htmlFor="url"
                        className="text-sm font-medium text-slate-700"
                      >
                        Destination URL
                      </label>
                      <input
                        id="url"
                        name="url"
                        type="url"
                        placeholder="https://example.com/product/launch"
                        value={form.url}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px]">
                      <div className="space-y-2">
                        <label
                          htmlFor="domain"
                          className="text-sm font-medium text-slate-700"
                        >
                          Domain
                        </label>
                        <select
                          id="domain"
                          name="domain"
                          value={form.domain}
                          onChange={handleChange}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
                        >
                          <option value="" disabled>
                            {domains.length
                              ? "Select a domain"
                              : "No domains available"}
                          </option>
                          {domains.map((domain) => (
                            <option key={domain} value={domain}>
                              {domain}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="alias"
                          className="text-sm font-medium text-slate-700"
                        >
                          Custom Alias
                        </label>
                        <input
                          id="alias"
                          name="alias"
                          type="text"
                          placeholder="launch-q2"
                          value={form.alias}
                          onChange={handleChange}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                        />
                      </div>
                    </div>

                    {turnstileEnabled && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="mb-3 text-sm font-medium text-slate-700">
                          Verification
                        </p>
                        <Turnstile
                          siteKey={turnstileSiteKey}
                          onSuccess={(value) => setToken(value)}
                          onExpire={() => setToken("")}
                          onError={() =>
                            setError("Captcha failed, please try again.")
                          }
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !domains.length}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {submitting ? "Publishing..." : "Create redirect"}
                      {!submitting && <ArrowRightIcon className="h-4 w-4" />}
                    </button>

                    <p className="text-sm leading-6 text-slate-500">
                      After publish, Link Guide sends you to a copy-ready
                      success screen with the final short URL.
                    </p>
                  </form>
                </div>
              </div>
            </section>

            <section id="product" className="mt-20">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Product
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  A SaaS landing page that still behaves like the product.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  The homepage now carries the sales narrative, the product
                  promise, and the real link launcher together. Visitors can
                  understand Link Guide quickly, then act without changing
                  context.
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {featureCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[30px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="ops"
              className="mt-20 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="rounded-[34px] bg-slate-950 p-8 text-white shadow-[0_32px_120px_-60px_rgba(15,23,42,0.75)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Operations
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Launch publicly, manage privately.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Link Guide keeps the first-touch experience polished while
                  exposing the right operational details for teams that publish
                  links every day.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      01 Destination
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-100">
                      {form.url.trim() || "Waiting for the destination URL."}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      02 Domain
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-100">
                      {form.domain || "Choose the domain for the short link."}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      03 Alias
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-100">
                      {form.alias.trim() || "Pick a custom alias to publish."}
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <GlobeAltIcon className="h-4 w-4 text-emerald-300" />
                    Resolved route
                  </div>
                  <p className="mt-4 break-all text-2xl font-medium tracking-tight text-white">
                    {routePreview}
                  </p>
                  <div className="mt-6 space-y-3">
                    {guardrails.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm text-slate-200">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[30px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                    Launch checklist
                  </div>
                  <div className="mt-4 space-y-3">
                    {checklist.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              item.done
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {item.done ? "OK" : "--"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Cog6ToothIcon className="h-4 w-4 text-slate-700" />
                    Admin shortcuts
                  </div>
                  <div className="mt-4 space-y-3">
                    {adminLinks.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-slate-950 p-2 text-white">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <ClockIcon className="h-4 w-4 text-slate-700" />
                    Routing notes
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      The success step still returns a copy-ready short URL
                      immediately after publish.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      Connected domains are loaded from the admin data store, so
                      the launcher reflects live routing inventory.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      Primary-domain checks continue to run on the server before
                      the page is rendered.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-20">
              <div className="rounded-[34px] border border-slate-200 bg-white/85 p-8 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.45)] backdrop-blur-sm lg:flex lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Next step
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    Use Link Guide as both the front door and the working
                    product.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    The homepage now sells the value of the product, while the
                    launcher keeps the core redirect workflow immediately
                    available.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-0">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open admin
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <a
                    href="#launch-panel"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Create a link
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const { openDB } = await import("@/data/database");
  const db = await openDB();

  // Check primary domain restriction
  const primaryDomainSetting = await db.get(
    "SELECT value FROM settings WHERE key = ?",
    "primary_domain"
  );

  // If primary domain is set and request is not from primary domain, redirect
  if (primaryDomainSetting && primaryDomainSetting.value) {
    const primaryDomain = primaryDomainSetting.value;
    const requestHost = req.headers.host;

    if (
      requestHost !== primaryDomain &&
      !requestHost.startsWith(primaryDomain + ":")
    ) {
      await db.close();
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const redirectUrl = `${protocol}://${primaryDomain}${req.url}`;

      return {
        redirect: {
          destination: redirectUrl,
          permanent: false,
        },
      };
    }
  }

  // Get all domains
  const domainsData = await db.all("SELECT domain FROM domains ORDER BY id");
  const domains = domainsData.map((d) => d.domain);

  // Get global Turnstile settings
  const turnstileEnabledRow = await db.get(
    "SELECT value FROM settings WHERE key = ?",
    "turnstile_enabled"
  );
  const turnstileSiteKeyRow = await db.get(
    "SELECT value FROM settings WHERE key = ?",
    "turnstile_site_key"
  );

  await db.close();

  return {
    props: {
      domains,
      turnstileEnabled: turnstileEnabledRow?.value === "true",
      turnstileSiteKey: turnstileSiteKeyRow?.value || "",
    },
  };
}
