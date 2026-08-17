'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useMotionValue, useSpring, useReducedMotion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  Lightning,
  ArrowRight,
  CheckCircle,
  Sparkle,
  ChatText,
  Users,
  TrendUp,
  Wallet,
  Target,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import SiteFooter from '@/components/marketing/SiteFooter'

// ─── Design tokens (mirror of globals.css --ledge-*) ──────────────────────────
// Shared focus ring for custom-styled CTAs (DESIGN.md: 2px accent-dim, 2px offset).
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ledge-accent-dim)] focus-visible:ring-offset-2'

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--ledge-accent-dim) 0%, var(--ledge-accent) 100%)'

// In-page section anchors surfaced in the top nav.
const NAV_LINKS = [
  { href: '#what',         label: 'Why LedgeIt' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features',     label: 'Features' },
  { href: '#households',   label: 'Sharing' },
]

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

// ─── Blinking caret (respects reduced motion) ─────────────────────────────────

function Caret({ height = '1.2em' }: { height?: string }) {
  const reduce = useReducedMotion()
  const base = 'inline-block w-[2px] align-text-bottom ml-0.5 rounded-sm'
  if (reduce) {
    return <span className={base} style={{ height, background: 'var(--ledge-accent-dim)' }} aria-hidden="true" />
  }
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      className={base}
      style={{ height, background: 'var(--ledge-accent-dim)' }}
      aria-hidden="true"
    />
  )
}

