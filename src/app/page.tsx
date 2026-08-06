'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  Lightning,
  ChatText,
  Users,
  ArrowRight,
  CheckCircle,
  Sparkle,
} from '@phosphor-icons/react'

// ─── Demo sequence ────────────────────────────────────────────────────────────

const DEMO_SEQUENCE = [
  { input: '20 mcdonalds lunch',       merchant: "McDonald's", category: 'Restaurants',   amount: '₱20.00',     type: 'expense', catColor: '#e05c2a', catBg: 'rgba(224,92,42,0.12)'   },
  { input: 'grab 85 morning commute',  merchant: 'Grab',       category: 'Transport',     amount: '₱85.00',     type: 'expense', catColor: '#0284c7', catBg: 'rgba(2,132,199,0.12)'   },
  { input: 'received 25000 salary',    merchant: 'Salary',     category: 'Income',        amount: '₱25,000.00', type: 'income',  catColor: '#1f6950', catBg: 'rgba(31,105,80,0.12)'   },
  { input: 'netflix 649',              merchant: 'Netflix',    category: 'Entertainment', amount: '₱649.00',    type: 'expense', catColor: '#db2777', catBg: 'rgba(219,39,119,0.12)'  },
  { input: 'meralco bill 1740',        merchant: 'Meralco',    category: 'Utilities',     amount: '₱1,740.00',  type: 'expense', catColor: '#d97706', catBg: 'rgba(217,119,6,0.12)'   },
]

const TYPING_SPEED      = 42
const PAUSE_AFTER_TYPE  = 700
const PAUSE_AFTER_RESULT = 2200

function EntryDemo() {
  const [seqIndex, setSeqIndex]   = useState(0)
  const [displayText, setDisplay] = useState('')
  const [phase, setPhase]         = useState<'typing' | 'result' | 'clearing'>('typing')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charRef    = useRef(0)
  const entry = DEMO_SEQUENCE[seqIndex]

  useEffect(() => { charRef.current = 0; setDisplay(''); setPhase('typing') }, [seqIndex])

  useEffect(() => {
    if (phase === 'typing') {
      if (charRef.current < entry.input.length) {
        timeoutRef.current = setTimeout(() => {
          charRef.current += 1
          setDisplay(entry.input.slice(0, charRef.current))
        }, TYPING_SPEED)
      } else {
        timeoutRef.current = setTimeout(() => setPhase('result'), PAUSE_AFTER_TYPE)
      }
    } else if (phase === 'result') {
      timeoutRef.current = setTimeout(() => setPhase('clearing'), PAUSE_AFTER_RESULT)
    } else {
      timeoutRef.current = setTimeout(() => setSeqIndex(i => (i + 1) % DEMO_SEQUENCE.length), 200)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [phase, displayText, entry.input.length])

  const isIncome = entry.type === 'income'

  return (
    <div
      className="w-full max-w-[360px] rounded-[28px] overflow-hidden select-none"
      style={{ background: '#ffffff', boxShadow: '0 40px 100px rgba(0,40,32,0.30), 0 8px 32px rgba(0,53,46,0.15)' }}
      aria-hidden="true"
    >
      {/* Phone chrome */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: '#f8faf9', borderBottom: '1px solid #e7edeb' }}>
        <span className="font-mono text-[11px] font-bold" style={{ color: '#00352e' }}>LedgeIt</span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#d4e4e0' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#d4e4e0' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#1f695d' }} />
        </div>
      </div>

      <div className="px-5 pt-5 pb-4" style={{ minHeight: '160px' }}>
        <p className="mb-3 text-[11px] font-semibold" style={{ color: '#6e9990' }}>Smart Log</p>
        <div className="relative min-h-[56px]">
          <p className="text-[1.35rem] font-light leading-snug" style={{ color: displayText ? '#191c1c' : '#cde0db' }}>
            {displayText || 'try: 20 mcdonalds lunch'}
            {phase === 'typing' && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                className="inline-block w-[2px] h-[1.2em] align-text-bottom ml-0.5 rounded-sm"
                style={{ background: '#1f695d' }}
              />
            )}
          </p>
        </div>

        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              key={`r-${seqIndex}`}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="mt-4 rounded-2xl p-4"
              style={{ background: isIncome ? 'rgba(31,105,80,0.06)' : '#f8faf9', border: isIncome ? '1px solid rgba(31,105,80,0.2)' : '1px solid #e7edeb' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-2xl font-bold tracking-tight" style={{ color: isIncome ? '#1f6950' : '#191c1c' }}>{entry.amount}</span>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: isIncome ? 'rgba(31,105,80,0.1)' : 'rgba(186,26,26,0.08)', color: isIncome ? '#1f6950' : '#ba1a1a' }}>
                  {isIncome ? '+ income' : '− expense'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: entry.catBg }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: entry.catColor }} />
                  <span className="text-[10px] font-semibold" style={{ color: entry.catColor }}>{entry.category}</span>
                </div>
                <span className="text-[11px]" style={{ color: '#6e9990' }}>{entry.merchant}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 pb-5">
        <motion.div
          animate={phase === 'result' ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="w-full rounded-2xl py-4 text-center text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
        >
          Log Transaction
        </motion.div>
      </div>
    </div>
  )
}

// ─── Count-up ─────────────────────────────────────────────────────────────────

function CountUp({ target, suffix = '', className, style }: { target: number; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const ref      = useRef<HTMLSpanElement>(null)
  const inView   = useInView(ref, { once: true, margin: '-60px' })
  const motionVal = useMotionValue(0)
  const spring   = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => { if (inView) motionVal.set(target) }, [inView, motionVal, target])
  useEffect(() => { return spring.on('change', v => setDisplay(Math.round(v))) }, [spring])

  return <span ref={ref} className={className} style={style}>{display}{suffix}</span>
}

// ─── Section reveal ───────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-48px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28, delay }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  )
}

