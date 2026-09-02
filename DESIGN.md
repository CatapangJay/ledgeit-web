---
name: LedgeIt
description: Log anything in under 5 seconds. No dropdowns. No categories. Just type.
colors:
  accent-deep: "#00352e"
  accent-teal: "#1f695d"
  gain: "#1f6950"
  danger: "#ba1a1a"
  danger-bright: "#de3730"
  bg: "#f8faf9"
  surface-low: "#f0f4f2"
  surface: "#e7edeb"
  surface-high: "#d4e4e0"
  surface-highest: "#c1d9d4"
  ink: "#191c1c"
  ink-variant: "#3f4946"
  muted: "#6e9990"
  border: "#cde0db"
  # Neutral-dark family — a green-undertoned charcoal that harmonizes with the
  # deep-green accent. Used for dark canvases and dark tiles (e.g. the monthly
  # recap bento) where near-black creates contrast and a premium, calm weight.
  # NOT navy, NOT a warm neutral — the faint green undertone keeps it on-brand.
  neutral-canvas: "#141917"      # darkest — full-bleed dark surface / panel bg
  neutral-surface: "#1e2422"     # dark tile surface on the canvas
  neutral-surface-high: "#28302d" # raised dark surface / chips
  neutral-ink: "#f4f7f6"         # primary text on neutral-dark
  neutral-ink-dim: "rgba(255,255,255,0.6)" # muted text/labels on neutral-dark
  # Bright accent variants for legible data on neutral-dark surfaces
  danger-on-dark: "#ff8a80"
  gain-on-dark: "#5fd6bd"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
  numeric:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  pill: "9999px"
  hero: "24px"
  card: "16px"
  icon: "12px"
  sm: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #1f695d 0%, #00352e 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "linear-gradient(135deg, #24796b 0%, #004036 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  button-ghost:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.muted}"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  chip-pill:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink-variant}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-category:
    backgroundColor: "rgba(110,153,144,0.10)"
    textColor: "{colors.ink-variant}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card-surface:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  card-hero:
    backgroundColor: "#00352e"
    textColor: "#ffffff"
    rounded: "{rounded.hero}"
    padding: "24px"
---

# Design System: LedgeIt

## 1. Overview

**Creative North Star: "The Household Ledger"**

LedgeIt's visual system is built around a single idea: a well-kept personal record that a family trusts. Not a bank product, not an enterprise dashboard — a personal artifact that feels like it belongs in your home. The design earns that trust through composure. Deep Forest Green grounds every screen; generous whitespace creates breathing room in what could otherwise be a stressful context; spring-driven animations communicate responsiveness without urgency.

The system is soft-premium: rounded forms, layered tonal surfaces, and ambient shadows that separate layers without drama. Nothing is decorative. Every radius, every shadow, every animation serves either comprehension or confidence. When something moves, it's because a state changed and the user needs to perceive that change — not because motion is present by default.

This system explicitly rejects: the navy-and-gold of traditional finance apps, the neon glow and volatile energy of crypto products, and the information-wall approach of tools like Mint where the first screen is a 10-chart dashboard. LedgeIt should feel like the opposite of overwhelming.

**Key Characteristics:**
- Deep Forest Green as the anchor: earns authority without coldness
- Tonal surface hierarchy instead of hard borders: five steps from `bg` to `surface-highest`
- Spring physics throughout: responsive, not mechanical
- Monospaced numerics: Geist Mono for all currency values — precision reads as trustworthy
- Soft-premium radius vocabulary: hero at 24px, cards at 16px, icons at 12px, chips as pills

## 2. Colors: The Forest Ledger Palette

A single-hue green family carries the whole system. Accents shift between a near-black deep green and a warm teal; the surface ramp moves from sage-white to sea-glass. Financial deltas (gain/loss) use emphatic color with enough saturation to communicate at a glance.

