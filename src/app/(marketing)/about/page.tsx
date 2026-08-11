import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Lightning, Users, Sparkle } from '@phosphor-icons/react/dist/ssr'
import SiteFooter from '@/components/marketing/SiteFooter'

export const metadata: Metadata = {
  title: 'About — LedgeIt',
  description:
    'Why we built LedgeIt: budgeting apps are too slow to stick with. We made one you can log to in five seconds — just type.',
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ledge-accent-dim)] focus-visible:ring-offset-2'
const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--ledge-accent-dim) 0%, var(--ledge-accent) 100%)'

const BELIEFS = [
  {
    icon: Lightning,
    title: 'Speed is the whole point',
    body: 'If logging a purchase feels like work, you stop doing it. LedgeIt asks for one plain sentence — "grab 85 lunch" — and does the sorting for you. And when a detail needs a fix, it is a tap away.',
  },
  {
    icon: Sparkle,
    title: 'It speaks the way you do',
    body: 'Filipino, English, or Taglish. Type it however it comes out of your head. No dropdowns to hunt through, no categories to set up before you can start.',
  },
  {
    icon: Users,
    title: 'Yours alone, or shared',
    body: 'Use it solo as your personal money log, or invite a partner or family to share one ledger. It works the same either way — no spreadsheet, no group-chat receipts.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--ledge-bg)', color: 'var(--ledge-data)' }}>

      {/* ── NAV (solid) ──────────────────────────────────────────────────────── */}
      <header
        className="fixed left-0 right-0 top-0 z-50"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)',
          paddingBottom: '18px',
          backgroundColor: 'rgba(248,250,249,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(205,224,219,0.5)',
        }}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            {/* Logo placeholder — swap for the real mark when ready */}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-[16px] font-bold"
              style={{ background: PRIMARY_GRADIENT, color: '#ffffff' }}
              aria-hidden="true"
            >
              L
            </span>
            <Link href="/" className={`font-mono text-[18px] font-bold tracking-tight ${FOCUS_RING} rounded-md`} style={{ color: 'var(--ledge-accent)' }}>
              LedgeIt
            </Link>
            <span className="hidden lg:inline text-[12px] font-semibold" style={{ color: 'var(--ledge-muted)' }}>
              Spent it? LedgeIt.
            </span>
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Sections">
            <Link href="/#what" className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-[rgba(0,53,46,0.06)] ${FOCUS_RING}`} style={{ color: 'var(--ledge-data-var)' }}>Why LedgeIt</Link>
            <Link href="/#how-it-works" className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-[rgba(0,53,46,0.06)] ${FOCUS_RING}`} style={{ color: 'var(--ledge-data-var)' }}>How it works</Link>
            <Link href="/#features" className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-[rgba(0,53,46,0.06)] ${FOCUS_RING}`} style={{ color: 'var(--ledge-data-var)' }}>Features</Link>
            <Link href="/about" className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-[rgba(0,53,46,0.06)] ${FOCUS_RING}`} style={{ color: 'var(--ledge-accent)' }}>About</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className={`hidden sm:inline-flex min-h-[44px] items-center rounded-full px-5 text-[14px] font-semibold transition-colors ${FOCUS_RING}`}
              style={{ color: 'var(--ledge-data-var)' }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold transition-transform active:scale-[0.97] ${FOCUS_RING}`}
              style={{ background: PRIMARY_GRADIENT, color: '#ffffff' }}
            >
              Try it free
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #00352e 0%, #0d4d43 45%, #1f7a6b 100%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 160px)',
          paddingBottom: '120px',
        }}
      >
        <div
          className="pointer-events-none absolute -right-32 -top-24 h-[560px] w-[560px]"
          style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52,168,146,0.34) 0%, transparent 62%)' }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <p className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <Sparkle size={12} weight="fill" color="rgba(255,255,255,0.7)" aria-hidden="true" />
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>Our story</span>
          </p>
          <h1
            className="max-w-3xl text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight"
            style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
          >
            We kept quitting budgeting apps. So we built one worth keeping.
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
            LedgeIt started with a familiar frustration: every budgeting app we tried was too slow and too fussy to survive past week two. We wanted the opposite — something so fast that logging never feels like a chore.
          </p>
        </div>
      </section>

      {/* ── WHY WE BUILT THIS ────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--ledge-bg)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight" style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}>
                Why we built this
              </h2>
            </div>
            <div className="flex flex-col gap-5 text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
              <p>
                Most tools treat budgeting as data entry. Open the app, tap through menus, find the right category, type the amount, confirm, close. Forty to ninety seconds, every single time. It is no wonder the habit dies.
              </p>
              <p>
                We believed the barrier — not the discipline — was the real problem. So we made logging as fast as saying it out loud. You type &ldquo;bayad kuryente 1740&rdquo; and it is sorted: amount, merchant, category. If something is off, correcting it takes a second, not a detour into a settings screen.
              </p>
              <p>
                It works whether it is just you or not. Keep a personal ledger for your own spending, or invite a partner or family to share one — the full picture stays in a single place, without anyone playing accountant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ──────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <h2 className="mb-12 text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight" style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}>
            What we believe
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {BELIEFS.map((b) => (
              <div key={b.title} className="flex flex-col gap-4 rounded-3xl p-7" style={{ background: 'var(--ledge-bg)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,53,46,0.07)' }}>
                  <b.icon size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                </div>
                <h3 className="text-[1.05rem] font-bold leading-snug" style={{ color: 'var(--ledge-data)' }}>{b.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE ───────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--ledge-bg)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight" style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}>
                Who we are
              </h2>
            </div>
            <div className="flex flex-col gap-5 text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
              <p>
                We are a small team of Filipino builders — engineers and designers who track our own spending and got tired of tools that were not made for how we actually live and talk about money.
              </p>
              <p>
                LedgeIt is built close to home: local merchants, Taglish, the everyday realities of Filipino spending. We keep the product small and fast on purpose. Every feature has to earn its place against a single question — does this make logging easier, or does it just add friction?
              </p>
              <p>
                We are still early, and we would love your input. If LedgeIt helps you stick with budgeting for once, that is the whole point.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-32 lg:px-8" style={{ background: 'var(--ledge-bg)' }}>
        <div
          className="pointer-events-none absolute inset-x-6 inset-y-8 rounded-3xl lg:inset-x-8"
          style={{ background: 'linear-gradient(150deg, #00352e 0%, #0d4d43 50%, #1f7a6b 100%)' }}
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.62)' }}>
            Got expenses? LedgeIt.
          </p>
          <h2 className="text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[1.06] tracking-tight" style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}>
            Give the fast way a try.
          </h2>
          <p className="max-w-sm text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            Free to start, no credit card, nothing to set up. Log your first expense the way you&apos;d say it.
          </p>
          <Link
            href="/login"
            className={`inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold transition-transform active:scale-[0.97] ${FOCUS_RING}`}
            style={{ background: '#ffffff', color: 'var(--ledge-accent)' }}
          >
            Try it free — it&apos;s instant
            <ArrowRight size={15} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