// ─── Household feed items ─────────────────────────────────────────────────────

const FEED_ITEMS = [
  { merchant: 'SM Supermarket', category: 'Groceries',     amount: '−₱2,340', who: 'Ana',   catColor: '#28a46a', catBg: 'rgba(40,164,106,0.12)'  },
  { merchant: 'Grab',           category: 'Transport',     amount: '−₱65',    who: 'Marco', catColor: '#0284c7', catBg: 'rgba(2,132,199,0.12)'    },
  { merchant: 'Netflix',        category: 'Entertainment', amount: '−₱649',   who: 'Ana',   catColor: '#db2777', catBg: 'rgba(219,39,119,0.12)'   },
  { merchant: 'Salary',         category: 'Income',        amount: '+₱40,000',who: 'Marco', catColor: '#1f6950', catBg: 'rgba(31,105,80,0.12)'    },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#f8faf9', color: '#191c1c' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <motion.header
        className="fixed left-0 right-0 top-0 z-50"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          paddingBottom: '14px',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
        animate={{
          background: scrolled ? 'rgba(248,250,249,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(205,224,219,0.5)' : '1px solid transparent',
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 lg:px-8">
          <span className="font-mono text-[15px] font-bold tracking-tight" style={{ color: scrolled ? '#00352e' : '#ffffff' }}>
            LedgeIt
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-[13px] font-semibold transition-colors sm:block"
              style={{ color: scrolled ? '#3f4946' : 'rgba(255,255,255,0.75)' }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
              style={{
                background: scrolled ? 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' : 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: scrolled ? 'none' : '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Sign up free
              <ArrowRight size={13} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #001e18 0%, #00352e 40%, #1a6358 100%)',
          minHeight: '100dvh',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 80px)',
          paddingBottom: '80px',
        }}
      >
        {/* Refraction edge */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0.22) 70%, transparent 95%)' }}
        />
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px]"
          style={{ background: 'radial-gradient(circle at 70% 20%, rgba(31,105,93,0.3) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* ── Left: copy ── */}
            <div className="flex flex-col lg:flex-1 lg:max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.1 }}
                className="mb-6 inline-flex items-center self-start gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <Sparkle size={12} weight="fill" color="rgba(255,255,255,0.7)" aria-hidden="true" />
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Built for Filipino households
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.18 }}
                className="mb-5 text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight"
                style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
              >
                Budget tracking your household will actually keep using.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.26 }}
                className="mb-8 max-w-md text-[1.05rem] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.70)' }}
              >
                Type it the way you&apos;d say it. Done in 5 seconds. No dropdowns, no categories to configure — just log it.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.34 }}
                className="flex flex-wrap gap-3"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold transition-transform active:scale-[0.97]"
                  style={{ background: '#ffffff', color: '#00352e' }}
                >
                  Sign up free
                  <ArrowRight size={15} weight="bold" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}
                >
                  Sign in
                </Link>
              </motion.div>

              {/* Trust line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="mt-6 text-[12px]"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Free to start · No credit card · Works immediately
              </motion.p>
            </div>

            {/* ── Right: demo widget ── */}
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.44 }}
              className="flex justify-center lg:flex-1 lg:justify-end"
            >
              <EntryDemo />
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(to bottom, transparent, #f8faf9)' }}
        />
      </section>

      {/* ── 5-SECOND CLAIM ───────────────────────────────────────────────────── */}
      <section className="px-6 py-24 lg:px-8" style={{ background: '#f8faf9' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="flex flex-col items-center gap-5 text-center">
            <p className="text-sm font-medium" style={{ color: '#6e9990' }}>
              Average time to log a transaction
            </p>
            <CountUp
              target={5}
              suffix="s"
              className="font-mono font-bold leading-none tracking-tight"
              style={{ fontSize: 'clamp(5rem, 14vw, 9rem)', color: '#00352e' }}
            />
            <p className="max-w-lg text-base leading-relaxed" style={{ color: '#3f4946' }}>
              Most apps average 40–90 seconds once you factor in opening, navigating menus, selecting a category, and closing. LedgeIt is a single sentence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-14 text-center">
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: '#00352e', textWrap: 'balance' } as React.CSSProperties}
            >
              Three steps. Under five seconds.
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#6e9990' }}>This is all it takes.</p>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: '1',
                title: "Type it the way you'd say it",
                body: '"grab 85 morning commute" or "bought meds 320" — Filipino, English, or mixed. Whatever comes naturally.',
                visual: (
                  <div className="rounded-2xl px-5 py-4" style={{ background: '#f0f4f2', border: '1px solid #e7edeb' }}>
                    <p className="text-base font-light" style={{ color: '#191c1c' }}>
                      grab 85 morning commute
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                        className="inline-block w-[2px] h-[1em] align-middle ml-1 rounded-sm"
                        style={{ background: '#1f695d' }}
                      />
                    </p>
                  </div>
                ),
              },
              {
                n: '2',
                title: 'It parses instantly',
                body: 'Amount, merchant, category — recognised in under a second. No dropdowns to navigate, no field to fill.',
                visual: (
                  <div className="rounded-2xl p-4" style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.06)', border: '1px solid #e7edeb' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xl font-bold" style={{ color: '#191c1c' }}>₱85.00</span>
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(186,26,26,0.08)', color: '#ba1a1a' }}>− expense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(2,132,199,0.12)' }}>
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#0284c7' }} />
                        <span className="text-[10px] font-semibold" style={{ color: '#0284c7' }}>Transport</span>
                      </div>
                      <span className="text-[11px]" style={{ color: '#6e9990' }}>Grab</span>
                    </div>
                  </div>
                ),
              },
              {
                n: '3',
                title: 'Logged. Done.',
                body: 'One tap to confirm. The transaction is in your ledger before you put your phone down.',
                visual: (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-5" style={{ background: 'rgba(31,105,93,0.08)', border: '1px solid rgba(31,105,93,0.2)' }}>
                    <CheckCircle size={20} weight="fill" color="#1f6950" aria-hidden="true" />
                    <span className="text-sm font-semibold" style={{ color: '#1f6950' }}>Transaction logged</span>
                  </div>
                ),
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="flex flex-col gap-4">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
                  >
                    {step.n}
                  </div>
                  <div>
                    <h3 className="mb-2 text-base font-bold" style={{ color: '#191c1c' }}>{step.title}</h3>
                    <p className="mb-4 text-sm leading-relaxed" style={{ color: '#6e9990' }}>{step.body}</p>
                    {step.visual}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8" style={{ background: '#f8faf9' }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                Icon: Lightning,
                title: 'Natural language parsing',
                body: 'Type "mcdo 200 lunch with kids" and it understands amount, merchant, and category. Filipino phrases work natively.',
              },
              {
                Icon: ChatText,
                title: 'Gets smarter over time',
                body: 'Correct a category once and it remembers. Regular merchants are recognised instantly from your history.',
              },
              {
                Icon: Users,
                title: 'Built for households',
                body: 'Log from multiple people under one account. See who bought what, without anyone needing to explain.',
              },
            ].map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div
                  className="flex flex-col gap-4 rounded-2xl p-6"
                  style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.05)' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(0,53,46,0.07)' }}
                  >
                    <Icon size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-base font-bold" style={{ color: '#191c1c' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#6e9990' }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOUSEHOLD ────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">

            {/* Copy */}
            <Reveal className="lg:flex-1 lg:max-w-md lg:pt-4">
              <h2
                className="mb-4 text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
                style={{ color: '#00352e', textWrap: 'balance' } as React.CSSProperties}
              >
                Track together, judge nobody.
              </h2>
              <p className="mb-6 text-base leading-relaxed" style={{ color: '#6e9990' }}>
                Everyone logs their own expenses. The shared feed shows the full picture — no spreadsheet, no group chat receipts, no arguments about who forgot to record the grocery run.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
              >
                Get started free
                <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </Reveal>

            {/* Feed mockup */}
            <Reveal className="lg:flex-1" delay={0.08}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: '#f8faf9', boxShadow: '0 4px 24px rgba(0,53,46,0.08)' }}
              >
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f4f2' }}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#3f4946' }}>
                    Family Ledger
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: '#f0f4f2', color: '#6e9990' }}>
                    This month
                  </span>
                </div>

                {FEED_ITEMS.map((item, i) => (
                  <div
                    key={item.merchant + i}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ borderBottom: i < FEED_ITEMS.length - 1 ? '1px solid #f0f4f2' : undefined }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: item.catBg }}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ background: item.catColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: '#191c1c' }}>{item.merchant}</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
                        {item.category}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'rgba(0,53,46,0.07)', color: '#3f4946' }}
                        >
                          {item.who}
                        </span>
                      </p>
                    </div>
                    <span
                      className="shrink-0 font-mono text-[13px] font-bold tabular-nums"
                      style={{ color: item.amount.startsWith('+') ? '#1f6950' : '#ba1a1a' }}
                    >
                      {item.amount}
                    </span>
                  </div>
                ))}

                {/* Footer summary */}
                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderTop: '1px solid #f0f4f2', background: '#fcfefe' }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: '#8eaeaa' }}>Net this month</span>
                  <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: '#1f6950' }}>+₱36,946</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center lg:px-8"
        style={{ background: 'linear-gradient(160deg, #001e18 0%, #00352e 45%, #1a5f52 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.18) 70%, transparent 95%)' }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(31,105,93,0.45) 0%, transparent 70%)' }}
        />

        <Reveal className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-6">
          <h2
            className="text-[clamp(1.8rem,5vw,2.8rem)] font-bold leading-tight tracking-tight"
            style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
          >
            Log your first expense in 5 seconds.
          </h2>
          <p className="max-w-sm text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
            Free to start. No credit card. No categories to configure first. Works immediately.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold transition-transform active:scale-[0.97]"
            style={{ background: '#ffffff', color: '#00352e' }}
          >
            Sign up free — it&apos;s instant
            <ArrowRight size={15} weight="bold" aria-hidden="true" />
          </Link>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.58)' }}>
              Sign in
            </Link>
          </p>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-6 lg:px-8" style={{ background: '#f8faf9', borderTop: '1px solid #e7edeb' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-mono text-[12px] font-bold" style={{ color: '#00352e' }}>LedgeIt</span>
          <span className="text-[12px]" style={{ color: '#6e9990' }}>© 2026 LedgeIt</span>
        </div>
      </footer>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
