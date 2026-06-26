# Design System: Rosely

## 1. Visual Theme & Atmosphere

Rosely is a warm, serene, and contemporary design system rooted in the "Millennial Pink" aesthetic. It prioritizes a **low-contrast, eye-comfortable ambiance** that induces calmness and serenity. The system is designed to be mindful and reassuring, avoiding high-contrast fatigue while maintaining enough vibrancy to be playful and optimistic. It emphasizes clarity, simplicity, and elegance, creating a "serene beauty" that works well across digital interfaces.

### Implementation Stack

| Layer             | Technology                                  | Notes                                                                                       |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| CSS Framework     | **Tailwind CSS v4**                         | CSS-first configuration via `@import "tailwindcss"` and `@theme inline {}` in `globals.css` |
| Component Library | **shadcn/ui (Base UI variant)**             | Open-code components installed via CLI into `src/components/ui/`                            |
| Icons             | **Lucide React**                            | Consistent stroke-based icon set                                                            |
| Charts            | **Recharts**                                | Composable chart components for dashboard visualisations                                    |
| Fonts             | **Noto Sans / Noto Serif / Noto Sans Mono** | Via `next/font` for automatic self-hosting and optimisation                                 |

For implementation-level colour token mappings and Tailwind utility examples, see [styling.instructions.md](.github/instructions/styling.instructions.md).

## 2. Colour Palette & Roles

The Rosely palette consists of sixteen core colours divided into four functional sub-palettes. All colours are defined as CSS custom properties (`--rosely0` through `--rosely15`) in `src/app/globals.css` and exposed as Tailwind utilities via `@theme inline {}`.

### Greys (Neutrality & Foundation)

Used for backgrounds, text, and structural elements where neutral grounding is needed.

| Swatch | Name          | Hex       | CSS Variable | Tailwind Token | Typical Use                      |
| ------ | ------------- | --------- | ------------ | -------------- | -------------------------------- |
|        | White         | `#ffffff` | —            | `white`        | Main content & card backgrounds  |
|        | Black Beauty  | `#27272a` | `--rosely0`  | `rosely-night` | Primary text, headings           |
|        | Granite Gray  | `#615f5f` | `--rosely1`  | `rosely-dusk`  | Secondary text, labels           |
|        | Opal Gray     | `#a49e9e` | `--rosely3`  | `rosely-mist`  | Placeholder, captions            |
|        | Sugar Swizzle | `#f4eee8` | `--rosely6`  | `rosely-cream` | Sidebar/header chrome, muted bg  |

### Pinks (Gentle Romance & Warmth)

The soul of the system, tempering passion with purity.

| Swatch | Name          | Hex       | CSS Variable | Tailwind Token    | Typical Use                |
| ------ | ------------- | --------- | ------------ | ----------------- | -------------------------- |
|        | Morning Glory | `#ec809e` | `--rosely12` | `rosely-flamingo` | Warning, accent highlights |
|        | Rose Quartz   | `#f7caca` | `--rosely4`  | `rosely-blush`    | Borders, dividers          |
|        | Heavenly Pink | `#f4dede` | `--rosely5`  | `rosely-petal`    | Hover backgrounds          |

### Purples (Depth & Harmony)

Used for accents, borders, and alternate backgrounds to complement the pinks.

| Swatch | Name           | Hex       | CSS Variable | Tailwind Token | Typical Use                  |
| ------ | -------------- | --------- | ------------ | -------------- | ---------------------------- |
|        | Grapeade       | `#85677b` | `--rosely2`  | `rosely-mauve` | Accent text, emphasis        |
|        | Radiant Orchid | `#b565a7` | `--rosely10` | `rosely-plum`  | Strong purple accent         |
|        | Lupine         | `#be9cc1` | `--rosely8`  | `rosely-lilac` | Hover borders, active states |
|        | Dusty Rose     | `#b0879b` | `--rosely9`  | `rosely-dusty` | Dusty rose accent            |

### Functional (Positivity & Precision)

Semantic colours used for status indicators, alerts, and health reporting.

| Swatch | Name             | Hex       | CSS Variable | Tailwind Token      | Semantic Role                |
| ------ | ---------------- | --------- | ------------ | ------------------- | ---------------------------- |
|        | Raspberry Sorbet | `#d2386c` | `--rosely11` | `rosely-rose`       | Error, critical, end-of-life |
|        | Spearmint        | `#64bfa4` | `--rosely14` | `rosely-teal`       | Success, good health         |
|        | Periwinkle       | `#93a9d1` | `--rosely7`  | `rosely-periwinkle` | Info, neutral accent         |
|        | Meadowlark       | `#eada4f` | `--rosely13` | `rosely-golden`     | Warning, at-risk             |
|        | Cornflower       | `#919bc9` | `--rosely15` | `rosely-cornflower` | Blue accent                  |