### Primary
- **Deep Forest (#00352e):** The system's anchor. Used on the hero balance card background, primary button gradient terminus, and key headings. Its near-black depth communicates authority without the coldness of black itself.
- **Warm Teal (#1f695d):** Primary interactive color — button gradient origin, success states, caret highlight in the entry field, income amounts. More approachable than the deep; used where the user is being invited to act.

### Secondary
- **Gain Emerald (#1f6950):** Positive financial delta. Income amounts, positive trend badges, success confirmation backgrounds. Meaningfully distinct from the teal primary so financial signals aren't confused with UI signals.

### Tertiary
- **Danger Crimson (#ba1a1a):** Negative financial delta. Expense amounts, all-time spend totals. Warm crimson rather than cold red — present without being alarming.
- **Danger Vivid (#de3730):** Reserved for destructive actions only. Not used for routine expense display.

### Neutral
- **Sage White (#f8faf9):** Page background. The lightest surface; barely-tinted with the system's green hue so the palette coheres.
- **Sage Low (#f0f4f2):** Surface container low. Ghost button backgrounds, mode toggle container, icon badges.
- **Sage Mid (#e7edeb):** Surface container. Segmented control selected-item track, secondary surfaces.
- **Sage High (#d4e4e0):** Surface container high. Scrollbar thumb, the upper end of the tonal ramp.
- **Sea Glass (#c1d9d4):** Surface container highest. Skeleton shimmer peak.
- **Near Black (#191c1c):** Primary text. On-surface; warm-tinted near-black rather than pure black, so it sits inside the green palette.
- **Slate Green (#3f4946):** Secondary text. Category labels, section headers, descriptive text. Carries the green hue more visibly than near-black.
- **Muted Teal (#6e9990):** Muted text, placeholder states, count badges, "Analyzing…" feedback. Also the fallback category color.
- **Gossamer (#cde0db):** Borders and dividers. Barely-there lines that separate without competing.

**The One-Hue Rule.** Every color in this system, from the deepest accent to the palest background, originates from the same green-teal hue family. Importing a warm neutral or a blue-gray breaks the palette's coherence. When in doubt, shift lightness and chroma within hue 165–175°, not across hue families.

**The Semantic Delta Rule.** Gain Emerald and Danger Crimson are financial signal colors. They must never be repurposed for decorative or non-financial UI — not for section headings, not for hover states, not for icons that aren't transaction-related.

## 3. Typography

**Display / Body / Label Font:** Plus Jakarta Sans (weights 400–800), with `system-ui, sans-serif` fallback.
**Numeric Font:** Geist Mono, with `monospace` fallback.

**Character:** A single humanist sans-serif family across all text roles, differentiated by weight and size rather than contrasting families. Geist Mono is the only departure, reserved exclusively for currency values — the font switch signals precision and makes numbers scannable in a feed of mixed text.

### Hierarchy
- **Display** (700, 2.75rem, leading-none, -0.02em): Balance total in the hero card. One value per screen.
- **Headline** (700, 1.375rem, 1.2, -0.01em): Screen-level greeting headings.
- **Title** (700, 0.9375rem, 1.3): Section headings, sheet titles, modal headers.
- **Body** (400, 0.8125rem, 1.5): Transaction descriptions, merchant names, contextual text.
- **Label** (700, 0.6875rem, 1.2, 0.14em tracking, uppercase): Section eyebrows — used sparingly for "Recent Activity", "Today's Spend". One per card maximum.
- **Numeric** (Geist Mono, 700, 0.8125rem–2.75rem, 1.2): All currency values. Size scales with hierarchy: display-size for the hero balance, title-size for category totals, body-size for feed items.

**The Mono Lock Rule.** Currency values always render in Geist Mono with `tabular-nums`. A humanist-sans amount in a feed row breaks the visual language that separates "data" from "description".

## 4. Elevation

The system uses a hybrid approach: most surfaces are flat and separated by tonal background steps, with two distinct shadow levels reserved for elevated elements. Shadows are always green-tinted (using `rgba(0,53,46, ...)`) rather than neutral gray, which ties them to the brand palette and prevents the "generic app shadow" read.

### Shadow Vocabulary
- **Ambient Surface** (`0 2px 16px rgba(0,53,46,0.06)`): White cards (SpendStrip, ExpenseFeed) sitting on the sage-white background. Barely perceptible; purely separating, not lifting.
- **Hero Depth** (`0 20px 56px rgba(0,40,32,0.28), 0 4px 16px rgba(0,53,46,0.14)`): The balance card only. Announces it as the primary focal point of the screen.
- **Sheet Lift** (`0 -8px 48px rgba(0,53,46,0.12)`): The Smart Entry bottom sheet. Directional — rises from below, suggesting the sheet is emerging above the page.
- **Segment Lift** (`0 2px 8px rgba(0,53,46,0.10)`): The selected tab in a mode toggle. Lifts the active segment slightly above its container.

**The Tinted Shadow Rule.** All shadows use `rgba(0,53,46, ...)` as the shadow color. Never `rgba(0,0,0, ...)` or any neutral gray. A gray shadow breaks the palette cohesion and makes elements read as belonging to a different system.

**The One Hero Rule.** Only one element per screen earns the Hero Depth shadow. It is currently the balance card. Adding Hero Depth to any other element dilutes the hierarchy. If a new screen needs a prominent element, Ambient Surface is the ceiling for all non-hero cards.

## 5. Components

### Buttons
Soft-premium shape: generously rounded (16px radius), no borders on primary, subtle ghost on secondary. Primary uses a diagonal gradient — deep teal to forest green — that implies depth and momentum.

- **Shape:** Softly rounded (16px). Pills (9999px) for inline chips and action buttons within cards.
- **Primary:** Forest gradient (`linear-gradient(135deg, #1f695d 0%, #00352e 100%)`), white text (700 weight), 16px vertical padding. Scale to 0.97 on tap.
- **Primary Hover / Focus:** Gradient brightens 4–5% (`#24796b → #004036`). Focus visible ring: `2px solid #1f695d` with `2px offset`.
- **Ghost:** `#f0f4f2` background, `#6e9990` text. No border. For destructive-adjacent actions (Discard) where deprioritization is the goal.
- **Small pill (inline):** `rgba(31,105,93,0.10)` background with `1px solid rgba(31,105,93,0.20)` border for accent pills; `#f0f4f2` with `1px solid #e7edeb` for neutral suggestion chips. Pill radius, 4px vertical padding.

### Chips / Category Pills
Used in the expense feed, spend strip, and Smart Entry merchant suggestions.

- **Style:** Pill radius (9999px), 4px vertical / 10–12px horizontal padding.
- **Category variant:** `rgba([category-hex], 0.10)` background, color dot at 6px circle, `#3f4946` text, monospaced amount in category color.
- **Suggestion variant:** `#f0f4f2` / `1px solid #e7edeb` for neutral; accent-tinted background / border for fuzzy-matched corrections.

### Cards / Containers
Two distinct card types. Never mix them on the same screen at the same elevation level.

- **Surface Card:** White (`#ffffff`) background, 16px radius, Ambient Surface shadow (`0 2px 16px rgba(0,53,46,0.06)`). Used for all data panels (SpendStrip, ExpenseFeed). Internal padding: 20px horizontal, 16px vertical. Section headers use Label typography.
- **Hero Card:** Forest gradient background, 24px radius, Hero Depth shadow. White text throughout. Internal padding: 24px. One per screen — the balance card.
- **Border behavior:** Surface cards use no explicit border; ambient shadow provides the edge. Dividers between rows use `1px solid #f7f9f8` (one step lighter than surface-low). No colored left-border stripes, ever.

### Inputs / Entry Field
The Smart Entry textarea is the core input — large, bare, and deliberately open.

- **Style:** `bg-transparent`, no border, no shadow. Text at 1.6rem / font-light — the large size communicates that natural language is welcome.
- **Caret:** Accent teal (`#1f695d`) caret color to ground the typing area in the brand.
- **Placeholder:** Cycles between example phrases. Uses `#6e9990` (muted) at reduced opacity.
- **Focus:** No focus ring on the textarea itself (the field IS the focus). Parse preview appears below as confirmation of receipt.

### Mode Toggle (Segmented Control)
- **Container:** `#f0f4f2` background, 12px padding, rounded-xl (12px radius).
- **Selected segment:** White background, `0 2px 8px rgba(0,53,46,0.10)` shadow, `#00352e` text, rounded-lg (8px).
- **Unselected:** Transparent background, `#6e9990` text.
- **Transition:** Instant swap via inline style; no CSS animation needed at this scale.

### Bottom Navigation
Fixed bottom, safe-area aware. Three to four items max.

- **Background:** `#f8faf9` (matches page bg) with top border at `#cde0db` or a faint shadow.
- **Active state:** Accent-teal icon + label, possible tonal pill background.
- **Inactive:** `#6e9990` icon, no label or muted label.

### Smart Entry Sheet (Signature Component)
The app's signature surface — a bottom sheet that slides up from below via spring animation.

- **Background:** `rgba(248,250,249,0.96)` + `backdrop-filter: blur(24px)`. Semi-transparent frosted glass is deliberately used here (not decorative glassmorphism — it reinforces the "overlay above the world" metaphor and the opacity keeps the content legible).
- **Drag handle:** 40px wide, 4px tall, pill radius, `#cde0db` color.
- **Radius:** `rounded-t-3xl` (24px on top corners only).
- **Motion:** Spring enter from `y: 100%` (stiffness 280, damping 30). Instant backdrop fade (0.18s).

## 6. Do's and Don'ts

### Do:
- **Do** use green-tinted shadows (`rgba(0,53,46, ...)`) for all box-shadows. Never neutral gray.
- **Do** render all currency values in Geist Mono with `tabular-nums` and `font-bold`.
- **Do** animate with spring physics (Framer Motion `type: 'spring'`). Easing curves are acceptable for simple opacity fades; spring physics for everything that moves spatially.
- **Do** use the tonal surface ramp (`bg → surface-low → surface → surface-high`) to convey depth before reaching for shadows.
- **Do** keep the hero balance card as the sole bearer of the Hero Depth shadow. One per screen.
- **Do** use `backdrop-filter: blur` on the Smart Entry sheet as a purposeful overlay metaphor — this is the one legitimate use of blur in the system.
- **Do** assign category colors semantically (`#e05c2a` for restaurants, `#0284c7` for transport, etc.). These are a fixed vocabulary; don't reassign them.
- **Do** support `@media (prefers-reduced-motion: reduce)` on all Framer Motion animations. Crossfade or instant transition is the fallback — never just removing the interaction entirely.

### Don't:
- **Don't** use navy, gold, or any warm-neutral (sand, cream, linen, parchment) backgrounds. This is a green-hue system; importing a warm-neutral reads as generic fintech.
- **Don't** use neon accents, glowing shadows, or dark-mode electric color. LedgeIt should feel calm and permanent, not volatile.
- **Don't** build screens with more than one chart type visible simultaneously. Overwhelming dashboards are an explicit anti-reference; if data complexity demands it, put it on a dedicated Insights screen.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items. Full borders, background tints, or leading icons are the correct alternatives.
- **Don't** apply `background-clip: text` with a gradient for decorative headings. Single solid color only; emphasis via weight.
- **Don't** use glassmorphism (`backdrop-filter: blur`) on cards or panels other than the Smart Entry sheet. That blur earns its place as an overlay metaphor; applying it to ambient card surfaces turns it decorative.
- **Don't** repeat the Label eyebrow pattern (`UPPERCASE · TRACKED`) more than once per card. One section header per surface; more than that is AI scaffolding.
- **Don't** use the Hero Depth shadow (`0 20px 56px rgba(0,40,32,0.28)`) on anything other than the balance hero card. Its rarity is the point.
- **Don't** render amounts, balances, or any numeric financial data in Plus Jakarta Sans. Geist Mono is the precision signal; humanist-sans numbers break it.
- **Don't** animate layout properties (width, height, margin, padding). Animate `transform` and `opacity` only, with GPU-composited filters where justified.
