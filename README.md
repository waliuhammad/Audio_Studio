# Audio Studio — Step 1

This is **Step 1** of the Audio Studio frontend build: project setup,
design system, Navbar, and Hero.

## What's included in this step

- Next.js 14 (App Router) + TypeScript + Tailwind, fully configured
- Design tokens (colors, fonts, radii, animation) in `tailwind.config.ts`
- Dark/light theme via `next-themes`, toggle in the navbar, persisted
  and respects OS preference
- Sticky, responsive `Navbar` with a mobile drawer (`MobileMenu`)
- `Hero` section with an original animated waveform visual
  (`WaveformSignature`) — pure CSS/SVG + Framer Motion, no stock assets
- Reduced-motion support, visible focus states, semantic landmarks

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Project structure

```
app/
  layout.tsx        Root layout, fonts, theme provider
  page.tsx           Home page (assembles sections)
  globals.css         Base styles, focus states, reduced motion
components/
  navbar/             Navbar, Logo, ThemeToggle, MobileMenu
  hero/                Hero, WaveformSignature, IntroStrip
  providers/           ThemeProvider (wraps next-themes)
lib/
  navigation.ts        Shared nav link data
  utils.ts              cn() classname helper
```

## Coming in the next steps

- Step 2: Tools section (grid, filtering, search) + tool card data
- Step 3: Audio Editor Preview (waveform, timeline, transport controls)
- Step 4: Reusable Tool Workspace layout (upload → editor → export)
- Step 5: Individual tool interfaces (Trimmer, Splitter, Merger, etc.)

Each step will ship as its own zip so you can copy files in incrementally
without re-pasting the whole project.
