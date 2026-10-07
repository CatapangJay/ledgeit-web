'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  motion, AnimatePresence, useReducedMotion,
  useMotionValue, useTransform, animate,
  type Variants,
} from 'framer-motion'
import {
  X, Confetti, TrendUp, TrendDown, Trophy,
  CalendarCheck, Target, ArrowUpRight, Sparkle,
  ArrowBendDownRight, Check, Wallet as WalletIcon, ArrowCounterClockwise, CaretDown,
  ArrowLeft, ArrowRight,
} from '@phosphor-icons/react'
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import type { MonthlyRecap, RecapCategoryStat, RecapCarryoverCandidate } from '@/lib/monthlyRecap'

// ─── Palette ─────────────────────────────────────────────────────────────────
// A dark, green-undertoned canvas holds a bento of predominantly warm, light
// tiles — the "editorial" rhythm the brief asks for: giant bold numbers sitting
// on cream/white cards, punctuated by a few deep-forest tiles and one mint pop.
// Numbers are the hero of every tile; labels shrink to quiet uppercase chips.
const C = {
  canvas:     '#eef2ef', // cool, softly green-grey panel background (less "warm cream")
  forest:     '#04231d', // deep forest ink (CTA text on white)
  darkTile:   '#0f1c18', // deep forest-charcoal (charts) — the dark "pop" tiles
  darkRaised: '#1c2b26',
  ink:        '#f1f6f3', // light text on dark tiles
  inkDim:     'rgba(255,255,255,0.64)',
  inkFaint:   'rgba(255,255,255,0.46)',
  gainDark:   '#4ade9e', // vivid emerald pop on dark tiles
  dangerDark: '#ff9a86',

  // Light-tile tokens — cooler, cleaner (not warm-cream)
  cream:      '#ffffff', // clean white card
  creamRaise: '#e7efe9', // soft sage card for rhythm
  mintTint:   '#d6f0e2', // crisp mint accent card (the one saturated pop)
  numberInk:  '#0c1a15', // near-black bold display numbers
  labelInk:   '#5f7d74', // quiet uppercase label on light
  bodyInk:    '#37453f',
  gainInk:    '#0e7a5a', // richer emerald for accents on light
  dangerInk:  '#c2410c', // warm terracotta for the spend/over tones
}

// Category id → chart hex. Mirrors the Tailwind text-color each category carries
// in the registry, resolved to a concrete value the donut/legend can paint.
const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#c2410c', groceries: '#4d7c0f', transport: '#0369a1',
  shopping: '#7c3aed', utilities: '#b45309', entertainment: '#be185d',
  health: '#be123c', savings: '#0f766e', investments: '#4338ca',
  education: '#1d4ed8', personal_care: '#a21caf', church: '#92400e',
  gifts: '#b91c1c', family: '#0e7490', kids: '#db2777', subscriptions: '#334155',
  debts: '#b45309', transfers: '#475569', other: '#64748b',
}
function catHex(id: string): string {
  return CATEGORY_HEX[id] ?? '#5fd6bd'
}

// The recap paints a warm, congratulatory tone. Copy adapts to how the month
// actually went — a saver gets celebration, an overspender gets an honest but
// kind nudge — so the modal never feels tone-deaf to the data behind it.
function headline(recap: MonthlyRecap): { title: string; sub: string } {
  if (recap.totalIncome === 0 && recap.totalSpent === 0) {
    return { title: `${recap.label} is a wrap`, sub: 'A quiet month — here to help you start the new one strong.' }
  }
  if (recap.savingsRate >= 0.2) {
    return { title: 'What a month!', sub: `You kept ${formatPercent(recap.savingsRate, 0)} of what you earned. That's a real win.` }
  }
  if (recap.netSaved > 0) {
    return { title: 'Nicely done!', sub: `You ended ${recap.label} in the green. Every peso saved counts.` }
  }
  if (recap.netSaved === 0) {
    return { title: `${recap.label}, wrapped`, sub: 'You broke even this month — a clean slate for the one ahead.' }
  }
  return { title: `${recap.label}, wrapped`, sub: 'You spent a little more than you earned. A fresh month is a fresh start.' }
}

// The month right after the one being recapped, e.g. '2026-08' → 'September'.
// Used to make the closing encouragement concrete instead of a generic "next month".
function nextMonthName(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' })
}

// A forward-looking nudge that appends to the headline sub — the recap doesn't
// just report the past, it roots for what's next, tuned to the same performance
// tiers as `headline`.
function nextMonthNudge(recap: MonthlyRecap): string {
  const next = nextMonthName(recap.monthKey)
  if (recap.totalIncome === 0 && recap.totalSpent === 0) return `Ready when you are — let's make ${next} count.`
  if (recap.savingsRate >= 0.2) return `Keep this pace and ${next} could be your best month yet.`
  if (recap.netSaved > 0) return `Aim a little higher in ${next} — you clearly know how.`
  if (recap.netSaved === 0) return `${next} is a clean slate — let's build a real buffer this time.`
  return `${next} is a fresh start. Small tweaks now can flip the script.`
}

// ─── Motion config ────────────────────────────────────────────────────────────
// Tiles land one after another as a staggered cascade — the difference between
// "a report appeared" and "a moment". delayChildren waits for the panel spring
// to settle so the bento fills in after the frame arrives, not during.
const bento: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } },
}
const tile: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

// Horizontal slide between the recap overview (step 1) and the carry-over page
// (step 2). `dir` is +1 going forward, −1 going back, so the pages slide the way
// the navigation implies.
const stepSlide: Variants = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.16 } }),
}

