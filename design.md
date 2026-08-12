# Audio Studio — Design System

Documentation of the current design language, token palette, and component conventions used across the project.

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18
- **Styling**: Tailwind CSS 3.4 (JIT), custom Tailwind config tokens
- **Dark mode**: Class-based (`darkMode: "class"`) via `next-themes`
- **Icons**: `lucide-react` (stroke-based, thin)
- **Motion**: `framer-motion`
- **Utilities**: `clsx` + `tailwind-merge` wrapped in `cn()` helper (`lib/utils.ts`)

## Design Language

**Direction**: Technical audio-studio aesthetic — dark, calm, precise. Amber is the single dominant accent used for interaction, highlights, and brand energy. Surfaces are warm-tinted; typography mixes a geometric display face with mono micro-labels to give an "instrument/studio console" feel.

**Core principles observed**:
- One primary accent (amber); teal and coral exist as tokens but are unused in the current UI.
- Soft, ambient amber glows (blurred radial blobs) behind key sections.
- Micro-label typography: small uppercase mono text with wide letter-spacing for eyebrows, statuses, and metadata.
- Rounded corners everywhere; pills (rounded-full) for primary CTAs, `rounded-xl` for cards, `rounded-2xl` for steps.
- Every interactive element has a `transition-all duration-200/300` with hover elevation (`-translate-y-*` + shadow) and amber hover color.

## Color Palette (Tailwind tokens)

Defined in `tailwind.config.ts` under `theme.extend.colors`.

### Surfaces — Dark mode (default)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0B0E14` | Page background |
| `ink-soft` | `#0F1420` | (unused) |
| `ink-surface` | `#131826` | Cards / raised panels |
| `ink-raised` | `#1A2030` | Hover state of cards |
| `ink-border` | `#242B3D` | Borders in dark mode |

### Surfaces — Light mode

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FBFAF8` | Page background |
| `paper-soft` | `#F3F1EC` | (unused) |
| `paper-surface` | `#FFFFFF` | Cards |
| `paper-raised` | `#F7F5F0` | Hover state of cards |
| `paper-border` | `#E4E1D8` | Borders in light mode |

### Text

| Token | Hex | Use |
|---|---|---|
| `mist` (dark text) | `#EDEFF3` | Headings on dark bg |
| `mist-muted` | `#8A93A6` | Body text on dark bg |
| `mist-faint` | `#5B6478` | Small labels / placeholders on dark bg |
| `graphite` (light text) | `#171A21` | Headings on light bg |
| `graphite-muted` | `#5C6270` | Body text on light bg |
| `graphite-faint` | `#8C90A0` | Small labels / placeholders on light bg |

### Accents

| Token | Hex | Use |
|---|---|---|
| `amber` | `#F2A65A` | Primary accent — CTAs, icons, highlights, focus ring, selection |
| `amber-soft` | `#F7C592` | (unused) |
| `amber-strong` | `#E0863A` | Hover text accents |
| `teal` / `teal-soft` / `teal-strong` | `#5FD9C2` / `#9AEADC` / `#33B79E` | Reserved secondary accent (unused) |
| `coral` | `#EF6F6C` | Reserved error/alert accent (unused) |

**Gradient (logo only)**: custom 5-stop linear gradient `#f59e0b → #f97316 → #ec4899 → #a855f7 → #38bdf8` used for the waveform logo dots.

## Typography

Fonts loaded via `next/font/google` in `app/layout.tsx` and mapped to Tailwind font families:

| Family | Font | Weights | CSS var | Tailwind class |
|---|---|---|---|---|
| Display | Space Grotesk | 500, 600, 700 | `--font-display` | `font-display` |
| Body | Inter | 400, 500, 600 | `--font-body` | `font-body` |
| Mono | IBM Plex Mono | 400, 500 | `--font-mono` | `font-mono` |

### Type patterns