### Usage Rules

- **Always use Rosely tokens** — never raw hex values or arbitrary Tailwind values like `text-[#27272a]`
- **Dark mode** — implemented via `next-themes` with `attribute="class"`. The `.dark` class on `<html>` activates dark mode tokens in `globals.css`
- **Opacity modifiers** — use Tailwind's `/` syntax for transparent variants (e.g., `bg-rosely-teal/20`)
- **Contrast (WCAG AA)** — all text must meet 4.5:1 contrast ratio against its background (3:1 for large/bold text). Do not use palette colours directly as text on white/dark backgrounds unless they pass AA. Use semantic tokens (`text-gain`, `text-loss`, `text-success`, `text-warning`) for financial and status values — these auto-adapt between light and dark mode

## 3. Typography

| Role     | Font Family                 | Tailwind Class | Usage                                                           |
| -------- | --------------------------- | -------------- | --------------------------------------------------------------- |
| Body     | "Noto Sans", sans-serif     | `font-sans`    | All body text, UI labels, navigation                            |
| Headings | "Noto Serif", serif         | `font-serif`   | Page titles, section headings (styled with `text-rosely-night`) |
| Code     | "Noto Sans Mono", monospace | `font-mono`    | Technical data, code snippets, IDs                              |

Fonts are loaded via `next/font/google` in `src/app/layout.tsx` for automatic self-hosting, eliminating external network requests and improving performance.

### Heading Scale

| Level    | Tailwind Classes                          | Usage                           |
| -------- | ----------------------------------------- | ------------------------------- |
| H1       | `text-2xl font-bold text-rosely-night`    | Page titles                     |
| H2       | `text-xl font-semibold text-rosely-night` | Section headings                |
| H3       | `text-lg font-medium text-rosely-night`   | Subsection headings             |
| Subtitle | `text-sm text-muted-foreground`             | Descriptive text below headings |

## 4. Component Architecture: shadcn/ui

VantageMap uses **shadcn/ui (Base UI variant)** as its component library. shadcn/ui is not a traditional npm dependency — components are installed as source code into `src/components/ui/` via the CLI, giving full ownership and customisation control.

### Why shadcn/ui

| Factor              | Benefit                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Open code**       | Components live in your codebase — modify, extend, or delete freely                                      |
| **AI-ready**        | Consistent API and open source code makes it easy for AI agents to read, generate, and modify components |
| **Tailwind-native** | Built on Tailwind CSS utilities; aligns with our existing styling approach                               |
| **Accessible**      | Components follow WAI-ARIA patterns with keyboard navigation and screen reader support                   |
| **Composable**      | Shared composable interface across all components — predictable for both developers and LLMs             |
| **Base UI variant** | Uses Base UI (formerly MUI Base) primitives for unstyled, accessible foundations                         |

### Installation

```bash
# Initialise shadcn/ui in the project (one-time setup)
npx shadcn@latest init

# Add individual components as needed
npx shadcn@latest add button card dialog table tabs
```

### Component Organisation

```
src/components/
  ui/                    # shadcn/ui base components (auto-generated, then customised)
    button.tsx
    card.tsx
    dialog.tsx
    table.tsx
    tabs.tsx
    ...
  Sidebar.tsx            # App-specific composed components
  HealthIndicator.tsx
  StatusBadge.tsx
  LifecycleTag.tsx
  ...
```

### Theming shadcn/ui with Rosely

shadcn/ui uses CSS custom properties for theming. Map Rosely tokens to shadcn/ui's expected variables in `globals.css`:

