import { createElement, useEffect, useState, type ReactNode } from 'react';
import { Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSpring,
} from 'react-native-reanimated';
import type { IconProps } from 'phosphor-react-native';
import { getIconComponent } from '@/lib/iconMap';
import { F, INK, INK_DIM, SPRING } from './theme';

// Layout grid shared by every page and the story chrome, so the eyebrow always
// sits on the same row as the close button, just under the progress bar.
export const GUTTER = 28;
export const BAR_TOP = 10;
export const CHROME_ROW_TOP = 22;
export const CHROME_ROW_H = 44;

// ─── Category glyph ──────────────────────────────────────────────────────────
// Resolves a category's Phosphor icon by name without declaring a component
// during the caller's render.
export function CategoryGlyph({ name, ...props }: { name: string } & IconProps) {
  return createElement(getIconComponent(name), props);
}

// ─── Reveal ────────────────────────────────────────────────────────────────────
// Staggered kinetic entrance: fades in while springing from an offset (or a
// small scale). Pages remount per visit, so this plays once per page view.
// Under reduced motion it renders in place, final state.
export function Reveal({ delay = 0, animateIt, from = 'up', distance = 28, spring = SPRING, style, children }: {
  delay?: number;
  animateIt: boolean;
  from?: 'up' | 'right' | 'scale';
  distance?: number;
  spring?: { damping: number; stiffness: number; mass?: number };
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const t = useSharedValue(animateIt ? 0 : 1);
  // Depend on the spring's numbers, not the object, so inline configs don't
  // restart the entrance when the page re-renders (e.g. on hold-to-pause).
  const { damping, stiffness, mass = 1 } = spring;
  useEffect(() => {
    if (animateIt) t.set(withDelay(delay, withSpring(1, { damping, stiffness, mass })));
  }, [t, animateIt, delay, damping, stiffness, mass]);
  const animated = useAnimatedStyle(() => {
    const p = t.get();
    const opacity = interpolate(p, [0, 0.55], [0, 1], Extrapolation.CLAMP);
    if (from === 'scale') return { opacity, transform: [{ scale: 0.82 + 0.18 * p }] };
    if (from === 'right') return { opacity, transform: [{ translateX: (1 - p) * distance }] };
    return { opacity, transform: [{ translateY: (1 - p) * distance }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// ─── Count-up ────────────────────────────────────────────────────────────────
// Animates 0 → value once with an ease-out curve (rAF-driven, since RN Text
// can't bind to a reanimated value). Lands on the exact value; static when
// motion is reduced.
function useCountUp(value: number, animateIt: boolean, delay: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!animateIt) return;
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / 1100);
        setN(p < 1 ? Math.round(value * (1 - Math.pow(1 - p, 4))) : value);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, animateIt, delay]);
  return animateIt ? n : value;
}

export function CountUpText({ value, format, delay = 0, animateIt, style }: {
  value: number; format: (n: number) => string; delay?: number; animateIt: boolean; style?: StyleProp<TextStyle>;
}) {
  const n = useCountUp(value, animateIt, delay);
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={style}>
      {format(n)}
    </Text>
  );
}

// ─── Background numeral ──────────────────────────────────────────────────────
// The signature graphic: an oversized, cropped Geist Mono figure bleeding off
// the bottom-right corner at low opacity, drifting in slowly.
export function Numeral({ text, animateIt }: { text: string; animateIt: boolean }) {
  const { width } = useWindowDimensions();
  const size = Math.max(160, Math.min(380, (width * 1.25) / (text.length * 0.6)));
  const boxW = size * text.length * 0.62;
  return (
    <Reveal
      animateIt={animateIt}
      from="right"
      distance={56}
      delay={80}
      spring={{ damping: 26, stiffness: 50 }}
      style={{ position: 'absolute', right: -size * 0.1, bottom: -size * 0.22, width: boxW }}
    >
      <Text
        accessible={false}
        importantForAccessibility="no"
        numberOfLines={1}
        style={{
          fontFamily: F.mono,
          fontSize: size,
          lineHeight: size * 1.05,
          letterSpacing: -size * 0.06,
          color: INK,
          opacity: 0.075,
          textAlign: 'right',
          includeFontPadding: false,
        }}
      >
        {text}
      </Text>
    </Reveal>
  );
}

// ─── Page frame ────────────────────────────────────────────────────────────────
// Full-bleed colour field with the shared grid: eyebrow top-left on the close
// button's row, the reveal centred-left, and a quiet footer.
export function PageFrame({ bg, eyebrow, numeral, footer, label, align = 'center', showFooter = align === 'center', animateIt, children }: {
  bg: string;
  eyebrow: string;
  numeral?: string;
  footer?: string;
  label: string;
  align?: 'center' | 'top';
  showFooter?: boolean;
  animateIt: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: bg, overflow: 'hidden' }}>
      {numeral ? <Numeral text={numeral} animateIt={animateIt} /> : null}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + CHROME_ROW_TOP,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: GUTTER,
        }}
      >
        <View style={{ height: CHROME_ROW_H, justifyContent: 'center', paddingRight: 56 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: INK_DIM }}>
            {eyebrow}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>{children}</View>
        {showFooter && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: -0.2, color: INK_DIM }}>
              LedgeIt <Text style={{ fontFamily: F.medium }}>· {label}</Text>
            </Text>
            {footer ? <Text style={{ fontFamily: F.semibold, fontSize: 12, color: INK_DIM }}>{footer}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Type ramp ───────────────────────────────────────────────────────────────
export const T = {
  lead: { fontFamily: F.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: INK },
  context: { fontFamily: F.medium, fontSize: 16, lineHeight: 23, color: INK_DIM },
  statLabel: { fontFamily: F.display, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: INK_DIM },
  statValue: { fontFamily: F.mono, fontSize: 20, lineHeight: 26, color: INK },
} satisfies Record<string, TextStyle>;

// A small labelled figure used in the context rows beneath a reveal.
export function MiniStat({ label, value, sub, color = INK, mono = true }: {
  label: string; value: string; sub?: string; color?: string; mono?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Text numberOfLines={1} style={T.statLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[T.statValue, { color, fontVariant: ['tabular-nums'] }, !mono && { fontFamily: F.display, letterSpacing: -0.3 }]}
      >
        {value}
      </Text>
      {sub ? <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, color: INK_DIM }}>{sub}</Text> : null}
    </View>
  );
}

// ─── Growing bar ─────────────────────────────────────────────────────────────
// A bar that springs to its size along one axis via scale (transform only),
// anchored at its start edge. `fill` is the bar's final fraction of the track.
export function GrowBar({ fill, color, axis, delay, animateIt, thickness, radius }: {
  fill: number; color: string; axis: 'x' | 'y'; delay: number; animateIt: boolean; thickness?: number; radius: number;
}) {
  const t = useSharedValue(animateIt ? 0 : 1);
  useEffect(() => {
    if (animateIt) t.set(withDelay(delay, withSpring(1, { damping: 20, stiffness: 120, overshootClamping: true })));
  }, [t, animateIt, delay]);
  const animated = useAnimatedStyle(() => (
    axis === 'x' ? { transform: [{ scaleX: t.get() }] } : { transform: [{ scaleY: t.get() }] }
  ));
  const pct = `${Math.max(3, Math.min(100, fill * 100))}%` as const;
  return (
    <Animated.View
      style={[
        axis === 'x'
          ? { width: pct, height: thickness ?? '100%', transformOrigin: 'left' }
          : { height: pct, width: thickness ?? '100%', transformOrigin: 'bottom' },
        { backgroundColor: color, borderRadius: radius },
        animated,
      ]}
    />
  );
}