- **Headings** (`h1/h2`): `font-display font-semibold tracking-[-0.035em] leading-[1.05]`; Hero uses tighter `leading-[0.96]` and `tracking-[-0.045em]`.
- **Hero heading size**: `text-[2.75rem]` → `text-5xl` (sm) → `text-6xl` (md) → `lg:text-[4.35rem]`.
- **Section headings**: `text-[1.9rem]` → `text-4xl` (sm) → `text-5xl` (lg).
- **Eyebrow / section kicker**: `font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-amber`, often preceded by a short amber rule (`h-px w-5 sm:w-6 bg-amber`).
- **Micro labels**: `font-mono text-[7px]–[10px] uppercase tracking-[0.12em]–[0.25em]`, colored `*-faint` or `*-muted`, used for statuses, step numbers, badges, and timestamps.
- **Body copy**: `text-graphite-muted dark:text-mist-muted`, sizes `text-[11px]` → `text-sm` → `text-base`.
- Light-mode text is specified per-element with `text-graphite*`; dark-mode with `dark:text-mist*`.

## Radius

| Token | Value | Use |
|---|---|---|
| `rounded-full` | pill | Primary CTAs, theme toggle, icon buttons, social icons |
| `rounded-xl` | 12px (default) | Cards, search, step icons |
| `rounded-2xl` | 16px | How-it-works step cards |
| `rounded-[14px]`–`[25px]` | custom | Footer logo, navbar container |
| `xl2` (config) | 1.25rem | Reserved (unused) |

## Shadows

- **Buttons (amber)**: `shadow-[0_6px_20px_rgba(245,158,11,0.18)]`, hover `0_10px_28px_rgba(245,158,11,0.30)`.
- **Navbar**: `shadow-[0_18px_55px_rgba(0,0,0,0.10)]` (scrolled) / `0_10px_35px_rgba(0,0,0,0.07)`; dark mode `0.35` / `0.25`.
- **Cards on hover**: `hover:shadow-sm` (tool cards) or `hover:shadow-lg` with `shadow-ink/5` (light) / `shadow-black/20` (dark).
- **Glass chips (hero visual)**: `bg-paper/80 dark:bg-ink/80 backdrop-blur-xl shadow-lg`.
- **Theme toggle knob**: `shadow-[0_3px_12px_rgba(245,158,11,0.25)]`.

## Background Glows (config)

Utility classes generated in `tailwind.config.ts` → `theme.extend.backgroundImage`:

- `bg-glow-amber`: `radial-gradient(60% 60% at 50% 40%, rgba(242,166,90,0.20) 0%, transparent 70%)`
- `bg-glow-teal`: same shape with teal at `0.16` (reserved/unused)

In practice, glows are hand-rolled blobs: `absolute rounded-full bg-amber/[0.03–0.1] blur-[90–100px]` behind hero, navbar top, and footer top.

## Animations

### Config keyframes (`tailwind.config.ts`)

| Name | Behavior | Utility |
|---|---|---|
| `fade-up` | opacity 0→1, translateY 12→0, `0.6s cubic-bezier(0.16,1,0.3,1)` | `animate-fade-up` |
| `drift` | translateY 0→-6 over 6s infinite | `animate-drift` |
| `waveform-breathe` | scaleY 0.4→1→0.4 | (reserved, unused utility) |

### Framer Motion conventions

- **Signature ease**: `ease: [0.16, 1, 0.3, 1]` (cubic-bezier) used for all entrance animations.
- **Entrance**: `initial {opacity: 0, y: 10–14}` → `animate/whileInView {opacity: 1, y: 0}`, durations 0.4–0.7s, staggered by `index * 0.07–0.08`.
- **Viewport reveal**: `whileInView` with `viewport={{ once: true, amount: 0.2–0.25 }}`.
- **Reduced motion**: Hero uses `useReducedMotion()` and skips animations.
- **Ambient loops**: rotating signal ring (50s linear), pulsing headphone ring, animated waveform bars, animated progress bar, volume meter bars.