```css
:root {
  --background: #ffffff;           /* White — clean main content area */
  --foreground: var(--rosely0);    /* Black Beauty — primary text */
  --card: #ffffff;                 /* White cards for clean look */
  --card-foreground: var(--rosely0);
  --popover: #ffffff;
  --popover-foreground: var(--rosely0);
  --primary: #a855a0;            /* Radiant Orchid (darkened for AA) — buttons, interactive, links (4.69:1 on white) */
  --primary-foreground: #ffffff;   /* White text on orchid buttons */
  --secondary: var(--rosely4);     /* Rose Quartz — secondary buttons/dropdowns */
  --secondary-foreground: var(--rosely0);
  --muted: var(--rosely6);         /* Sugar Swizzle — muted backgrounds only */
  --muted-foreground: var(--rosely1); /* Granite Gray — readable secondary text */
  --accent: var(--rosely5);        /* Heavenly Pink — hover states */
  --accent-foreground: var(--rosely0);
  --destructive: var(--rosely11);  /* Raspberry Sorbet — errors */
  --border: var(--rosely4);        /* Rose Quartz — borders */
  --input: var(--rosely4);
  --ring: var(--rosely8);          /* Lupine — focus ring */

  /* Financial status — WCAG AA 4.5:1 on white */
  --success: #18815e;              /* Dark teal */
  --warning: #826f16;              /* Dark gold */
  --gain: #18815e;                 /* Dark teal (positive values) */
  --loss: var(--rosely11);         /* Raspberry Sorbet (negative values) */

  color-scheme: light;
}

.dark {
  --background: #1a1a1d;           /* Very dark — main content */
  --foreground: var(--rosely6);
  --card: var(--rosely0);
  --card-foreground: var(--rosely6);
  --popover: var(--rosely0);
  --popover-foreground: var(--rosely6);
  --primary: var(--rosely12);      /* Morning Glory — dark pink buttons */
  --primary-foreground: var(--rosely0);
  --secondary: var(--rosely9);     /* Dusty Rose — secondary interactive */
  --secondary-foreground: var(--rosely6);
  --muted: var(--rosely1);
  --muted-foreground: var(--rosely3);
  --accent: var(--rosely9);        /* Dusty Rose — hover */
  --accent-foreground: var(--rosely6);
  --destructive: var(--rosely12);  /* Morning Glory — brighter for dark bg contrast */
  --border: var(--rosely1);
  --input: var(--rosely1);
  --ring: var(--rosely8);

  /* Financial status — originals pass AA on dark backgrounds */
  --success: var(--rosely14);      /* Spearmint */
  --warning: var(--rosely13);      /* Meadowlark */
  --gain: var(--rosely14);         /* Spearmint */
  --loss: var(--rosely12);         /* Morning Glory */

  color-scheme: dark;
}
```

### Background Usage Guidelines

| Surface | Light Mode | Dark Mode | Token |
|---------|------------|-----------|-------|
| Main content area | White `#ffffff` | Very dark `#1a1a1d` | `bg-background` |
| Cards & panels | White `#ffffff` | Black Beauty | `bg-card` |
| Sidebar & header (chrome) | Sidebar: Rose Quartz, Header: Sugar Swizzle | Black Beauty | Sidebar: `bg-rosely-blush` / Header: `bg-rosely-cream`, both `dark:bg-rosely-night` |
| Buttons & interactive | Radiant Orchid `#a855a0` | Morning Glory | `bg-primary` |
| Dropdowns & selects | Rose Quartz | Dusty Rose | `bg-secondary` |
| Muted/subtle areas | Sugar Swizzle | Granite Gray | `bg-muted` |

> **Rule:** Sugar Swizzle (`rosely-cream`) is reserved for header chrome and muted backgrounds. Rose Quartz (`rosely-blush`) is used for the sidebar. Main content and cards use pure white for a clean, modern feel. Sidebar nav items use `text-foreground` (not `text-muted-foreground`) to maintain WCAG AA contrast against the Rose Quartz background.

### Usage Examples

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Primary button with Rosely theming applied automatically
<Button>Save Changes</Button>

// Card with Rosely colours via CSS variable mapping
<Card>
  <CardHeader>
    <CardTitle>Application Portfolio</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">12 applications across 5 capabilities</p>
  </CardContent>
</Card>

// Direct Rosely token usage alongside shadcn/ui
<Button variant="outline" className="border-rosely-lilac hover:bg-rosely-petal">
  Custom Styled
</Button>
```

## 5. Layout & Spacing

### Page Layout

```
┌─────────────────────────────────────────────────┐
│ <html>                                          │
│ ┌───────┬─────────────────────────────────────┐ │
│ │       │ <main>                              │ │
│ │ Side  │   p-6 max-w-7xl mx-auto             │ │
│ │ bar   │   space-y-6                         │ │
│ │       │                                     │ │
│ │ 240px │   ┌─────────────────────────────┐   │ │
│ │       │   │ Page content                │   │ │
│ │       │   └─────────────────────────────┘   │ │
│ │       │                                     │ │
│ └───────┴─────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Spacing System