// ─── Count-up number ──────────────────────────────────────────────────────────
// Animates a value 0 → target from a MotionValue (no setState, so it can't trip
// the "no setState in effect" rule and stays off the React render path).
function CountUp({ value, delay = 0, animateIt, format = formatCurrency }: {
  value: number; delay?: number; animateIt: boolean; format?: (n: number) => string
}) {
  const mv = useMotionValue(animateIt ? 0 : value)
  const text = useTransform(mv, (v) => format(Math.round(v)))
  useEffect(() => {
    if (!animateIt) { mv.set(value); return }
    const controls = animate(mv, value, { duration: 1.0, delay, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, delay, animateIt, mv, format])
  return <motion.span>{text}</motion.span>
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
// A one-shot spray of paper from the hero. Pure framer-motion, deterministic
// (seeded → pure render) so it reads organic without Math.random in render.
const CONFETTI_COLORS = ['#f5b74e', '#5fd6bd', '#ff8a5c', '#8ad4ff', '#ffffff', '#c9f56b']
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
function ConfettiBurst({ fire }: { fire: boolean }) {
  const pieces = useMemo(
    () => Array.from({ length: 26 }, (_, i) => {
      const angle = Math.PI * (0.1 + rand(i * 4 + 1) * 0.8)
      const dir = i % 2 === 0 ? 1 : -1
      const distance = 110 + rand(i * 4 + 2) * 200
      return {
        id: i,
        x: dir * Math.cos(angle) * distance,
        y: 24 + Math.sin(angle) * distance,
        rotate: rand(i * 4 + 3) * 720 - 360,
        scale: 0.6 + rand(i * 4 + 4) * 0.8,
        delay: rand(i * 7 + 5) * 0.2,
        duration: 1.2 + rand(i * 7 + 6) * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      }
    }), []
  )
  if (!fire) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-14 z-10 overflow-visible" aria-hidden="true">
      <div className="relative h-0 w-0">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute"
            style={{ width: p.round ? 7 : 6, height: p.round ? 7 : 10, borderRadius: p.round ? '50%' : 1, background: p.color }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0 }}
            animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], rotate: p.rotate, scale: p.scale }}
            transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.6, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Floating decorative orbs ──────────────────────────────────────────────────
// Soft out-of-focus glints that drift behind the tiles — the "floating elements"
// the brief asks for. Purely ambient; hidden under reduced-motion.
function FloatingOrbs({ show }: { show: boolean }) {
  const orbs = [
    { size: 90,  x: '6%',  y: '18%', color: 'rgba(95,214,181,0.16)', dur: 9,  dx: 14, dy: -10 },
    { size: 56,  x: '88%', y: '30%', color: 'rgba(245,183,78,0.14)', dur: 11, dx: -12, dy: 12 },
    { size: 120, x: '80%', y: '78%', color: 'rgba(31,105,93,0.20)',  dur: 13, dx: -16, dy: -14 },
    { size: 44,  x: '14%', y: '82%', color: 'rgba(138,212,255,0.12)', dur: 10, dx: 12, dy: 10 },
  ]
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: o.size, height: o.size, left: o.x, top: o.y, background: o.color, filter: 'blur(18px)' }}
          animate={{ x: [0, o.dx, 0], y: [0, o.dy, 0] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Donut chart — category breakdown ───────────────────────────────────────────
// A multi-segment ring painted from the ranked category breakdown. Center holds
// the total spent; a compact legend lists the top slices.
function SpendDonut({ data, total, animateIt }: {
  data: RecapCategoryStat[]; total: number; animateIt: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const size = 132, stroke = 14, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const top = data.slice(0, 5)
  const shownTotal = top.reduce((s, d) => s + d.spent, 0)
  const rest = Math.max(0, total - shownTotal)
  const segments = rest > 0 ? [...top, { category: { id: 'other', label: 'Other', icon: 'DotsThree', color: '', bgColor: '', keywords: [] }, spent: rest }] : top

  // Running offset accumulated functionally (reduce) — the lint rule forbids
  // reassigning a closure variable inside .map after render.
  const arcs = segments.reduce<{ seg: RecapCategoryStat; dash: number; gap: number; rot: number }[]>((acc, seg) => {
    const frac = total > 0 ? seg.spent / total : 0
    const dash = circ * frac
    const priorDash = acc.reduce((s, a) => s + a.dash, 0)
    acc.push({ seg, dash, gap: circ - dash, rot: (priorDash / circ) * 360 })
    return acc
  }, [])

  const toggle = (id: string) => setSelected((cur) => (cur === id ? null : id))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5">
        <Target size={13} weight="bold" color={C.gainDark} aria-hidden={true} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.inkDim }}>Where it went</span>
      </div>
      <div className="mt-3 flex flex-1 items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            {arcs.map((a, i) => {
              const isSelected = selected === a.seg.category.id
              const dimmed = selected !== null && !isSelected
              return (
                <motion.circle
                  key={i}
                  onClick={() => toggle(a.seg.category.id)}
                  cx={size / 2} cy={size / 2} r={r} fill="none"
                  stroke={catHex(a.seg.category.id)} strokeWidth={stroke}
                  strokeDasharray={`${a.dash} ${a.gap}`}
                  transform={`rotate(${a.rot} ${size / 2} ${size / 2})`}
                  className="cursor-pointer"
                  initial={animateIt ? { strokeDasharray: `0 ${circ}`, opacity: 1 } : false}
                  animate={{ strokeDasharray: `${a.dash} ${a.gap}`, opacity: dimmed ? 0.35 : 1 }}
                  whileHover={{ strokeWidth: stroke + 5 }}
                  transition={animateIt ? { duration: 0.8, delay: 0.5 + i * 0.08, ease: [0.16, 1, 0.3, 1], opacity: { duration: 0.2 } } : { strokeWidth: { duration: 0.18 }, opacity: { duration: 0.2 } }}
                />
              )
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {(() => {
              const sel = selected ? segments.find((s) => s.category.id === selected) ?? null : null
              if (sel) {
                const pct = total > 0 ? Math.round((sel.spent / total) * 100) : 0
                return (
                  <>
                    <span className="max-w-full truncate text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: catHex(sel.category.id) }}>{sel.category.label}</span>
                    <span className="font-mono text-base font-bold tabular-nums" style={{ color: C.ink }}>{formatCurrencyCompact(sel.spent)}</span>
                    <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: C.inkDim }}>{pct}% of spend</span>
                  </>
                )
              }
              return (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: C.inkFaint }}>Spent</span>
                  <span className="font-mono text-base font-bold tabular-nums" style={{ color: C.ink }}>
                    <CountUp value={total} animateIt={animateIt} delay={0.5} format={formatCurrencyCompact} />
                  </span>
                </>
              )
            })()}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {segments.slice(0, 5).map((seg) => {
            const isSelected = selected === seg.category.id
            return (
              <motion.button
                key={seg.category.id}
                type="button"
                onClick={() => toggle(seg.category.id)}
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="-mx-1.5 flex w-[calc(100%+0.75rem)] cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors"
                style={{ background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform"
                  style={{ background: catHex(seg.category.id), transform: isSelected ? 'scale(1.3)' : 'scale(1)' }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-[11px] transition-[font-weight,color]"
                  style={{ color: isSelected ? C.ink : C.inkDim, fontWeight: isSelected ? 700 : 500 }}
                >
                  {seg.category.label}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: C.ink }}>{formatCurrencyCompact(seg.spent)}</span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Weekly spend bar chart ─────────────────────────────────────────────────────
// A compact 5-bar series (weeks of the month) that grows on mount. Bar heights
// are computed in pixels against a fixed track so they render reliably in any
// flex context (percentage heights need a definite parent height, which a
// centered flex tile doesn't guarantee).
const BAR_TRACK = 64 // px — the tallest a bar can reach
function WeeklyBars({ data, animateIt }: { data: number[]; animateIt: boolean }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center gap-1.5">
        <TrendUp size={13} weight="bold" color={C.gainDark} aria-hidden={true} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.inkDim }}>Weekly pace</span>
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        {data.map((v, i) => {
          const px = Math.max(4, Math.round((v / max) * BAR_TRACK))
          return (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex w-full items-end justify-center" style={{ height: BAR_TRACK }}>
                <span
                  className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[9px] font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: 'rgba(255,255,255,0.12)', color: C.ink }}
                >
                  {formatCurrencyCompact(v)}
                </span>
                <motion.div
                  className="w-full rounded-md"
                  style={{ background: v === max ? C.gainDark : 'rgba(95,214,181,0.32)', transformOrigin: 'bottom' }}
                  initial={animateIt ? { height: 0 } : { height: px }}
                  animate={{ height: px }}
                  whileHover={{ scaleY: 1.06, backgroundColor: C.gainDark, transition: { duration: 0.15 } }}
                  transition={animateIt ? { type: 'spring', stiffness: 120, damping: 18, delay: 0.55 + i * 0.07 } : undefined}
                />
              </div>
              <span className="text-[9px] font-semibold" style={{ color: C.inkFaint }}>W{i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Spending rhythm — average spend by weekday ─────────────────────────────────
// Seven horizontal bars (Sun→Sat) showing the average you spend on each weekday,
// so a user sees their pattern at a glance ("weekends run hot"). A fixed count of
// bars in a flex column, so the tile can never overflow. Derived entirely from
// `dailySpend`: each weekday's average is its total spend ÷ its occurrences in the
// month, so a month with five Saturdays isn't unfairly inflated.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function WeekdayRhythm({ dailySpend, animateIt }: {
  dailySpend: Record<string, number>
  animateIt: boolean
}) {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const [date, spent] of Object.entries(dailySpend)) {
    const [y, m, d] = date.split('-').map(Number)
    const wd = new Date(y, m - 1, d).getDay()
    totals[wd] += spent
    counts[wd] += 1
  }
  const avgs = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0))
  const max = Math.max(...avgs, 1)
  const peakIdx = avgs.indexOf(Math.max(...avgs))
  const peakLabel = avgs[peakIdx] > 0 ? WEEKDAYS[peakIdx] : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TileLabel icon={CalendarCheck} text="Spending rhythm" accent="#0f766e" />

      <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center gap-[7px]">
        {avgs.map((avg, i) => {
          const pct = Math.max(3, (avg / max) * 100)
          const isPeak = i === peakIdx && avg > 0
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-[9px] font-bold uppercase tracking-wide" style={{ color: isPeak ? C.gainInk : C.labelInk }}>
                {WEEKDAYS[i].slice(0, 2)}
              </span>
              <div className="relative h-3.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(0,53,46,0.06)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: isPeak ? '#0f766e' : 'rgba(15,118,110,0.42)' }}
                  initial={animateIt ? { width: 0 } : { width: `${pct}%` }}
                  animate={{ width: `${pct}%` }}
                  transition={animateIt
                    ? { type: 'spring', stiffness: 120, damping: 20, delay: 0.5 + i * 0.06 }
                    : undefined}
                />
              </div>
              <span className="w-11 shrink-0 text-right font-mono text-[10px] font-bold tabular-nums" style={{ color: isPeak ? C.numberInk : C.labelInk }}>
                {avg > 0 ? formatCurrencyCompact(avg) : '\u2014'}
              </span>
            </div>
          )
        })}
      </div>

      {peakLabel && (
        <p className="mt-3 text-[10px] font-medium" style={{ color: C.labelInk }}>
          <span className="font-bold" style={{ color: C.gainInk }}>{peakLabel}s</span> are your heaviest spend days
        </p>
      )}
    </div>
  )
}

