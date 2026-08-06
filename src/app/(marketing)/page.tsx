'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  Lightning,
  ArrowRight,
  CheckCircle,
  Sparkle,
  ChatText,
  Users,
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [phase, displayText, entry.input])

  const isIncome = entry.type === 'income'

  return (
    <div
      className="w-full max-w-[360px] rounded-[28px] overflow-hidden select-none"
      style={{ background: '#ffffff', boxShadow: '0 40px 100px rgba(0,40,32,0.30), 0 8px 32px rgba(0,53,46,0.15)' }}
      aria-hidden="true"
    >
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

// ─── Correction demo (for NLP feature block) ──────────────────────────────────

const CORRECTIONS = [
  { original: 'mcdo',     corrected: "McDonald's", catColor: '#e05c2a' },
  { original: 'meralco',  corrected: 'Meralco',    catColor: '#d97706' },
  { original: 'grab',     corrected: 'Grab',       catColor: '#0284c7' },
  { original: 'jollibee', corrected: 'Jollibee',   catColor: '#e05c2a' },
]

function SmartCorrectDemo() {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'showing' | 'fading'>('showing')
  const item = CORRECTIONS[idx]

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 1800)
    const t2 = setTimeout(() => {
      setIdx(i => (i + 1) % CORRECTIONS.length)
      setPhase('showing')
    }, 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [idx])

  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="flex items-center gap-2">
        <div className="rounded-full px-3 py-1.5 text-sm font-light" style={{ background: '#f0f4f2', color: '#6e9990' }}>
          {item.original} 320
        </div>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0 opacity-40">
          <path d="M1 5h14M10 1l5 4-5 4" stroke="#1f695d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: phase === 'fading' ? 0 : 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: `${item.catColor}18`, border: `1px solid ${item.catColor}30` }}
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: item.catColor }} />
            <span className="text-[12px] font-semibold" style={{ color: item.catColor }}>{item.corrected}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-[11px]" style={{ color: '#6e9990' }}>Recognised from your history — no typing needed next time.</p>
    </div>
  )
}

// ─── Household feed mini ──────────────────────────────────────────────────────

const FEED_MINI = [
  { merchant: 'SM Supermarket', amount: '−₱2,340', who: 'Ana',   catColor: '#28a46a' },
  { merchant: 'Grab',           amount: '−₱65',    who: 'Marco', catColor: '#0284c7' },
  { merchant: 'Netflix',        amount: '−₱649',   who: 'Ana',   catColor: '#db2777' },
  { merchant: 'Salary',         amount: '+₱40,000',who: 'Marco', catColor: '#1f6950' },
]

// ─── Count-up ─────────────────────────────────────────────────────────────────

function CountUp({ target, suffix = '', className, style }: { target: number; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const ref       = useRef<HTMLSpanElement>(null)
  const inView    = useInView(ref, { once: true, margin: '-60px' })
  const motionVal = useMotionValue(0)
  const spring    = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => { if (inView) motionVal.set(target) }, [inView, motionVal, target])
  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring])

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