| Pattern         | Tailwind Classes                                       | Usage                                   |
| --------------- | ------------------------------------------------------ | --------------------------------------- |
| Page padding    | `p-6`                                                  | All page containers                     |
| Max width       | `max-w-7xl mx-auto`                                    | Content area constraint                 |
| Vertical rhythm | `space-y-6`                                            | Between page sections                   |
| Card grid       | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` | Dashboard cards, entity grids           |
| Inline spacing  | `gap-2` or `gap-3`                                     | Between inline elements (badges, icons) |

### Common Patterns

**Card / panel:**

```tsx
<div className="bg-white rounded-xl border border-rosely-blush p-5 hover:border-rosely-lilac hover:shadow-sm transition-all">
```

**Section heading:**

```tsx
<h1 className="text-2xl font-bold text-rosely-night">Title</h1>
<p className="text-sm text-muted-foreground mt-1">Subtitle</p>
```

**Status badge:**

```tsx
<span className="inline-flex items-center rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
  Active
</span>
```

## 6. Financial & Status Colours

Use **semantic tokens** for financial values and status indicators — never raw palette tokens. These adapt automatically between light and dark mode to maintain WCAG AA contrast.

### Financial Values

| Meaning        | Text Token     | Background         | Light Mode  | Dark Mode   |
| -------------- | -------------- | ------------------ | ----------- | ----------- |
| Gain / profit  | `text-gain`    | `bg-gain/20`       | `#18815e`   | `#64bfa4`   |
| Loss / deficit | `text-loss`    | `bg-loss/20`       | `#d2386c`   | `#ec809e`   |
| Success        | `text-success` | `bg-success/20`    | `#18815e`   | `#64bfa4`   |
| Warning        | `text-warning` | `bg-warning/20`    | `#826f16`   | `#eada4f`   |
| Error          | `text-destructive` | `bg-destructive/10` | `#d2386c` | `#ec809e` |

### Usage Pattern

```tsx
// Financial gain/loss — conditional colouring
<span className={value >= 0 ? "text-gain" : "text-loss"}>
  {formatCurrency(value)}
</span>

// Status badge with tinted background
<span className="inline-flex items-center rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
  Active
</span>
```

### Legacy Palette Colours

Raw palette tokens (`text-rosely-teal`, `text-rosely-golden`, etc.) fail WCAG AA contrast on white backgrounds. **Do not use them for text.** They remain available for decorative backgrounds with opacity (e.g., `bg-rosely-teal/20`).

## 6a. Data Visualisation (Charts)