// ─── Bento tile shell ─────────────────────────────────────────────────────────
// Four tones drive the bento rhythm: warm `cream`/`white` light cards carry the
// big numbers, `mint` is the single saturated accent pop, and `dark` (sage) hosts
// the charts. Each tone tunes its own fill, border and shadow so depth reads on
// both the dark canvas and against neighbouring tiles.
type Tone = 'light' | 'white' | 'mint' | 'dark'
function Tile({ className = '', tone = 'light', children }: {
  className?: string; tone?: Tone; children: React.ReactNode
}) {
  const style: Record<Tone, React.CSSProperties> = {
    light: { background: C.cream, boxShadow: '0 2px 16px rgba(0,40,32,0.10)', border: '1px solid rgba(0,53,46,0.05)' },
    white: { background: '#ffffff', boxShadow: '0 2px 16px rgba(0,40,32,0.08)', border: '1px solid rgba(0,53,46,0.04)' },
    mint:  { background: C.mintTint, boxShadow: '0 2px 18px rgba(31,105,93,0.16)', border: '1px solid rgba(31,105,93,0.10)' },
    dark:  { background: C.darkTile, boxShadow: '0 6px 22px rgba(0,40,32,0.18)', border: '1px solid rgba(255,255,255,0.06)' },
  }
  return (
    <motion.div
      variants={tile}
      className={`relative flex flex-col justify-center gap-2 rounded-3xl p-4 ${className}`}
      style={style[tone]}
    >
      {children}
    </motion.div>
  )
}

function TileLabel({ icon: Icon, text, accent = C.gainInk, tone = 'light' }: {
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'bold' | 'regular'; color?: string; 'aria-hidden'?: boolean }>
  text: string; accent?: string; tone?: 'light' | 'dark'
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} weight="bold" color={accent} aria-hidden={true} />
      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: tone === 'dark' ? C.inkDim : C.labelInk }}>{text}</span>
    </div>
  )
}