### CSS transitions

- Standard: `transition-all duration-200` (fast, small elements) / `duration-300` (cards, nav).
- Hover icon micro-movement: `group-hover:-translate-y-0.5` / `group-hover:translate-x-0.5`.

## Component Style Guide

### Layout & container

- Global container: `.container-studio` (`app/globals.css`) → `mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10`.
- Navbar uses its own wider `max-w-[1320px]`.
- Anchor sections (`#tools`, `#pricing`, `#faq`) use `scroll-mt-24 sm:scroll-mt-28 lg:scroll-mt-32` for sticky-nav offset.
- Vertical rhythm: sections use `py-14 sm:py-18/20 lg:py-20/24`.

### Buttons & CTAs

**Primary (amber pill)**:
```
inline-flex min-h-12 items-center justify-center gap-2/3 rounded-full border border-amber/40
bg-amber px-6 py-3 text-sm font-semibold text-ink
transition-all duration-300 hover:-translate-y-0.5 hover:gap-4 hover:border-amber hover:shadow-amber-glow
active:translate-y-0 active:scale-[0.98]
```
Glow shadow: `hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]`.

**Secondary (ghost)**: no bg, `text-graphite-muted hover:text-amber`, optional `font-mono` suffix detail (e.g. "18 tools").

**Outline**: `rounded-full border border-paper-border dark:border-ink-border text-graphite dark:text-mist hover:text-amber`.

**Shine effect (Open Editor button)**: absolutely positioned `-skew-x-12 bg-white/35` bar that sweeps across on hover (`group-hover:left-[130%]`).

### Navbar

- Sticky floating pill: outer padding `px-2.5 pt-3 sm:px-4 sm:pt-4 lg:px-5 lg:pt-5`, inner `rounded-[21–25px] border backdrop-blur-xl bg-paper/92 dark:bg-ink/92 min-h-[66–76px]`.
- Amber glow blob centered above (`bg-amber/20 blur-3xl`), plus a 1px amber top highlight line.
- Nav items: icon-over-label layout, `text-[9–10px]`, hover `bg-amber/10 text-amber`.
- Divider `h-10 w-px` between logo and nav.
- **Theme toggle**: pill segmented control (`w-[104–112px]`) with sliding amber knob, sun/moon icons, and "Light/Dark" label.

### Cards

**Tool card** (`ToolCard.tsx`):
```
group flex min-h-[118px] flex-col justify-between rounded-xl border border-paper-border
bg-paper-surface px-3.5 py-3.5 dark:bg-ink-surface
transition-all duration-200 hover:-translate-y-0.5 hover:border-amber/50 hover:bg-paper-raised
dark:hover:bg-ink-raised
```
- Icon tile: `h-11–14 w-11–14 rounded-xl border border-amber/20 bg-amber/10 text-amber`.
- Arrow chip: `h-7 w-7 rounded-full` that fills amber on hover (`group-hover:bg-amber group-hover:text-ink`).
- Featured cards: `border-amber/30`. Badges: `font-mono text-[8–9px] uppercase tracking-wider text-amber`.

**How-it-works step**: `h-[170–180px] rounded-2xl` card, hover `-translate-y-1 hover:border-amber/40 hover:shadow-lg`, step number `font-mono text-[9–10px]` top-right.

**Pricing card**: `rounded-xl min-h-[433px]`; popular plan uses `border-amber/45 bg-amber/[0.035]` + "Popular" pill badge. Price `font-display text-3xl tracking-[-0.04em]`. Divider `h-px my-4`.

### Forms

- Search input: `h-11 rounded-xl border border-paper-border bg-paper-surface/50 pl-10` with lucide icon absolutely positioned; `focus:border-amber`. On `sm+` it becomes an underline-only input (`border-x-0 border-t-0 rounded-none bg-transparent`).
- Footer email: bordered wrapper `h-11 rounded-xl flex items-center` with icon + transparent input; `focus-within:border-amber`.