Charts use **Recharts 3.x** (see [KNOWLEDGE.md](docs/KNOWLEDGE.md#charting--recharts) for the chart-type catalogue and API notes). Five conventions keep every chart consistent, responsive, zoomable and on-palette.

### 1. Always wrap in `ChartCard`

`components/charts/chart-card.tsx` provides the title, optional header `actions`, and a **maximise button that opens the chart in a full-screen modal** (the universal zoom). Children is a render-prop `(height) => ReactNode` so the inline and expanded heights differ:

```tsx
<ChartCard title="Allocation" description="By sector and holding">
  {(h) => <NestedAllocationPie holdings={holdings} sectors={sectors} height={h} />}
</ChartCard>
```

### 2. Always responsive

Wrap the Recharts tree in `<ResponsiveContainer width="100%" height={h}>`. Never set a fixed pixel width. Add `accessibilityLayer` to cartesian charts.

### 3. Consistent responsive grid

Lay out charts with `ChartGrid` / `ChartGridItem` (mirrors the `/portfolio` and `/accounts` card grids):

```tsx
<ChartGrid>
  <ChartGridItem><ChartCard …/></ChartGridItem>
  <ChartGridItem span={2}><ChartCard …/></ChartGridItem> {/* full width */}
</ChartGrid>
```

### 4. Universal timescale

Time-scaled charts bind to the **global** range store (`lib/stores/chart-range.ts`, persisted to `localStorage`) via `useChartRange()` — selecting a range on any page applies everywhere. Do not hold range in per-page `useState`.

### 5. Rosely chart palette

Use CSS-var colours only — `holdingColor(i).var`, `var(--roselyN)`, or semantic `--gain`/`--loss`. Never raw hex. Dynamic Tailwind swatches (`bg-[var(--roselyN)]`) must be in the `ALL_ROSELY_SWATCHES` safelist. ESLint bans inline `style={{}}`.

### Choosing a chart type

| Need | Chart |
| ---- | ----- |
| Value / cumulative return over time | `LineChart` / `AreaChart` |
| Compare categories (contribution, periods, income) | `BarChart` (horizontal via `layout="vertical"`) |
| Nested allocation (sector → holding) | **Two-level `PieChart`** (`NestedAllocationPie`) |
| Multi-metric profile / comparison | `RadarChart` (risk profile, factor exposure) |
| Single proportion / gauge / progress | `RadialBarChart` (fear-greed, FIRE %, drift) |
| Hierarchical magnitude | `Treemap` |
| Risk vs return point cloud | `ScatterChart` (efficient frontier, drawdowns) |


## 7. Motion & Animation

Rosely uses motion purposefully to guide focus and add professional polish without sacrificing performance or serenity.

### Transitions

- **Smooth state changes:** Hover, focus, and active states use CSS transitions (200–300ms) for `color`, `background-color`, `border-color`, `box-shadow`, and `transform`.
- **Utility class:** Apply `transition-colors` or list specific properties (`transition-[color,background-color,border-color,box-shadow]`). **Never use `transition-all`** — always list properties explicitly.
- **Tactile depth:** Interactive cards use `hover:-translate-y-0.5 hover:shadow-md` for subtle lift.

### Entrance Animations

- **Fade-in-up:** Key content blocks use a gentle fade-in with 1rem upward slide via a custom `animate-fade-in-up` keyframe defined in `globals.css`.
- **Staggered delays:** Sequential elements use `[animation-delay:200ms]` increments for natural flow.

### Motion Accessibility

- **Reduced motion:** All non-essential animations are disabled when `prefers-reduced-motion: reduce` is detected:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

## 8. Accessibility Standards

Rosely meets **WCAG 2.1 Level AA** standards.

### Semantic Foundation

- Use HTML5 landmark elements (`<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`) for assistive technology navigation.
- Maintain logical heading hierarchy (H1 → H2 → H3) without skipping levels.

### Interactive Components

- Use ARIA roles and attributes (`aria-label`, `aria-expanded`, `aria-current`) where native semantics are insufficient.
- All interactive elements must be keyboard-focusable with logical tab order.
- Every focusable element must have a visible focus indicator (Tailwind `ring` utilities with `rosely-lilac`).

### Colour & Contrast

- All text meets WCAG AA contrast ratios: at least 4.5:1 for normal text, 3:1 for large text.
- Never use colour as the sole indicator of meaning — always provide text labels or icons alongside colour status indicators.
- The low-contrast aesthetic applies to decorative surfaces, not to text legibility.
- **Light mode**: Use semantic tokens (`text-gain`, `text-loss`, `text-success`, `text-warning`) for status text — raw palette tokens like `text-rosely-teal` (#64bfa4, 2.2:1) and `text-rosely-golden` (#eada4f, 1.4:1) fail AA on white.
- **Dark mode**: Semantic tokens auto-switch to lighter palette values that pass AA on dark backgrounds.
- **Primary token**: `--primary` is `#a855a0` (Radiant Orchid, darkened for AA, 4.69:1 on white) in light mode — safe for `text-primary` on white/cream backgrounds. Note: the raw palette token `rosely-plum` (#b565a7) only achieves 3.9:1 and fails AA for normal text. Do not use `text-rosely-mist` (#a49e9e, 2.6:1) for readable text — use `text-muted-foreground` instead.

### shadcn/ui Accessibility

- shadcn/ui Base UI components include built-in ARIA patterns, keyboard navigation, and focus management.
- Do not override or remove accessibility attributes when customising components.

## 9. Theme Toggle

The app supports three theme modes via `next-themes`: **Light**, **Dark**, and **System** (auto). The toggle is located in the dashboard header.

### Setup

- `ThemeProvider` from `next-themes` wraps the app at the root layout level with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`
- `suppressHydrationWarning` on `<html>` prevents hydration mismatch warnings
- `color-scheme: light` / `color-scheme: dark` is set in `globals.css` on `:root` / `.dark` respectively, ensuring native form controls and scrollbars match the theme
- `disableTransitionOnChange` prevents flash-of-wrong-theme during transitions

### Component

The `ThemeToggle` component (`components/layout/theme-toggle.tsx`) renders a Sun/Moon icon button with a dropdown menu offering Light, Dark, and System options. It is placed in the `Header` component alongside user controls.