// ─── Household feed items (full) ──────────────────────────────────────────────

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
        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            opacity: 0.35,
          }}
        />
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

            {/* Left: copy */}
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

            {/* Right: demo widget */}
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
          <Reveal className="mb-16 text-center">
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: '#00352e', textWrap: 'balance' } as React.CSSProperties}
            >
              Three steps. Under five seconds.
            </h2>
          </Reveal>

          <div className="grid gap-0 sm:grid-cols-3">
            {[
              {
                n: '01',
                title: "Type it the way you'd say it",
                body: '"grab 85 morning commute" or "bought meds 320" — Filipino, English, or mixed.',
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
                n: '02',
                title: 'It parses instantly',
                body: 'Amount, merchant, category — recognised in under a second. No dropdowns.',
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
                n: '03',
                title: 'Logged. Done.',
                body: 'One tap to confirm. In your ledger before you put your phone down.',
                visual: (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-5" style={{ background: 'rgba(31,105,93,0.08)', border: '1px solid rgba(31,105,93,0.2)' }}>
                    <CheckCircle size={20} weight="fill" color="#1f6950" aria-hidden="true" />
                    <span className="text-sm font-semibold" style={{ color: '#1f6950' }}>Transaction logged</span>
                  </div>
                ),
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08} className="relative">
                {/* Step connector line */}
                {i < 2 && (
                  <div
                    className="absolute top-6 right-0 hidden sm:block h-px w-1/2"
                    style={{ background: 'linear-gradient(90deg, #cde0db, transparent)', transform: 'translateX(100%)' }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col gap-5 px-2 sm:px-4 pb-8 sm:pb-0">
                  {/* Ghost number + title */}
                  <div className="relative">
                    <span
                      className="absolute -top-3 left-0 font-mono font-bold leading-none select-none pointer-events-none"
                      style={{ fontSize: 'clamp(4rem,8vw,6rem)', color: 'rgba(0,53,46,0.06)', lineHeight: 1 }}
                      aria-hidden="true"
                    >
                      {step.n}
                    </span>
                    <div className="relative pt-8">
                      <h3 className="mb-2 text-[15px] font-bold leading-snug" style={{ color: '#191c1c' }}>{step.title}</h3>
                      <p className="mb-4 text-sm leading-relaxed" style={{ color: '#6e9990' }}>{step.body}</p>
                    </div>
                  </div>
                  {step.visual}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8" style={{ background: '#f8faf9' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12">
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: '#00352e', textWrap: 'balance' } as React.CSSProperties}
            >
              Built for the way<br className="hidden sm:block" /> households actually spend.
            </h2>
          </Reveal>

          {/* Asymmetric bento: large left + narrow right stack */}
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">

            {/* Large feature: NLP */}
            <Reveal>
              <div
                className="flex flex-col justify-between rounded-3xl p-7 h-full min-h-[320px]"
                style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.05)' }}
              >
                <div>
                  <div
                    className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(0,53,46,0.07)' }}
                  >
                    <Lightning size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-[1.15rem] font-bold leading-snug" style={{ color: '#191c1c' }}>
                    Speaks Filipino.<br />Understands context.
                  </h3>
                  <p className="mb-6 text-sm leading-relaxed max-w-sm" style={{ color: '#6e9990' }}>
                    Type "mcdo 200 lunch with kids" or "bayad kuryente 1740". Filipino, English, or Taglish — it parses what you mean, not what you typed exactly.
                  </p>
                </div>
                <SmartCorrectDemo />
              </div>
            </Reveal>

            {/* Right column: two stacked smaller features */}
            <div className="flex flex-col gap-4">
              <Reveal delay={0.06}>
                <div
                  className="flex flex-col gap-4 rounded-3xl p-6"
                  style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.05)' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(0,53,46,0.07)' }}
                  >
                    <ChatText size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[15px] font-bold" style={{ color: '#191c1c' }}>Gets smarter over time</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#6e9990' }}>
                      Fix a category once and it remembers. Frequent merchants are recognised instantly.
                    </p>
                  </div>
                  {/* Mini history visual */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    {FEED_MINI.slice(0, 3).map((row) => (
                      <div key={row.merchant} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#f8faf9' }}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: row.catColor }} />
                          <span className="text-[12px] font-medium" style={{ color: '#3f4946' }}>{row.merchant}</span>
                        </div>
                        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: row.amount.startsWith('+') ? '#1f6950' : '#ba1a1a' }}>{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div
                  className="flex flex-col gap-4 rounded-3xl p-6"
                  style={{ background: '#00352e' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                  >
                    <Users size={20} weight="fill" color="rgba(255,255,255,0.85)" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[15px] font-bold" style={{ color: '#ffffff' }}>Built for households</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                      Log from multiple people. See who bought what — no group chat receipts, no arguments about the grocery run.
                    </p>
                  </div>
                  {/* Avatar cluster */}
                  <div className="flex items-center gap-2">
                    {['A', 'M', 'J'].map((initial, i) => (
                      <div
                        key={initial}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: ['rgba(31,105,93,0.5)', 'rgba(255,255,255,0.18)', 'rgba(31,105,93,0.3)'][i],
                          color: '#ffffff',
                          marginLeft: i > 0 ? '-6px' : 0,
                          zIndex: 3 - i,
                          position: 'relative',
                        }}
                      >
                        {initial}
                      </div>
                    ))}
                    <span className="ml-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>3 members logging</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOUSEHOLD FEED ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-8" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">

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
        className="relative overflow-hidden px-6 py-32 lg:px-8"
        style={{ background: '#f8faf9' }}
      >
        {/* Tonal block behind the text */}
        <div
          className="pointer-events-none absolute inset-x-6 inset-y-8 rounded-3xl lg:inset-x-8"
          style={{ background: 'linear-gradient(150deg, #001e18 0%, #00352e 50%, #1a5f52 100%)' }}
          aria-hidden="true"
        />
        {/* Grain on the block */}
        <div
          className="pointer-events-none absolute inset-x-6 inset-y-8 rounded-3xl lg:inset-x-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            opacity: 0.4,
          }}
          aria-hidden="true"
        />

        <Reveal className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            For Filipino households
          </p>
          <h2
            className="text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[1.06] tracking-tight"
            style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
          >
            Log your first expense in 5 seconds.
          </h2>
          <p className="max-w-sm text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Free to start. No credit card. No categories to configure first. Works immediately — just type.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold transition-transform active:scale-[0.97]"
            style={{ background: '#ffffff', color: '#00352e' }}
          >
            Sign up free — it&apos;s instant
            <ArrowRight size={15} weight="bold" aria-hidden="true" />
          </Link>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.52)' }}>
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