### FAQ

- Rows separated by `border-b border-paper-border`. Question button `py-4 sm:py-5`, with `font-mono` number (`01`, `02`…) on the left.
- Plus icon in a `h-8 w-8 rounded-full border` circle that flips to `bg-amber text-ink rotate-45` when open.
- Answer reveal: CSS grid rows `grid-rows-[0fr]` → `grid-rows-[1fr]` with opacity transition.

### Footer

- `border-t border-paper-border` with a centered amber glow above.
- Grid `lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr]`.
- Logo: `h-11–12 w-11–12 rounded-[14px] border-amber/30 bg-amber/10` with waveform line accent; wordmark is italic `font-display`.
- Column headings: `text-sm font-semibold`. Link hover shows `ArrowUpRight` icon sliding out.
- Bottom bar: copyright, social icon circles (`h-8 w-8 rounded-full border` filling amber on hover), and tagline with amber dot.

### Hero visual (AudioHeroVisual)

- Concentric circles: outer rotating signal ring (`h-[300px]` border-amber/50), main technical circle (`h-[270px]`), inner glass console (`h-[220px] bg-paper/90 dark:bg-ink/85 backdrop-blur-xl`).
- Central console: `inset-9 rounded-full border-amber/20 bg-ink` with pulsing headphone icon.
- Animated waveform: 40 amber bars with scaleY/opacity keyframes, per-bar duration `2.2 + (index % 5) * 0.12`.
- Floating glass chips: "Current track" (with progress bar) and volume meter; mono micro-labels ("Live", "Signal active", "AS / 01", "44.1 kHz").

## Accessibility & Base Styling (`app/globals.css`)

- `html { scroll-behavior: smooth }`, disabled under `prefers-reduced-motion`.
- Global reduced-motion override forces animation/transition durations to `0.01ms`.
- Body: `bg-paper text-graphite font-body antialiased dark:bg-ink dark:text-mist`, plus `text-rendering: optimizeLegibility`.
- `:focus-visible` → 2px amber outline, 3px offset.
- `::selection` → amber bg, ink text.
- Custom scrollbar (10px, rounded gray thumb, transparent track).
- Accessible markup throughout: `aria-labelledby` on sections, `aria-expanded`/`aria-pressed`, `sr-only` labels, `aria-hidden` on decorative elements.

## Motion & Easing Tokens

| Token | Value | Where |
|---|---|---|
| Ease out (signature) | `[0.16, 1, 0.3, 1]` | All entrances, mobile menu |
| Durations | 0.2s / 0.3s | CSS transitions |
| Entrance durations | 0.4–0.7s | Framer motion |
| Stagger | `index * 0.07–0.08` | Cards/steps |
| Infinite loops | 50s (ring), 2.2s (pulse), 2.2–2.9s (waveform), 4s (progress) | Hero visual |

## Conventions to Follow When Building

1. Use `cn()` from `lib/utils.ts` for conditional class merging.
2. Write every color with a `text-*` light value + `dark:text-*` pairing (e.g. `text-graphite dark:text-mist`).
3. Amber is the only accent to apply to new UI; keep teal/coral as reserved.
4. Use `font-display` for headings, `font-body` for prose, `font-mono` for labels/badges/numbers.
5. Add the amber hairline rule (`h-px w-5/6 bg-amber`) before every section eyebrow.
6. Cards: `rounded-xl`, `border`, `bg-paper-surface dark:bg-ink-surface`, hover `-translate-y-0.5` + amber border.
7. Primary CTAs are amber pills with `text-ink` and an amber glow shadow; never use amber as text on amber.
8. Sections use `container-studio`; anchor sections add `scroll-mt-*`.
9. Apply `transition-all duration-200/300` to any interactive element.
10. Respect reduced motion (framer-motion `useReducedMotion` / global CSS).