function EntryDemo() {
  const reduce = useReducedMotion()
  const [seqIndex, setSeqIndex]   = useState(0)
  const [displayText, setDisplay] = useState('')
  const [phase, setPhase]         = useState<'typing' | 'result' | 'clearing'>('typing')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charRef    = useRef(0)
  const entry = DEMO_SEQUENCE[seqIndex]

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charRef.current = 0; setDisplay(''); setPhase('typing') }, [seqIndex])

  useEffect(() => {
    if (reduce) return   // no looping animation under reduced-motion; frozen on parsed result
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
  }, [phase, displayText, entry.input, reduce])

  // Under reduced-motion the demo doesn't animate — render a static parsed result.
  const shownText  = reduce ? entry.input : displayText
  const shownPhase = reduce ? 'result' : phase
  const isIncome = entry.type === 'income'

  return (
    <div
      className="w-full max-w-[360px] rounded-[28px] overflow-hidden select-none"
      style={{ background: '#ffffff', boxShadow: '0 40px 100px rgba(0,40,32,0.30), 0 8px 32px rgba(0,53,46,0.15)' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--ledge-bg)', borderBottom: '1px solid var(--ledge-surface2)' }}>
        <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--ledge-accent)' }}>LedgeIt</span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ledge-surface-high)' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ledge-surface-high)' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ledge-accent-dim)' }} />
        </div>
      </div>

      <div className="px-5 pt-5 pb-4" style={{ minHeight: '160px' }}>
        <p className="mb-3 text-[11px] font-semibold" style={{ color: 'var(--ledge-muted)' }}>Smart Log</p>
        <div className="relative min-h-[56px]">
          <p className="text-[1.35rem] font-light leading-snug" style={{ color: shownText ? 'var(--ledge-data)' : 'var(--ledge-border)' }}>
            {shownText || 'try: 20 mcdonalds lunch'}
            {shownPhase === 'typing' && <Caret />}
          </p>
        </div>

        <AnimatePresence>
          {shownPhase === 'result' && (
            <motion.div
              key={`r-${seqIndex}`}
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="mt-4 rounded-2xl p-4"
              style={{ background: isIncome ? 'rgba(31,105,80,0.06)' : 'var(--ledge-bg)', border: isIncome ? '1px solid rgba(31,105,80,0.2)' : '1px solid var(--ledge-surface2)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-2xl font-bold tracking-tight" style={{ color: isIncome ? 'var(--ledge-gain)' : 'var(--ledge-data)' }}>{entry.amount}</span>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: isIncome ? 'rgba(31,105,80,0.1)' : 'rgba(186,26,26,0.08)', color: isIncome ? 'var(--ledge-gain)' : 'var(--ledge-danger)' }}>
                  {isIncome ? '+ income' : '− expense'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: entry.catBg }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: entry.catColor }} />
                  <span className="text-[10px] font-semibold" style={{ color: entry.catColor }}>{entry.category}</span>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--ledge-muted)' }}>{entry.merchant}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 pb-5">
        <motion.div
          animate={shownPhase === 'result' ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="w-full rounded-2xl py-4 text-center text-sm font-bold"
          style={{ background: PRIMARY_GRADIENT, color: '#ffffff' }}
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
  const reduce = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'showing' | 'fading'>('showing')
  const item = CORRECTIONS[idx]

  useEffect(() => {
    if (reduce) return   // frozen on a single recognised merchant under reduced-motion
    const t1 = setTimeout(() => setPhase('fading'), 1800)
    const t2 = setTimeout(() => {
      setIdx(i => (i + 1) % CORRECTIONS.length)
      setPhase('showing')
    }, 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [idx, reduce])

  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="flex items-center gap-2">
        <div className="rounded-full px-3 py-1.5 text-sm font-light" style={{ background: 'var(--ledge-surface)', color: 'var(--ledge-muted)' }}>
          {item.original} 320
        </div>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0 opacity-40">
          <path d="M1 5h14M10 1l5 4-5 4" stroke="#1f695d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={reduce ? false : { opacity: 0, x: 6 }}
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
      <p className="text-[11px]" style={{ color: 'var(--ledge-muted)' }}>Recognised from your history — no typing needed next time.</p>
    </div>
  )
}

// ─── Household feed mini ──────────────────────────────────────────────────────

const FEED_MINI = [
  { merchant: 'SM Supermarket', amount: '−₱2,340', who: 'Ana',   catColor: '#1f8a5f' },
  { merchant: 'Grab',           amount: '−₱65',    who: 'Marco', catColor: '#0284c7' },
  { merchant: 'Netflix',        amount: '−₱649',   who: 'Ana',   catColor: '#db2777' },
  { merchant: 'Salary',         amount: '+₱40,000',who: 'Marco', catColor: '#1f6950' },
]

// ─── Count-up ─────────────────────────────────────────────────────────────────

function CountUp({ target, suffix = '', className, style }: { target: number; suffix?: string; className?: string; style?: React.CSSProperties }) {
  const reduce    = useReducedMotion()
  const ref       = useRef<HTMLSpanElement>(null)
  const inView    = useInView(ref, { once: true, margin: '-60px' })
  const motionVal = useMotionValue(0)
  const spring    = useSpring(motionVal, { stiffness: 60, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return   // reduced-motion renders the final value directly, no animation
    motionVal.set(target)
  }, [inView, reduce, motionVal, target])
  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring])

  // Under reduced-motion (or before in-view) show the target immediately rather than counting.
  const shown = reduce ? target : display

  return <span ref={ref} className={className} style={style}>{shown}{suffix}</span>
}

// ─── Section reveal ───────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-48px' })

  // Under reduced-motion, render content in its final visible state — no entrance.
  if (reduce) {
    return <div ref={ref} className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28, delay }}
    >
      {children}
    </motion.div>
  )
}

// ─── Household feed items (full) ──────────────────────────────────────────────