// ─── Big display stat ───────────────────────────────────────────────────────
// The CUBO signature: a quiet label up top, an oversized bold number owning the
// tile, and an optional context line beneath. Reused across the light stat tiles
// so the type scale stays consistent.
function BigStat({ value, tone, animateIt, delay = 0, color, sub, format = formatCurrency }: {
  value: number; tone: 'light' | 'dark'; animateIt: boolean; delay?: number
  color?: string; sub?: React.ReactNode; format?: (n: number) => string
}) {
  return (
    <div className="mt-auto min-w-0">
      <p className="whitespace-nowrap font-mono text-[1.7rem] font-bold leading-[0.95] tracking-tight tabular-nums sm:text-[1.9rem]" style={{ color: color ?? (tone === 'dark' ? C.ink : C.numberInk) }}>
        <CountUp value={value} animateIt={animateIt} delay={delay} format={format} />
      </p>
      {sub && <p className="mt-1.5 truncate text-[11px] font-medium" style={{ color: tone === 'dark' ? C.inkFaint : C.labelInk }}>{sub}</p>}
    </div>
  )
}

// ─── Finance guidance — the 50/30/20 savings check (2/3 width) ──────────────────
// Grounds the month against the most universally-understood budgeting rule
// (50% needs / 30% wants / 20% savings — Warren, cited by CFPB & Bank of America).
// A progress bar puts the user's actual savings rate against the 20% target, so
// the abstract "rule" becomes a concrete "you're here vs. the goal" read.
// function FinanceGuidance({ recap, animateIt }: { recap: MonthlyRecap; animateIt: boolean }) {
//   const TARGET = 0.20
//   const rate = Math.max(0, recap.savingsRate)
//   const pctOfTarget = Math.min(100, (rate / TARGET) * 100)
//   const hitTarget = rate >= TARGET
//   // What 20% of this month's income would have been — the concrete goal number.
//   const targetAmount = recap.totalIncome * TARGET
//   const gap = Math.max(0, targetAmount - Math.max(0, recap.netSaved))

//   return (
//     <Tile tone="white" className="lg:col-span-2 !justify-start !gap-3">
//       <div className="flex items-center justify-between gap-2">
//         <TileLabel icon={PiggyBank} text="The 50 / 30 / 20 rule" accent={C.gainInk} />
//         <span className="text-[10px] font-semibold" style={{ color: C.labelInk }}>a simple way to budget</span>
//       </div>

//       <p className="text-[12.5px] leading-relaxed" style={{ color: C.bodyInk }}>
//         A common guide: aim to spend <b style={{ color: C.numberInk }}>50%</b> of income on needs,
//         <b style={{ color: C.numberInk }}> 30%</b> on wants, and keep <b style={{ color: C.gainInk }}>20%</b> for savings.
//       </p>

//       {/* User's savings rate vs. the 20% target */}
//       <div className="mt-0.5">
//         <div className="mb-1.5 flex items-baseline justify-between">
//           <span className="text-[11px] font-semibold" style={{ color: C.labelInk }}>Your savings this month</span>
//           <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: hitTarget ? C.gainInk : C.numberInk }}>
//             {recap.totalIncome > 0 ? formatPercent(rate, 0) : '—'} <span style={{ color: C.labelInk }}>/ 20% goal</span>
//           </span>
//         </div>
//         <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(0,53,46,0.08)' }}>
//           <motion.div
//             className="absolute inset-y-0 left-0 rounded-full"
//             style={{ background: hitTarget ? C.gainInk : C.dangerInk }}
//             initial={animateIt ? { width: 0 } : { width: `${pctOfTarget}%` }}
//             animate={{ width: `${pctOfTarget}%` }}
//             transition={animateIt ? { type: 'spring', stiffness: 120, damping: 22, delay: 0.5 } : undefined}
//           />
//         </div>
//         <p className="mt-2 text-[11.5px] leading-snug" style={{ color: C.bodyInk }}>
//           {recap.totalIncome === 0
//             ? <>Log your income to see how your saving compares to the 20% goal.</>
//             : hitTarget
//               ? <>You hit the 20% savings goal — you&apos;re budgeting like a pro. 🌱</>
//               : <>You&apos;re <b style={{ color: C.dangerInk }}>{formatCurrencyCompact(gap)}</b> short of the 20% goal. Setting that aside first next month gets you there.</>}
//         </p>
//       </div>
//     </Tile>
//   )
// }

// ─── Carryover section — roll leftovers / overages into next month ──────────────
// The month that just ended left each budgeted category either UNDER its limit
// (a leftover) or OVER it (an overage). Here the user decides, per category,
// whether to carry that balance into the coming month: a leftover can top up
// next month's budget for the category OR be stashed in a wallet; an overage can
// only pull next month's budget for that category down (envelope-style). Each
// choice logs a `transfer` — tracked in history, excluded from next month's
// spend/income totals. The whole section self-hides when the month had no
// budget or every category landed exactly on target.

function carryoverRowLabel(nextMonth: string, delta: number): string {
  return delta > 0 ? `Top up ${nextMonth}` : `Reduce ${nextMonth}`
}

