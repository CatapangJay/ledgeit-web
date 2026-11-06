import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, AppState, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions,
  type AccessibilityActionEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing, Extrapolation, FadeIn, FadeOut, ReduceMotion, cancelAnimation, interpolate,
  useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Check, X } from 'phosphor-react-native';
import type { MonthlyRecap } from '@/lib/monthlyRecap';
import { buildRecapInsights } from '@/lib/recapInsights';
import { useStore } from '@/lib/store';
import { StoryPage, buildPages, hasCarryover } from './recap/pages';
import CarryoverPage from './recap/CarryoverPage';
import { BAR_TOP, CHROME_ROW_H, CHROME_ROW_TOP, GUTTER } from './recap/parts';
import { C, F, FIELD, INK, SPRING } from './recap/theme';

// ─── Monthly recap — full-screen story ──────────────────────────────────────────
// One summary topic per full-bleed page, Wrapped-style: a segmented progress bar
// up top, tap the right ⅔ for next / left ⅓ for previous, press-and-hold to
// pause, swipe down to close. Pages auto-advance except the interactive
// carry-over page and the closing summary.

const CLOSE_DISTANCE = 140;
const CLOSE_VELOCITY = 900;

// One progress segment: full for visited pages, empty for upcoming ones, and
// driven by the shared `progress` (scaleX from the left edge) for the current one.
function ProgressSegment({ state, progress }: { state: 'done' | 'current' | 'todo'; progress: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: state === 'done' ? 1 : state === 'todo' ? 0 : progress.get() }],
  }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(244,247,246,0.28)' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: INK, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