const FEED_ITEMS = [
  { merchant: 'SM Supermarket', category: 'Groceries',     amount: '−₱2,340', who: 'Ana',   catColor: '#1f8a5f', catBg: 'rgba(31,138,95,0.12)'  },
  { merchant: 'Grab',           category: 'Transport',     amount: '−₱65',    who: 'Marco', catColor: '#0284c7', catBg: 'rgba(2,132,199,0.12)'    },
  { merchant: 'Netflix',        category: 'Entertainment', amount: '−₱649',   who: 'Ana',   catColor: '#db2777', catBg: 'rgba(219,39,119,0.12)'   },
  { merchant: 'Salary',         category: 'Income',        amount: '+₱40,000',who: 'Marco', catColor: '#1f6950', catBg: 'rgba(31,105,80,0.12)'    },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Hero parallax: track scroll and drift background layers at different speeds.
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const photoY  = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1.32])
  const glowY   = useTransform(scrollYProgress, [0, 1], ['0%', '55%'])
  const copyY   = useTransform(scrollYProgress, [0, 1], ['0%', '-14%'])
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  // "How it works" section parallax (enters from below → drifts as it passes through).
  const howRef = useRef<HTMLElement>(null)
  const { scrollYProgress: howProgress } = useScroll({ target: howRef, offset: ['start end', 'end start'] })
  const howPhotoY = useTransform(howProgress, [0, 1], ['-12%', '12%'])

  // Hero entrance helper: instant (no transform) under reduced-motion.
  const enter = (y: number, delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay } }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ledge-bg)', color: 'var(--ledge-data)' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <motion.header
        className="fixed left-0 right-0 top-0 z-50"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)',
          paddingBottom: '18px',
          // Blur toggles instantly (animating backdrop-filter is expensive / janky on scroll).
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
        animate={{
          backgroundColor: scrolled ? 'rgba(248,250,249,0.92)' : 'rgba(248,250,249,0)',
          borderBottom: scrolled ? '1px solid rgba(205,224,219,0.5)' : '1px solid rgba(205,224,219,0)',
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            {/* Logo placeholder — swap for the real mark when ready */}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-[16px] font-bold"
              style={{
                background: scrolled ? PRIMARY_GRADIENT : 'rgba(255,255,255,0.14)',
                color: '#ffffff',
                border: scrolled ? 'none' : '1px solid rgba(255,255,255,0.28)',
              }}
              aria-hidden="true"
            >
              L
            </span>
            <a href="#top" className={`font-mono text-[18px] font-bold tracking-tight ${FOCUS_RING} rounded-md`} style={{ color: scrolled ? 'var(--ledge-accent)' : '#ffffff' }}>
              LedgeIt
            </a>
            <span className="hidden lg:inline text-[12px] font-semibold" style={{ color: scrolled ? 'var(--ledge-muted)' : 'rgba(255,255,255,0.5)' }}>
              Spent it? LedgeIt.
            </span>
          </div>

          {/* Center: section links */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Sections">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${FOCUS_RING}`}
                style={{ color: scrolled ? 'var(--ledge-data-var)' : 'rgba(255,255,255,0.78)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = scrolled ? 'rgba(0,53,46,0.06)' : 'rgba(255,255,255,0.10)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className={`hidden sm:inline-flex min-h-[44px] items-center rounded-full px-5 text-[14px] font-semibold transition-colors ${FOCUS_RING}`}
              style={{ color: scrolled ? 'var(--ledge-data-var)' : 'rgba(255,255,255,0.82)' }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold transition-transform active:scale-[0.97] ${FOCUS_RING}`}
              style={{
                background: scrolled ? PRIMARY_GRADIENT : '#ffffff',
                color: scrolled ? '#ffffff' : 'var(--ledge-accent)',
                boxShadow: scrolled ? 'none' : '0 2px 12px rgba(0,20,16,0.18)',
              }}
            >
              Try it free
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        id="top"
        ref={heroRef}
        className="relative flex flex-col justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #00352e 0%, #0d4d43 45%, #1f7a6b 100%)',
          minHeight: '100dvh',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 120px)',
          paddingBottom: '120px',
        }}
      >
        {/* Parallax photo layer — heavily tinted so it reads as texture, not stock photo */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={reduce ? undefined : { y: photoY, scale: photoScale }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1600&q=80')",
              opacity: 0.5,
            }}
          />
          {/* Green wash to lock the photo into the brand palette */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(155deg, rgba(0,53,46,0.80) 0%, rgba(13,77,67,0.74) 45%, rgba(31,122,107,0.62) 100%)' }}
          />
        </motion.div>

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
        {/* Ambient glows — warm the space, add depth (drift on scroll) */}
        <motion.div
          className="pointer-events-none absolute -right-32 -top-24 h-[680px] w-[680px]"
          style={{ background: 'radial-gradient(circle at 60% 30%, rgba(52,168,146,0.38) 0%, transparent 62%)', ...(reduce ? {} : { y: glowY }) }}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[560px] w-[560px]"
          style={{ background: 'radial-gradient(circle at 40% 60%, rgba(31,122,107,0.30) 0%, transparent 65%)', ...(reduce ? {} : { y: glowY }) }}
          aria-hidden="true"
        />

        <motion.div
          className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-8"
          style={reduce ? undefined : { y: copyY, opacity: heroFade }}
        >
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">

            {/* Left: copy */}
            <div className="flex flex-col lg:flex-1 lg:max-w-xl">
              <motion.div
                {...enter(12, 0.1)}
                className="mb-6 inline-flex items-center self-start gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <Sparkle size={12} weight="fill" color="rgba(255,255,255,0.7)" aria-hidden="true" />
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  Spent it? LedgeIt.
                </span>
              </motion.div>

              <motion.h1
                {...enter(18, 0.18)}
                className="mb-5 text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight"
                style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
              >
                Tracking money, without the{' '}
                <span style={{ color: 'rgba(255,255,255,0.62)' }}>effort of tracking money.</span>
              </motion.h1>

              <motion.p
                {...enter(14, 0.26)}
                className="mb-8 max-w-md text-[1.05rem] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.82)' }}
              >
                Type it the way you&apos;d say it out loud — &ldquo;grab 85 lunch&rdquo; is a full entry. No forms, no dropdowns, nothing to set up. And if a detail needs fixing, it&apos;s a tap away.
              </motion.p>

              <motion.div
                {...enter(10, 0.34)}
                className="flex flex-wrap gap-3"
              >
                <Link
                  href="/login"
                  className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold transition-transform active:scale-[0.97] ${FOCUS_RING}`}
                  style={{ background: '#ffffff', color: 'var(--ledge-accent)' }}
                >
                  Try it free
                  <ArrowRight size={15} weight="bold" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold ${FOCUS_RING}`}
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.20)' }}
                >
                  Sign in
                </Link>
              </motion.div>

              <motion.p
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduce ? undefined : { delay: 0.55 }}
                className="mt-6 text-[12px]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Free to start · No credit card · Nothing to set up
              </motion.p>
            </div>

            {/* Right: demo widget */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reduce ? undefined : { type: 'spring', stiffness: 200, damping: 26, delay: 0.44 }}
              className="flex justify-center lg:flex-1 lg:justify-end"
            >
              <EntryDemo />
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.a
          href="#how-it-works"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduce ? undefined : { delay: 0.8 }}
          className={`absolute inset-x-0 bottom-8 z-10 mx-auto flex w-fit flex-col items-center gap-2 rounded-2xl px-4 py-2 transition-opacity hover:opacity-80 ${FOCUS_RING}`}
          aria-label="See how it works"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            See it in action
          </span>
          <motion.div
            animate={reduce ? undefined : { y: [0, 6, 0] }}
            transition={reduce ? undefined : { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 7l5 5 5-5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.a>

      </section>

      {/* ── WHAT / WHY DIFFERENT ─────────────────────────────────────────────── */}
      <section id="what" className="scroll-mt-24 py-24" style={{ background: 'var(--ledge-bg)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="mb-14 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--ledge-muted)' }}>
              What is LedgeIt
            </p>
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}
            >
              A budgeting app you&apos;ll actually keep using.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
              LedgeIt is a money tracker for Filipinos that turns plain language into logged transactions. Most budgeting apps die by week two because logging is a chore. Here&apos;s what makes this one different.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Lightning,
                title: 'Type, don’t tap',
                body: 'One plain sentence is a full entry — no forms, no dropdowns, no category to pick. Logged in seconds, not menus.',
              },
              {
                icon: Sparkle,
                title: 'Speaks Taglish',
                body: 'Filipino, English, or a mix — it reads what you meant, not just what you spelled. And a wrong detail is one tap to fix.',
              },
              {
                icon: Users,
                title: 'Yours or shared',
                body: 'Complete on its own as a personal log. Invite a partner or family whenever you want to share one ledger.',
              },
            ].map((d, i) => (
              <Reveal key={d.title} delay={i * 0.08}>
                <div className="flex h-full flex-col gap-4 rounded-3xl p-7" style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.05)' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,53,46,0.07)' }}>
                    <d.icon size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                  </div>
                  <h3 className="text-[1.05rem] font-bold leading-snug" style={{ color: 'var(--ledge-data)' }}>{d.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5-SECOND CLAIM ───────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="flex flex-col items-center gap-5 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--ledge-data-var)' }}>
              The average time to log a transaction
            </p>
            <CountUp
              target={5}
              suffix="s"
              className="font-mono font-bold leading-none tracking-tight"
              style={{ fontSize: 'clamp(5rem, 14vw, 9rem)', color: 'var(--ledge-accent)' }}
            />
            <p className="max-w-lg text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
              Most apps take 40 to 90 seconds once you factor in opening, tapping through menus, and choosing a category. That friction is why people stop. LedgeIt asks for one sentence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        ref={howRef}
        className="scroll-mt-24 relative overflow-hidden py-28"
        style={{ background: 'linear-gradient(155deg, #00352e 0%, #0d4d43 50%, #1f7a6b 100%)' }}
      >
        {/* Parallax photo layer — tinted abstract texture */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={reduce ? undefined : { y: howPhotoY, scale: 1.2 }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1600&q=80')",
              opacity: 0.5,
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(155deg, rgba(0,53,46,0.72) 0%, rgba(13,77,67,0.62) 50%, rgba(31,122,107,0.5) 100%)' }}
          />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="mb-16 text-center">
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
            >
              Three steps, and it&apos;s done.
            </h2>
          </Reveal>

          <div className="grid gap-0 sm:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Type it the way you talk',
                body: '"grab 85 morning commute" or "bought meds 320" — Filipino, English, or Taglish, however it comes out.',
                visual: (
                  <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--ledge-surface)', border: '1px solid var(--ledge-surface2)' }}>
                    <p className="text-base font-light" style={{ color: 'var(--ledge-data)' }}>
                      grab 85 morning commute
                      <Caret height="1em" />
                    </p>
                  </div>
                ),
              },
              {
                n: '02',
                title: 'It fills in the details',
                body: 'Amount, merchant, and category — sorted in under a second. Something off? Adjust it with a tap.',
                visual: (
                  <div className="rounded-2xl p-4" style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.06)', border: '1px solid var(--ledge-surface2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xl font-bold" style={{ color: 'var(--ledge-data)' }}>₱85.00</span>
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(186,26,26,0.08)', color: 'var(--ledge-danger)' }}>− expense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(2,132,199,0.12)' }}>
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#0284c7' }} />
                        <span className="text-[10px] font-semibold" style={{ color: '#0284c7' }}>Transport</span>
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--ledge-muted)' }}>Grab</span>
                    </div>
                  </div>
                ),
              },
              {
                n: '03',
                title: "Confirm, and it's logged",
                body: "One tap and it's in your ledger — before you've put your phone back down.",
                visual: (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-5" style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.10)' }}>
                    <CheckCircle size={20} weight="fill" color="#1f6950" aria-hidden="true" />
                    <span className="text-sm font-semibold" style={{ color: 'var(--ledge-gain)' }}>Transaction logged</span>
                  </div>
                ),
              },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08} className="relative">
                {/* Step connector line */}
                {i < 2 && (
                  <div
                    className="absolute top-6 right-0 hidden sm:block h-px w-1/2"
                    style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.35), transparent)', transform: 'translateX(100%)' }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col gap-5 px-2 sm:px-4 pb-8 sm:pb-0">
                  {/* Ghost number + title */}
                  <div className="relative">
                    <span
                      className="absolute -top-3 left-0 font-mono font-bold leading-none select-none pointer-events-none"
                      style={{ fontSize: 'clamp(4rem,8vw,6rem)', color: 'rgba(255,255,255,0.10)', lineHeight: 1 }}
                      aria-hidden="true"
                    >
                      {step.n}
                    </span>
                    <div className="relative pt-8">
                      <h3 className="mb-2 text-[15px] font-bold leading-snug" style={{ color: '#ffffff' }}>{step.title}</h3>
                      <p className="mb-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{step.body}</p>
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
      <section id="features" className="scroll-mt-24 py-20" style={{ background: 'var(--ledge-bg)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="mb-12">
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}
            >
              Quietly clever,<br className="hidden sm:block" /> where it counts.
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
                  <h3 className="mb-2 text-[1.15rem] font-bold leading-snug" style={{ color: 'var(--ledge-data)' }}>
                    Understands how<br />you actually type.
                  </h3>
                  <p className="mb-6 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--ledge-data-var)' }}>
                    &quot;mcdo 200 lunch with kids&quot; or &quot;bayad kuryente 1740&quot; — Filipino, English, or Taglish. It reads what you meant, not just what you spelled. And when it&apos;s not sure, correcting it takes a second.
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
                    <h3 className="mb-1.5 text-[15px] font-bold" style={{ color: 'var(--ledge-data)' }}>Learns as you go</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
                      Correct a category once and it remembers. Your regular places are recognised the moment you type them.
                    </p>
                  </div>
                  {/* Mini history visual */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    {FEED_MINI.slice(0, 3).map((row) => (
                      <div key={row.merchant} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'var(--ledge-bg)' }}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: row.catColor }} />
                          <span className="text-[12px] font-medium" style={{ color: 'var(--ledge-data-var)' }}>{row.merchant}</span>
                        </div>
                        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: row.amount.startsWith('+') ? 'var(--ledge-gain)' : 'var(--ledge-danger)' }}>{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div
                  className="flex flex-col gap-4 rounded-3xl p-6"
                  style={{ background: 'var(--ledge-accent)' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                  >
                    <Users size={20} weight="fill" color="rgba(255,255,255,0.85)" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[15px] font-bold" style={{ color: '#ffffff' }}>Yours alone, or shared</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      Keep it personal, or invite a partner or family to log into the same ledger. Your budget scales to whoever&apos;s in it.
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
                    <span className="ml-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>Invite anyone, anytime</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOUSEHOLD FEED ───────────────────────────────────────────────────── */}
      <section id="households" className="scroll-mt-24 py-20" style={{ background: '#ffffff' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">

            <Reveal className="lg:flex-1 lg:max-w-md lg:pt-4">
              <h2
                className="mb-4 text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
                style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}
              >
                One ledger. Just you, or everyone.
              </h2>
              <p className="mb-6 text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
                Track your own spending in seconds. When you want, invite a partner or family — everyone logs into the same ledger, no spreadsheet and no screenshots in the group chat.
              </p>
              <Link
                href="/login"
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold ${FOCUS_RING}`}
                style={{ background: PRIMARY_GRADIENT, color: '#ffffff' }}
              >
                Start free
                <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </Reveal>

            <Reveal className="lg:flex-1" delay={0.08}>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--ledge-bg)', boxShadow: '0 4px 24px rgba(0,53,46,0.08)' }}
              >
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--ledge-surface)' }}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--ledge-data-var)' }}>
                    Shared Ledger
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--ledge-surface)', color: 'var(--ledge-data-var)' }}>
                    This month
                  </span>
                </div>

                {FEED_ITEMS.map((item, i) => (
                  <div
                    key={item.merchant + i}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ borderBottom: i < FEED_ITEMS.length - 1 ? '1px solid var(--ledge-surface)' : undefined }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: item.catBg }}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ background: item.catColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ledge-data)' }}>{item.merchant}</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--ledge-data-var)' }}>
                        {item.category}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'rgba(0,53,46,0.07)', color: 'var(--ledge-data-var)' }}
                        >
                          {item.who}
                        </span>
                      </p>
                    </div>
                    <span
                      className="shrink-0 font-mono text-[13px] font-bold tabular-nums"
                      style={{ color: item.amount.startsWith('+') ? 'var(--ledge-gain)' : 'var(--ledge-danger)' }}
                    >
                      {item.amount}
                    </span>
                  </div>
                ))}

                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderTop: '1px solid var(--ledge-surface)', background: '#fcfefe' }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--ledge-data-var)' }}>Net this month</span>
                  <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: 'var(--ledge-gain)' }}>+₱36,946</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── VALUE / OUTCOMES ─────────────────────────────────────────────────── */}
      <section id="value" className="scroll-mt-24 py-24" style={{ background: 'var(--ledge-bg)' }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Reveal className="mb-14 max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--ledge-muted)' }}>
              Why it&apos;s worth it
            </p>
            <h2
              className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight"
              style={{ color: 'var(--ledge-accent)', textWrap: 'balance' } as React.CSSProperties}
            >
              Logging is just step one. Understanding your money is the point.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>
              When logging is this easy, you actually do it — and once everything&apos;s in one place, LedgeIt turns those few seconds a day into a clear picture of where your money goes.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MagnifyingGlass,
                title: 'See where it really goes',
                body: 'Spending sorts itself by category as you log. The leaks you never noticed — deliveries, subscriptions, the daily coffee — finally add up in plain sight.',
              },
              {
                icon: Wallet,
                title: "Always know what's left",
                body: 'A running view of money in versus money out, so you know what you can actually spend before payday — no mental math, no surprises.',
              },
              {
                icon: Target,
                title: 'Save with intention',
                body: 'Set aside for a goal and watch it fill. When you can see the trade-offs, cutting back on the small stuff stops feeling like a sacrifice.',
              },
              {
                icon: TrendUp,
                title: 'Build the habit that sticks',
                body: 'Five seconds a day compounds. A month in, you have a real record — and the quiet confidence that comes from finally being on top of your money.',
              },
            ].map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <div className="flex h-full flex-col gap-4 rounded-3xl p-6" style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.05)' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,53,46,0.07)' }}>
                    <v.icon size={20} weight="fill" color="#1f695d" aria-hidden="true" />
                  </div>
                  <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--ledge-data)' }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ledge-data-var)' }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-32 lg:px-8"
        style={{ background: '#ffffff' }}
      >
        {/* Tonal block behind the text */}
        <div
          className="pointer-events-none absolute inset-x-6 inset-y-8 rounded-3xl lg:inset-x-8"
          style={{ background: 'linear-gradient(150deg, #00352e 0%, #0d4d43 50%, #1f7a6b 100%)' }}
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.62)' }}>
            Got expenses? LedgeIt.
          </p>
          <h2
            className="text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[1.06] tracking-tight"
            style={{ color: '#ffffff', textWrap: 'balance' } as React.CSSProperties}
          >
            Your first expense is five seconds away.
          </h2>
          <p className="max-w-sm text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            No credit card, nothing to set up. Open it, type your first transaction the way you&apos;d say it, and watch it land.
          </p>
          <Link
            href="/login"
            className={`inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold transition-transform active:scale-[0.97] ${FOCUS_RING}`}
            style={{ background: '#ffffff', color: 'var(--ledge-accent)' }}
          >
            Try it free — it&apos;s instant
            <ArrowRight size={15} weight="bold" aria-hidden="true" />
          </Link>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Sign in
            </Link>
          </p>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <SiteFooter />

      {/* Backstop for any CSS-driven animation; JS motion is handled via useReducedMotion. */}
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