function CarryoverRow({
  candidate, nextMonth, applied, wallets, onApply, onUndo,
}: {
  candidate: RecapCarryoverCandidate
  nextMonth: string
  applied: { destination: 'category' | 'wallet'; walletId?: string; amount: number } | null
  wallets: { id: string; name: string }[]
  onApply: (dest: 'category' | 'wallet', walletId?: string) => Promise<void>
  onUndo: () => Promise<void>
}) {
  const Icon = getIconComponent(candidate.category.icon)
  const hex = catHex(candidate.category.id)
  const isLeftover = candidate.delta > 0
  const magnitude = Math.abs(candidate.delta)

  // Destination for an un-applied carryover: either next month's category budget
  // or one of the user's wallets. A leftover DEPOSITS into the wallet; an overage
  // WITHDRAWS from it to cover the overspend — both are valid, so the toggle shows
  // whenever a wallet exists.
  const canChooseWallet = wallets.length > 0
  const [destMode, setDestMode] = useState<'category' | 'wallet'>('category')
  const [walletChoice, setWalletChoice] = useState<string>(wallets[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const appliedDestLabel = applied
    ? applied.destination === 'wallet'
      ? wallets.find((w) => w.id === applied.walletId)?.name ?? 'a wallet'
      : `${nextMonth} budget`
    : null

  // Card tints to the category's own colour so each card is instantly scannable
  // by its category — a faint wash of the icon hue, with a slightly stronger
  // hairline border in the same colour.
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl p-2.5" style={{ background: `${hex}14`, border: `1px solid ${hex}2e` }}>
      {/* Header — icon, name, and the signed leftover/overage amount. */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${hex}26` }}>
          <Icon size={14} weight="fill" color={hex} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold leading-tight" style={{ color: C.numberInk }}>{candidate.category.label}</p>
          <p className="truncate text-[10px] font-medium" style={{ color: C.labelInk }}>
            {isLeftover ? 'Under' : 'Over'} · {formatCurrencyCompact(candidate.spent)}/{formatCurrencyCompact(candidate.limit)}
          </p>
        </div>
        <span
          className="shrink-0 font-mono text-[13px] font-bold tabular-nums"
          style={{ color: isLeftover ? C.gainInk : C.dangerInk }}
        >
          {isLeftover ? '+' : '−'}{formatCurrencyCompact(magnitude)}
        </span>
      </div>

      {applied ? (
        <div className="mt-auto flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.72)' }}>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.gainInk }}>
            <Check size={12} weight="bold" aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {applied.amount > 0 ? '→ ' : '← '}{appliedDestLabel}
            </span>
          </span>
          <button
            type="button"
            onClick={() => run(onUndo)}
            disabled={busy}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(0,53,46,0.06)', color: C.bodyInk }}
          >
            <ArrowCounterClockwise size={10} weight="bold" aria-hidden="true" />
            Undo
          </button>
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-1.5">
          {/* Destination toggle — budget vs. a wallet. A leftover deposits into the
              wallet; an overage withdraws from it. */}
          {canChooseWallet && (
            <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,53,46,0.08)' }}>
              {([
                { mode: 'category' as const, icon: ArrowBendDownRight, label: 'Budget' },
                { mode: 'wallet' as const, icon: WalletIcon, label: 'Account' },
              ]).map(({ mode, icon: TabIcon, label }) => {
                const active = destMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDestMode(mode)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[11px] font-bold transition-colors"
                    style={active
                      ? { background: '#ffffff', color: C.forest, boxShadow: '0 1px 3px rgba(0,40,32,0.1)' }
                      : { background: 'transparent', color: C.labelInk }}
                  >
                    <TabIcon size={12} weight="bold" aria-hidden="true" />
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {/* Target label (budget) or custom wallet picker (account). */}
            {destMode === 'wallet' && canChooseWallet ? (
              <WalletPicker
                wallets={wallets}
                value={walletChoice}
                onChange={setWalletChoice}
                categoryLabel={candidate.category.label}
              />
            ) : (
              <span className="min-w-0 flex-1 truncate rounded-lg py-1.5 pl-2.5 pr-2.5 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.6)', color: C.bodyInk, border: '1px solid rgba(0,53,46,0.08)' }}>
                {carryoverRowLabel(nextMonth, candidate.delta)}
              </span>
            )}
            <button
              type="button"
              onClick={() => run(() => (destMode === 'wallet' && canChooseWallet
                ? onApply('wallet', walletChoice)
                : onApply('category')))}
              disabled={busy || (destMode === 'wallet' && !walletChoice)}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1f695d, #00352e)' }}
            >
              {destMode === 'wallet' && canChooseWallet
                ? <WalletIcon size={12} weight="bold" aria-hidden="true" />
                : <ArrowBendDownRight size={12} weight="bold" aria-hidden="true" />}
              {busy ? '…' : 'Carry'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Wallet picker — a styled popover replacing the native <select> ─────────────
// A compact button that opens a floating list of the user's wallets. Replaces the
// OS-chrome dropdown with one that matches the recap's editorial surface. Closes
// on outside-click or Escape; selection collapses it immediately.
function WalletPicker({ wallets, value, onChange, categoryLabel }: {
  wallets: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  categoryLabel: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = wallets.find((w) => w.id === value) ?? wallets[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Which account to carry ${categoryLabel} into`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pl-2.5 pr-2 text-[11px] font-semibold outline-none transition-colors"
        style={{ background: 'rgba(255,255,255,0.6)', color: C.bodyInk, border: '1px solid rgba(0,53,46,0.08)' }}
      >
        <WalletIcon size={12} weight="bold" aria-hidden="true" className="shrink-0" style={{ color: C.gainInk }} />
        <span className="min-w-0 flex-1 truncate text-left">{selected?.name ?? 'Select'}</span>
        <CaretDown
          size={10} weight="bold" aria-hidden="true"
          className="shrink-0 transition-transform"
          style={{ color: C.labelInk, transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-0 z-30 mb-1 max-h-40 w-full overflow-y-auto rounded-xl p-1"
            style={{ background: '#ffffff', boxShadow: '0 8px 28px rgba(0,32,26,0.2)', border: '1px solid rgba(0,53,46,0.08)' }}
          >
            {wallets.map((w) => {
              const active = w.id === value
              return (
                <li key={w.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => { onChange(w.id); setOpen(false) }}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors hover:bg-[rgba(0,53,46,0.05)]"
                    style={{ color: active ? C.gainInk : C.bodyInk, background: active ? 'rgba(14,122,90,0.1)' : 'transparent' }}
                  >
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                    {active && <Check size={12} weight="bold" aria-hidden="true" className="shrink-0" />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Carryover summary — step-1 teaser that routes to the carry-over page ───────
// A compact card on the recap overview. It counts how many budgeted categories
// came in under vs. over this month and sums the leftover/overage, then invites
// the user to the dedicated carry-over step rather than inlining the controls.
function CarryoverSummary({ recap, onOpen }: { recap: MonthlyRecap; onOpen: () => void }) {
  const carryovers = useStore((s) => s.budgetCarryovers)
  const nextMonth = nextMonthName(recap.monthKey)

  const { underCount, overCount, leftoverTotal, overageTotal, carriedCount } = useMemo(() => {
    let underCount = 0, overCount = 0, leftoverTotal = 0, overageTotal = 0
    for (const c of recap.carryoverCandidates) {
      if (c.delta > 0) { underCount++; leftoverTotal += c.delta }
      else { overCount++; overageTotal += Math.abs(c.delta) }
    }
    const carriedCount = carryovers.filter((c) => c.fromMonth === recap.monthKey).length
    return { underCount, overCount, leftoverTotal, overageTotal, carriedCount }
  }, [recap.carryoverCandidates, carryovers, recap.monthKey])

  const total = recap.carryoverCandidates.length
  const allHandled = carriedCount >= total

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full items-center gap-3 rounded-3xl p-4 text-left transition-shadow hover:shadow-md"
      style={{ background: C.cream, boxShadow: '0 2px 16px rgba(0,40,32,0.08)', border: '1px solid rgba(0,53,46,0.05)' }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(14,122,90,0.14)' }}>
        <ArrowBendDownRight size={18} weight="bold" color={C.gainInk} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.labelInk }}>
          Carry over to {nextMonth}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {underCount > 0 && (
            <span className="text-[12.5px] font-semibold" style={{ color: C.gainInk }}>
              {underCount} under budget · +{formatCurrencyCompact(leftoverTotal)}
            </span>
          )}
          {overCount > 0 && (
            <span className="text-[12.5px] font-semibold" style={{ color: C.dangerInk }}>
              {overCount} over budget · −{formatCurrencyCompact(overageTotal)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] font-medium" style={{ color: C.labelInk }}>
          {allHandled
            ? `All ${total} handled — tap to review`
            : carriedCount > 0
              ? `${carriedCount} of ${total} carried — tap to finish`
              : `Decide what rolls into ${nextMonth}`}
        </p>
      </div>

      <span
        className="flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-bold text-white transition-transform group-hover:translate-x-0.5"
        style={{ background: 'linear-gradient(135deg, #1f695d, #00352e)' }}
      >
        {allHandled ? 'Review' : 'Carry over'}
        <ArrowRight size={13} weight="bold" aria-hidden="true" />
      </span>
    </button>
  )
}

function CarryoverSection({ recap }: { recap: MonthlyRecap }) {
  const storeWallets = useStore((s) => s.wallets)
  const carryovers = useStore((s) => s.budgetCarryovers)
  const applyCarryover = useStore((s) => s.applyCarryover)
  const removeCarryover = useStore((s) => s.removeCarryover)

  const nextMonth = nextMonthName(recap.monthKey)
  const activeWallets = useMemo(
    () => storeWallets.filter((w) => !w.isArchived).map((w) => ({ id: w.id, name: w.name })),
    [storeWallets]
  )

  // Carryovers already recorded for the month being recapped, keyed by category.
  const appliedByCat = useMemo(() => {
    const map: Record<string, { id: string; destination: 'category' | 'wallet'; walletId?: string; amount: number }> = {}
    for (const c of carryovers) {
      if (c.fromMonth === recap.monthKey) {
        map[c.categoryId] = { id: c.id, destination: c.destination, walletId: c.walletId, amount: c.amount }
      }
    }
    return map
  }, [carryovers, recap.monthKey])

  if (!recap.hasBudget || recap.carryoverCandidates.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(14,122,90,0.14)' }}>
          <ArrowBendDownRight size={16} weight="bold" color={C.gainInk} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.labelInk }}>Carry over to {nextMonth}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: C.bodyInk }}>
            Roll each category&apos;s leftover or overage into {nextMonth}. Carried amounts adjust next month&apos;s budget (or move a leftover to a wallet) and are logged as transfers — they won&apos;t count as {nextMonth} spending.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {recap.carryoverCandidates.map((candidate) => {
          const applied = appliedByCat[candidate.category.id] ?? null
          return (
            <CarryoverRow
              key={candidate.category.id}
              candidate={candidate}
              nextMonth={nextMonth}
              applied={applied}
              wallets={activeWallets}
              onApply={async (dest, walletId) => {
                await applyCarryover({
                  categoryId: candidate.category.id,
                  categoryLabel: candidate.category.label,
                  fromMonth: recap.monthKey,
                  amount: candidate.delta,
                  destination: dest,
                  walletId,
                })
              }}
              onUndo={async () => {
                if (applied) await removeCarryover(applied.id)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MonthlyRecapModal({ recap, open, onClose }: {
  recap: MonthlyRecap | null; open: boolean; onClose: () => void
}) {
  const reduceMotion = useReducedMotion()
  const animateIt = !reduceMotion

  // Two-step flow: 1 = the recap overview, 2 = the carry-over workspace. The
  // overview carries a compact summary that links through to step 2; step 2 is
  // where the per-category carry decisions actually happen.
  const [step, setStep] = useState<1 | 2>(1)
  // Always reopen on the overview — a new month's recap should never land the
  // user mid-flow on last session's carry-over page. React's sanctioned "adjust
  // state during render" pattern: track the previous `open` in state and reset
  // the step the render the modal transitions closed→open, before paint.
  const [prevOpen, setPrevOpen] = useState(open)
  // Whether the user has visited the carry-over page this session. Until they
  // have, the recap won't let them dismiss past an outstanding carry-over —
  // closing redirects them there instead (see `attemptClose`).
  const [seenCarryover, setSeenCarryover] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) { setStep(1); setSeenCarryover(false) }
  }

  const hasCarryover = !!recap && recap.hasBudget && recap.carryoverCandidates.length > 0

  // Direction drives the slide between steps (forward = +1, back = −1).
  const [dir, setDir] = useState(1)
  const goStep = (next: 1 | 2) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
    if (next === 2) setSeenCarryover(true)
  }

  // Guard dismissal: if there's a carry-over the user hasn't looked at yet, an
  // attempt to close (backdrop tap, close button, or the hero CTA) routes them
  // to the carry-over page first instead of dismissing. Once they've seen it,
  // closing works normally — carrying over stays optional, seeing it doesn't.
  const mustSeeCarryover = hasCarryover && !seenCarryover
  const attemptClose = () => {
    if (mustSeeCarryover) { goStep(2); return }
    onClose()
  }

  return (
    <AnimatePresence>
      {open && recap && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: 'rgba(0,24,18,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={attemptClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${recap.label} monthly recap`}
        >
          <motion.div
            className="relative w-full max-h-[94dvh] overflow-y-auto rounded-t-3xl md:max-w-xl md:rounded-[2rem] lg:max-w-4xl"
            style={{ background: C.canvas, boxShadow: '0 24px 72px rgba(0,32,26,0.28)' }}
            initial={animateIt ? { y: '10%', opacity: 0, scale: 0.95 } : { opacity: 0 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={animateIt ? { y: '6%', opacity: 0, scale: 0.97 } : { opacity: 0 }}
            transition={animateIt ? { type: 'spring', stiffness: 250, damping: 26, delay: 0.16 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <FloatingOrbs show={animateIt} />

            {/* Close — top-right; both the mobile hero and the desktop Earned tile
                behind it are dark, so the translucent-white control stays legible. */}
            <button
              aria-label={mustSeeCarryover ? 'Review carry over' : 'Close recap'}
              onClick={attemptClose}
              className="absolute right-4 top-4 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-transform hover:scale-105 active:scale-90 lg:right-5 lg:top-5"
              style={{ background: 'rgba(0,20,15,0.4)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <X size={14} weight="bold" color="#ffffff" aria-hidden="true" />
            </button>

            <AnimatePresence mode="wait" custom={dir} initial={false}>
            {step === 1 ? (
            <motion.div
              key="recap-step"
              custom={dir}
              variants={stepSlide}
              initial="enter"
              animate="center"
              exit="exit"
            >
            {/* ── Bento grid ──────────────────────────────────────────────────
                Squarish canvas. A 4-col × auto-row grid that mixes footprints:
                the hero is a tall 2×2, the donut a tall 2×2, weekly bars a wide
                2×1, and single stat cells fill the gaps — vertical + horizontal
                rectangles rather than a row of wide strips. */}
            <motion.div
              className="relative z-[1] grid grid-cols-2 gap-2.5 p-2.5 sm:gap-3 sm:p-3 lg:grid-cols-4 lg:auto-rows-[clamp(118px,15.5vh,158px)]"
              variants={bento}
              initial={animateIt ? 'hidden' : false}
              animate="show"
            >
              {/* ── HERO — tall square, top-left 2×2 ─────────────────────────── */}
              <motion.div
                variants={tile}
                className="relative col-span-2 row-span-2 flex flex-col justify-between overflow-hidden rounded-3xl p-5 lg:col-start-1 lg:row-start-1"
                style={{ background: 'linear-gradient(150deg, #002820 0%, #00352e 46%, #1a6358 100%)' }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.42) 50%, transparent 95%)' }} />
                {animateIt && (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 w-1/2"
                    style={{ background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                    initial={{ x: '-140%' }} animate={{ x: '320%' }}
                    transition={{ delay: 0.55, duration: 1.3, ease: 'easeInOut' }}
                  />
                )}
                <ConfettiBurst fire={open && animateIt} />

                <div className="relative">
                  <motion.div
                    className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.14)' }}
                    initial={animateIt ? { scale: 0, rotate: -30 } : false}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ rotate: -8, scale: 1.08 }}
                    transition={animateIt ? { type: 'spring', stiffness: 480, damping: 15, delay: 0.3 } : undefined}
                  >
                    <Confetti size={20} weight="fill" color="#ffffff" aria-hidden="true" />
                  </motion.div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {recap.label} · Month in review
                  </p>
                  {(() => {
                    const { title, sub } = headline(recap)
                    return (
                      <>
                        <h2 className="mt-1 text-[1.5rem] font-bold leading-[1.05] tracking-tight text-balance" style={{ color: '#ffffff' }}>{title}</h2>
                        <p className="mt-1.5 line-clamp-3 max-w-xs text-[12.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.72)' }}>
                          {sub} <span style={{ color: 'rgba(255,255,255,0.5)' }}>{nextMonthNudge(recap)}</span>
                        </p>
                      </>
                    )
                  })()}
                </div>

                <div className="relative mt-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {recap.netSaved >= 0 ? 'Net saved' : 'Overspent by'}
                    </p>
                    {recap.totalIncome > 0 && (
                      <div className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{
                        background: recap.netSaved >= 0 ? 'rgba(95,214,181,0.18)' : 'rgba(255,138,92,0.18)',
                        color: recap.netSaved >= 0 ? '#7ee6cd' : '#ffb599',
                      }}>
                        {formatPercent(recap.savingsRate, 0)} of income
                      </div>
                    )}
                    {recap.transactionCount > 0 && (
                      <div className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
                        {recap.transactionCount} logged · {recap.daysLogged}d active
                      </div>
                    )}
                  </div>
                  <p className="mt-1 whitespace-nowrap font-mono text-[2rem] font-bold leading-none tabular-nums sm:text-[2.3rem]" style={{ color: '#ffffff' }}>
                    <CountUp value={Math.abs(recap.netSaved)} animateIt={animateIt} delay={0.4} />
                  </p>

                  {/* Primary CTA lives inside the hero tile — the recap's single
                      call to action, integrated into the bento rather than a
                      detached footer bar. */}
                  <motion.button
                    onClick={attemptClose}
                    whileTap={{ scale: 0.97 }}
                    whileHover={animateIt ? { scale: 1.02 } : undefined}
                    className="group mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-bold transition-colors sm:w-auto sm:px-6"
                    style={{ background: '#ffffff', color: C.forest }}
                  >
                    {mustSeeCarryover ? 'Review carry over' : 'Start a fresh month'}
                    {mustSeeCarryover
                      ? <ArrowRight size={15} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                      : <ArrowUpRight size={15} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                  </motion.button>
                </div>
              </motion.div>

              {/* ── Spent (light, single) ────────────────────────────────────── */}
              <Tile tone="white" className="!justify-between lg:col-start-3 lg:row-start-1">
                <TileLabel icon={TrendDown} text="Spent" accent={C.dangerInk} />
                <BigStat
                  value={recap.totalSpent} tone="light" animateIt={animateIt} delay={0.42}
                  color={C.dangerInk} format={formatCurrencyCompact}
                  sub={recap.avgDailySpend > 0 ? <>≈ {formatCurrencyCompact(recap.avgDailySpend)}/day</> : undefined}
                />
              </Tile>

              {/* ── Earned (mint accent, single) ─────────────────────────────── */}
              <Tile tone="mint" className="!justify-between lg:col-start-4 lg:row-start-1">
                <TileLabel icon={TrendUp} text="Earned" accent={C.gainInk} />
                <BigStat
                  value={recap.totalIncome} tone="light" animateIt={animateIt} delay={0.48}
                  color={C.gainInk} format={formatCurrencyCompact}
                  sub={recap.savingsRate > 0 ? <>kept {formatPercent(recap.savingsRate, 0)}</> : undefined}
                />
              </Tile>

              {/* ── Weekly bars (dark, wide 2×1) ─────────────────────────────── */}
              <Tile tone="dark" className="col-span-2 lg:col-span-2 lg:col-start-3 lg:row-start-2">
                <WeeklyBars data={recap.weeklySpend} animateIt={animateIt} />
              </Tile>

              {/* ── Donut (dark, tall 2×2) ───────────────────────────────────── */}
              {recap.categoryBreakdown.length > 0 && (
                <Tile tone="dark" className="col-span-2 row-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-3">
                  <SpendDonut data={recap.categoryBreakdown} total={recap.totalSpent} animateIt={animateIt} />
                </Tile>
              )}

              {/* ── Biggest expense (light, single) ──────────────────────────── */}
              {recap.biggestExpense && (
                <Tile className="!justify-between lg:col-start-3 lg:row-start-3">
                  <TileLabel icon={Trophy} text="Biggest" accent="#c07a12" />
                  <div className="mt-auto min-w-0">
                    <p className="whitespace-nowrap font-mono text-[1.55rem] font-bold leading-none tracking-tight tabular-nums" style={{ color: C.numberInk }}>{formatCurrencyCompact(recap.biggestExpense.amount)}</p>
                    <p className="mt-1.5 truncate text-[12px] font-medium" style={{ color: C.labelInk }}>{recap.biggestExpense.merchant}</p>
                  </div>
                </Tile>
              )}

              {/* ── Top category (mint accent, single) ───────────────────────── */}
              {recap.topCategory && (() => {
                const Icon = getIconComponent(recap.topCategory.category.icon)
                return (
                  <Tile tone="mint" className="lg:col-start-3 lg:row-start-4">
                    <TileLabel icon={Sparkle} text="Top category" accent={C.gainInk} />
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${catHex(recap.topCategory.category.id)}22` }}>
                        <Icon size={17} weight="fill" color={catHex(recap.topCategory.category.id)} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold" style={{ color: C.numberInk }}>{recap.topCategory.category.label}</p>
                        <p className="font-mono text-[13px] font-bold tabular-nums" style={{ color: C.bodyInk }}>{formatCurrency(recap.topCategory.spent)}</p>
                      </div>
                    </div>
                  </Tile>
                )
              })()}

              {/* ── Spending rhythm — avg by weekday (white, tall 1×2) ───────────
                  Takes a tall footprint (rows 3–4) — mirroring the donut on the
                  left and giving the right column a vertical rectangle in the
                  shape mix. Seven bars, so it can't overflow. */}
              <Tile tone="white" className="col-span-2 row-span-2 lg:col-span-1 lg:col-start-4 lg:row-start-3 lg:row-span-2">
                <WeekdayRhythm dailySpend={recap.dailySpend} animateIt={animateIt} />
              </Tile>

            </motion.div>

            {/* ── Insights row: takeaway + carry-over teaser ────────────────────
                A single row below the bento. On desktop the plain-language
                takeaway occupies 1/3 and the carry-over summary (which routes to
                step 2) fills the other 2/3. When there's no carry-over to make,
                the takeaway spans the full width. */}
            <motion.div
              className="relative z-[1] grid grid-cols-1 gap-2.5 px-2.5 pb-2.5 sm:gap-3 sm:px-3 sm:pb-3 lg:grid-cols-3"
              variants={bento}
              initial={animateIt ? 'hidden' : false}
              animate="show"
            >
              {/* What this means — plain-language takeaway */}
              {(() => {
                const centavos = Math.round(recap.savingsRate * 100)
                const annual = recap.netSaved * 12
                let body: React.ReactNode
                if (recap.totalIncome === 0 && recap.totalSpent === 0) {
                  body = <>No activity logged yet. Jot down what you spend and earn, and next month this space will explain your money in plain language.</>
                } else if (recap.savingsRate >= 0.2) {
                  body = <>You kept <b style={{ color: C.gainInk }}>{centavos}¢ of every ₱1</b> you earned — a level most people find hard to hit. Hold this pace and you&apos;d set aside around <b style={{ color: C.gainInk }}>{formatCurrencyCompact(annual)}</b> over a year.</>
                } else if (recap.netSaved > 0) {
                  body = <>You spent less than you earned and kept <b style={{ color: C.gainInk }}>{centavos}¢ of every ₱1</b>. Nudge that a little higher and, over a year, it&apos;d add up to about <b style={{ color: C.gainInk }}>{formatCurrencyCompact(annual)}</b>.</>
                } else if (recap.netSaved === 0) {
                  body = <>You spent almost exactly what you earned. Try setting aside even <b style={{ color: C.gainInk }}>10%</b> before you spend next month — saving a little first is easier than saving what&apos;s left.</>
                } else {
                  body = <>You spent <b style={{ color: C.dangerInk }}>{formatCurrencyCompact(Math.abs(recap.netSaved))}</b> more than you earned. That happens some months — the aim is to even out over time, not to be perfect every month.</>
                }
                return (
                  <Tile tone="mint" className={`!items-start !gap-2.5 ${hasCarryover ? '' : 'lg:col-span-3'}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(14,122,90,0.14)' }}>
                      <Sparkle size={16} weight="fill" color={C.gainInk} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.labelInk }}>What this means</p>
                      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.bodyInk }}>{body}</p>
                    </div>
                  </Tile>
                )
              })()}

              {/* Carry-over summary — routes to the dedicated carry-over step.
                  Self-hides when the month had no budget or every category landed
                  exactly on target. */}
              {hasCarryover && (
                <motion.div variants={tile} className="lg:col-span-2">
                  <CarryoverSummary recap={recap} onOpen={() => goStep(2)} />
                </motion.div>
              )}
            </motion.div>
            </motion.div>
            ) : (
            // ── Step 2 — the carry-over workspace ─────────────────────────────
            <motion.div
              key="carryover-step"
              custom={dir}
              variants={stepSlide}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative z-[1] p-2.5 sm:p-3"
            >
              {/* Back to the recap overview */}
              <button
                type="button"
                onClick={() => goStep(1)}
                className="mb-3 flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3.5 text-[12px] font-bold transition-colors hover:opacity-80"
                style={{ background: C.cream, color: C.bodyInk, border: '1px solid rgba(0,53,46,0.06)' }}
              >
                <ArrowLeft size={13} weight="bold" aria-hidden="true" />
                Back to recap
              </button>

              <div className="rounded-3xl p-4 sm:p-5" style={{ background: C.cream, boxShadow: '0 2px 16px rgba(0,40,32,0.08)', border: '1px solid rgba(0,53,46,0.05)' }}>
                {hasCarryover
                  ? <CarryoverSection recap={recap} />
                  : <p className="text-[13px] leading-relaxed" style={{ color: C.bodyInk }}>Nothing to carry over this month.</p>}
              </div>

              {/* Done — return to the overview to close out from the hero CTA */}
              <motion.button
                onClick={() => goStep(1)}
                whileTap={{ scale: 0.98 }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1f695d, #00352e)' }}
              >
                Done
                <Check size={15} weight="bold" aria-hidden="true" />
              </motion.button>
            </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