export default function MonthlyRecapModal({ recap, open, onClose }: {
  recap: MonthlyRecap | null; open: boolean; onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const animateIt = !reduceMotion;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Next-month suggestions read the month's entries and current wallets. Wallets
  // can change mid-story (a carry-over into one), which refreshes the copy but
  // never the page list — the insights page always has at least one card.
  const transactions = useStore((s) => s.transactions);
  const wallets = useStore((s) => s.wallets);
  const insights = useMemo(
    () => (recap ? buildRecapInsights(recap, transactions, wallets) : []),
    [recap, transactions, wallets],
  );
  const pages = useMemo(() => (recap ? buildPages(recap, insights) : []), [recap, insights]);
  const pageCount = pages.length;
  const carryIdx = pages.findIndex((p) => p.id === 'carryover');

  const [index, setIndex] = useState(0);
  // Bumped on every navigation: each visit to a page gets a fresh timer, even
  // when returning to a page seen before.
  const [visit, setVisit] = useState(0);
  // Until the user has reached the carry-over page this session, a close attempt
  // redirects them there instead (see `attemptClose`).
  const [seenCarryover, setSeenCarryover] = useState(false);
  const [held, setHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Always reopen on page 1 — reset during render on the closed→open edge.
  const [prevOpen, setPrevOpen] = useState(open);
  // Bumped on every open so per-page timer state from a previous session never
  // carries over (see `resumeRef`).
  const [session, setSession] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSession((s) => s + 1);
      setIndex(0);
      setSeenCarryover(false);
      setHeld(false);
      setDragging(false);
    }
  }

  const [appActive, setAppActive] = useState(true);
  const [screenReader, setScreenReader] = useState(false);

  const safeIndex = Math.min(index, Math.max(0, pageCount - 1));
  const page = pages[safeIndex];

  // 0 → 1 over the current page's duration; also drives the active segment.
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const chromeOpacity = useSharedValue(1);

  const goTo = useCallback((target: number) => {
    if (target < 0 || target >= pageCount) return;
    // Write-only (queued in order before the timer effect's own set), so the new
    // page's segment doesn't flash the previous page's fill for a frame.
    progress.set(0);
    setIndex(target);
    setVisit((v) => v + 1);
    if (target === carryIdx) setSeenCarryover(true);
  }, [pageCount, carryIdx, progress]);

  // Guard dismissal: an outstanding carry-over the user hasn't reached yet routes
  // a close attempt (close button, swipe down, Android back on page 1, Done) to
  // the carry-over page first. Carrying over stays optional; seeing it doesn't.
  const mustSeeCarryover = !!recap && hasCarryover(recap) && !seenCarryover;
  const attemptClose = useCallback(() => {
    if (mustSeeCarryover) {
      goTo(carryIdx);
      return;
    }
    onClose();
  }, [mustSeeCarryover, goTo, carryIdx, onClose]);

  // Android back steps to the previous page; on page 1 it's a close attempt.
  const handleBack = () => {
    if (safeIndex > 0) goTo(safeIndex - 1);
    else attemptClose();
  };

  const handleSwipeClose = useCallback(() => {
    if (mustSeeCarryover) {
      dragY.set(withSpring(0, SPRING));
      goTo(carryIdx);
      return;
    }
    dragY.set(withTiming(height, { duration: 220, easing: Easing.in(Easing.quad) }));
    onClose();
  }, [mustSeeCarryover, dragY, goTo, carryIdx, height, onClose]);

  // ── Pausing: app backgrounded, or a screen reader is reading the page ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (alive) setScreenReader(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // Fresh shared state on every open. Also reset once the close fade has finished,
  // so a reopened story never paints its first frames still dragged off-screen.
  useEffect(() => {
    if (open) {
      dragY.set(0);
      chromeOpacity.set(1);
      return;
    }
    const t = setTimeout(() => {
      dragY.set(0);
      progress.set(0);
    }, 320);
    return () => clearTimeout(t);
  }, [open, progress, dragY, chromeOpacity]);

  // Latest index/open for the timer's completion callback, which lands
  // asynchronously from the UI thread and must not act on a page the user has
  // already left.
  const indexRef = useRef(safeIndex);
  const openRef = useRef(open);
  const heldRef = useRef(held);
  useLayoutEffect(() => {
    indexRef.current = safeIndex;
    openRef.current = open;
    heldRef.current = held;
  });
  // A completion that lands just as a hold starts is dropped; the release resumes
  // the (finished) segment, which then advances normally.
  const advanceFrom = useCallback((from: number) => {
    if (openRef.current && !heldRef.current && indexRef.current === from) goTo(from + 1);
  }, [goTo]);

  // ── Auto-advance ──
  // Runs the current segment and advances when it completes. A pause (hold, drag,
  // backgrounding) remembers how far the segment got, keyed by session + visit,
  // so resuming continues rather than restarts; any other start begins at 0.
  // Progress is never read back from the UI thread at start — a JS-side
  // `progress.get()` can see a value from before a just-queued reset.
  // Interactive pages show a full segment and wait for the user.
  const resumeRef = useRef<{ key: string; frac: number }>({ key: '', frac: 0 });
  const duration = page?.duration ?? null;
  const running = open && duration !== null && !held && !dragging && appActive && !screenReader;
  useEffect(() => {
    if (!open) return;
    if (duration === null) {
      cancelAnimation(progress);
      progress.set(1);
      return;
    }
    const key = `${session}:${visit}`;
    const from = resumeRef.current.key === key ? resumeRef.current.frac : 0;
    if (!running) {
      cancelAnimation(progress);
      progress.set(from);
      return;
    }
    progress.set(from);
    // The timer is a clock, not motion: ReduceMotion.Never stops the OS setting
    // from completing it on the first frame and skipping every page.
    progress.set(withTiming(1, {
      duration: Math.max(0, (1 - from) * duration),
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(advanceFrom, safeIndex);
    }));
    return () => {
      // Snapshot how far this segment got so a pause can resume from it. A page
      // change or new session uses a different key, so the snapshot is ignored.
      resumeRef.current = { key, frac: Math.min(1, Math.max(0, progress.get())) };
      cancelAnimation(progress);
    };
  }, [open, running, duration, session, visit, safeIndex, advanceFrom, progress]);

  // Holding dims the chrome so the page can be read unobstructed.
  useEffect(() => {
    chromeOpacity.set(withTiming(held ? 0.15 : 1, { duration: 180 }));
  }, [held, chromeOpacity]);

  // ── Gestures ──
  // Tap zones, hold-to-pause and swipe-down race each other; the interactive
  // carry-over page disables all three so its own controls and scroll work.
  const storyEnabled = page?.id !== 'carryover';
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .enabled(storyEnabled)
      .maxDuration(250)
      .runOnJS(true)
      .onEnd((e, success) => {
        if (!success) return;
        goTo(e.x < width / 3 ? safeIndex - 1 : safeIndex + 1);
      });
    const hold = Gesture.LongPress()
      .enabled(storyEnabled)
      .minDuration(220)
      .runOnJS(true)
      .onStart(() => setHeld(true))
      .onFinalize(() => setHeld(false));
    const swipe = Gesture.Pan()
      .enabled(storyEnabled)
      .activeOffsetY(14)
      .failOffsetX([-24, 24])
      .onStart(() => {
        'worklet';
        scheduleOnRN(setDragging, true);
      })
      .onUpdate((e) => {
        'worklet';
        dragY.set(Math.max(0, e.translationY));
      })
      .onEnd((e) => {
        'worklet';
        if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) scheduleOnRN(handleSwipeClose);
        else dragY.set(withSpring(0, SPRING));
      })
      .onFinalize(() => {
        'worklet';
        scheduleOnRN(setDragging, false);
      });
    return Gesture.Race(swipe, hold, tap);
  }, [storyEnabled, width, safeIndex, goTo, dragY, handleSwipeClose]);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') goTo(safeIndex + 1);
    else if (e.nativeEvent.actionName === 'decrement') goTo(safeIndex - 1);
    else if (e.nativeEvent.actionName === 'escape') attemptClose();
  };

  const storyStyle = useAnimatedStyle(() => {
    const y = dragY.get();
    return {
      opacity: interpolate(y, [0, height * 0.7], [1, 0.4], Extrapolation.CLAMP),
      transform: [{ translateY: y }, { scale: interpolate(y, [0, height], [1, 0.9], Extrapolation.CLAMP) }],
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.get(), [0, height * 0.7], [1, 0], Extrapolation.CLAMP),
  }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.get() }));

  const closeLabel = mustSeeCarryover ? 'Review carry over before closing' : 'Close recap';

  return (
    <Modal
      visible={open && !!recap}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleBack}
    >
      {/* Modals render outside the root gesture view on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FIELD.canvas }, backdropStyle]} />
        {recap && page && (
          <Animated.View accessibilityViewIsModal style={[{ flex: 1, overflow: 'hidden' }, storyStyle]}>
            <GestureDetector gesture={gesture}>
              <View
                style={StyleSheet.absoluteFill}
                accessible={storyEnabled}
                accessibilityRole={storyEnabled ? 'adjustable' : undefined}
                accessibilityLabel={storyEnabled ? page.a11y : undefined}
                accessibilityHint={storyEnabled ? 'Adjust to move between recap pages.' : undefined}
                accessibilityActions={storyEnabled
                  ? [{ name: 'increment', label: 'Next page' }, { name: 'decrement', label: 'Previous page' }, { name: 'escape', label: closeLabel }]
                  : undefined}
                onAccessibilityAction={storyEnabled ? onAccessibilityAction : undefined}
              >
                {/* Only the current page is mounted; the outgoing one crossfades away. */}
                <Animated.View
                  key={page.id}
                  entering={FadeIn.duration(260)}
                  exiting={FadeOut.duration(220)}
                  style={StyleSheet.absoluteFill}
                >
                  {page.id === 'carryover' ? (
                    <CarryoverPage
                      recap={recap}
                      bg={page.bg}
                      animateIt={animateIt}
                      onBack={() => goTo(safeIndex - 1)}
                      onNext={() => goTo(safeIndex + 1)}
                    />
                  ) : (
                    <StoryPage recap={recap} def={page} insights={insights} animateIt={animateIt} />
                  )}
                </Animated.View>
              </View>
            </GestureDetector>

            {/* Done sits above the story surface so it never triggers a tap zone. */}
            {page.id === 'outro' && (
              <Animated.View
                entering={animateIt ? FadeIn.delay(700).duration(320) : undefined}
                style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: insets.bottom + 20 }}
              >
                <Pressable
                  onPress={attemptClose}
                  accessibilityRole="button"
                  accessibilityLabel={mustSeeCarryover ? 'Review carry over' : 'Done, close recap'}
                  className="flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.97]"
                  style={{ minHeight: 56, backgroundColor: INK }}
                >
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: C.forest }}>Done</Text>
                  <Check size={17} weight="bold" color={C.forest} />
                </Pressable>
              </Animated.View>
            )}

            {/* Chrome — progress bar, then the close button on the eyebrow row. */}
            <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, chromeStyle]}>
              <View
                pointerEvents="none"
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Page ${safeIndex + 1} of ${pageCount}`}
                accessibilityValue={{ min: 1, max: pageCount, now: safeIndex + 1 }}
                style={{ position: 'absolute', top: insets.top + BAR_TOP, left: 12, right: 12, flexDirection: 'row', gap: 4 }}
              >
                {pages.map((p, i) => (
                  <ProgressSegment
                    key={p.id}
                    state={i < safeIndex ? 'done' : i === safeIndex ? 'current' : 'todo'}
                    progress={progress}
                  />
                ))}
              </View>
              <Pressable
                onPress={attemptClose}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                className="items-center justify-center rounded-full active:scale-90"
                style={{
                  position: 'absolute',
                  top: insets.top + CHROME_ROW_TOP,
                  right: GUTTER - 12,
                  width: CHROME_ROW_H,
                  height: CHROME_ROW_H,
                  backgroundColor: 'rgba(244,247,246,0.12)',
                }}
              >
                <X size={18} weight="bold" color={INK} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
