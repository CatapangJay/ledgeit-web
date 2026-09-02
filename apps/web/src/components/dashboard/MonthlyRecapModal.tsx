'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  motion, AnimatePresence, useReducedMotion,
  useMotionValue, useTransform, animate,
  type Variants,
} from 'framer-motion'
import {
  X, Confetti, TrendUp, TrendDown, Trophy,
  CalendarCheck, Target, ArrowUpRight, Sparkle,
  PiggyBank, ShieldCheck, Clock, Lightbulb,
} from '@phosphor-icons/react'
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import type { MonthlyRecap, RecapCategoryStat } from '@/lib/monthlyRecap'

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

// ─── Finance tips — full-width behavioral cues ──────────────────────────────────
// Three evidence-backed, jargon-free habits (Bank of America BetterMoneyHabits,
// Fidelity, MoneyUnder30). Kept concrete and non-preachy for first-time budgeters.
const FINANCE_TIPS: { icon: typeof PiggyBank; title: string; body: string }[] = [
  { icon: ShieldCheck, title: 'Build a safety net', body: 'Aim to save 3–6 months of expenses somewhere separate — for job loss, illness, or emergencies.' },
  { icon: TrendUp, title: 'Pay yourself first', body: 'Move savings out the moment you get paid, before you spend. Automate it so it is not a choice.' },
  { icon: Clock, title: 'Beat impulse buys', body: 'Wait 24 hours before any unplanned purchase. Still want it tomorrow? Then it is probably worth it.' },
]
function FinanceTips() {
  return (
    <Tile tone="light" className="lg:col-span-2 !justify-start !gap-3">
      <TileLabel icon={Lightbulb} text="Money habits worth keeping" accent={C.gainInk} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FINANCE_TIPS.map((t) => (
          <div key={t.title} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(14,122,90,0.12)' }}>
              <t.icon size={15} weight="bold" color={C.gainInk} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold" style={{ color: C.numberInk }}>{t.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: C.bodyInk }}>{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Tile>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MonthlyRecapModal({ recap, open, onClose }: {
  recap: MonthlyRecap | null; open: boolean; onClose: () => void
}) {
  const reduceMotion = useReducedMotion()
  const animateIt = !reduceMotion

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
          onClick={onClose}
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
              aria-label="Close recap"
              onClick={onClose}
              className="absolute right-4 top-4 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-transform hover:scale-105 active:scale-90 lg:right-5 lg:top-5"
              style={{ background: 'rgba(0,20,15,0.4)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <X size={14} weight="bold" color="#ffffff" aria-hidden="true" />
            </button>

            {/* ── Bento grid ──────────────────────────────────────────────────
                Squarish canvas. A 4-col × auto-row grid that mixes footprints:
                the hero is a tall 2×2, the donut a tall 2×2, weekly bars a wide
                2×1, and single stat cells fill the gaps — vertical + horizontal
                rectangles rather than a row of wide strips. */}
            <motion.div
              className="relative z-[1] grid grid-cols-2 gap-2.5 p-2.5 sm:gap-3 sm:p-3 lg:grid-cols-4 lg:auto-rows-[158px]"
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
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                    whileHover={animateIt ? { scale: 1.02 } : undefined}
                    className="group mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-bold transition-colors sm:w-auto sm:px-6"
                    style={{ background: '#ffffff', color: C.forest }}
                  >
                    Start a fresh month
                    <ArrowUpRight size={15} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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

            {/* ── Insights row: takeaway (1/3) + finance guidance (2/3) ─────────
                A second grid below the bento. On desktop it's a 3-column row: the
                plain-language takeaway occupies 1/3, and a budgeting-guidance card
                fills the other 2/3. Beneath, a full-width tip strip. */}
            <motion.div
              className="relative z-[1] grid grid-cols-1 gap-2.5 px-2.5 pb-2.5 sm:gap-3 sm:px-3 sm:pb-3 lg:grid-cols-3"
              variants={bento}
              initial={animateIt ? 'hidden' : false}
              animate="show"
            >
              {/* What this means — plain-language takeaway (1/3) */}
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
                  <Tile tone="mint" className="!items-start !gap-2.5">
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

              {/* Full-width tip strip — filled once research completes */}
              <FinanceTips />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
