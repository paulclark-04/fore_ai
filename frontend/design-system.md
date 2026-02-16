# Fore AI Design System

Extracted from https://foreai.co/ — adapted for internal sales tool.

## Color Palette

### Primary
| Token | Value | Usage |
|-------|-------|-------|
| `fore-primary` | `#075056` | Primary brand teal — nav, primary buttons, key UI |
| `fore-secondary` | `#0f1354` | Dark navy — secondary emphasis |
| `fore-accent` | `#5acf5d` | Green — CTAs, success states, active indicators |

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `fore-bg` | `#030620` | Dark page background (app uses dark mode) |
| `fore-bg-elevated` | `#0a0f2e` | Cards, elevated surfaces |
| `fore-bg-surface` | `#111640` | Inputs, table rows, sidebar |
| `fore-bg-light` | `#f5f5f5` | Light mode fallback |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `fore-text` | `#f0f0f5` | Primary text (on dark bg) |
| `fore-text-secondary` | `rgba(240,240,245,0.66)` | Muted / secondary text |
| `fore-text-heading` | `#ffffff` | Headings |

### Status / Tier Colors (lead scoring)
| Token | Value | Usage |
|-------|-------|-------|
| `tier-a` | `#5acf5d` | Tier A — matches Fore accent green |
| `tier-a-bg` | `rgba(90,207,93,0.12)` | Tier A background |
| `tier-b` | `#f59e0b` | Tier B — amber |
| `tier-b-bg` | `rgba(245,158,11,0.12)` | Tier B background |
| `tier-c` | `#f97316` | Tier C — orange |
| `tier-c-bg` | `rgba(249,115,22,0.12)` | Tier C background |
| `tier-d` | `#ef4444` | Tier D — red |
| `tier-d-bg` | `rgba(239,68,68,0.12)` | Tier D background |

### Borders & Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `fore-border` | `rgba(255,255,255,0.08)` | Subtle borders on dark bg |
| `fore-border-active` | `#075056` | Active/focused borders |
| `fore-shadow` | `0 4px 24px rgba(0,0,0,0.3)` | Card shadows |

## Typography

### Fonts
- **Headings**: `Nohemi` (custom, fallback: system sans-serif)
- **Body**: `Inter Variable` (fallback: system sans-serif)

### Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| h1 | 2rem (32px) | 700 | 1.2 |
| h2 | 1.5rem (24px) | 600 | 1.3 |
| h3 | 1.25rem (20px) | 600 | 1.4 |
| Body | 0.875rem (14px) | 400 | 1.5 |
| Small / Caption | 0.75rem (12px) | 500 | 1.4 |
| Nav item | 0.875rem (14px) | 500 | 1 |

## Spacing

- Container max-width: `1200px` (max-w-6xl → 72rem in Tailwind)
- Section padding: `24px` horizontal, `24px` vertical
- Card padding: `20px`
- Card gap: `16px`
- Input padding: `10px 14px`

## Border Radius
| Element | Value |
|---------|-------|
| Cards | `12px` (rounded-xl) |
| Buttons | `8px` (rounded-lg) |
| Inputs | `8px` (rounded-lg) |
| Badges | `9999px` (rounded-full) |

## Components

### Buttons
- **Primary**: bg `#5acf5d`, text `#030620`, font-weight 600, rounded-lg, px-5 py-2.5, hover: brightness 110%
- **Secondary**: bg transparent, border `rgba(255,255,255,0.15)`, text `#f0f0f5`, hover: bg `rgba(255,255,255,0.05)`
- **Ghost**: bg transparent, text `#5acf5d`, hover: bg `rgba(90,207,93,0.08)`
- **Danger**: bg `rgba(239,68,68,0.12)`, text `#ef4444`, hover: bg `rgba(239,68,68,0.2)`

### Cards
- bg: `#0a0f2e`, border: `rgba(255,255,255,0.08)`, rounded-xl, p-5
- Hover: border `rgba(255,255,255,0.15)`, slight translate or glow
- Shadow: `0 4px 24px rgba(0,0,0,0.3)`

### Navigation
- Dark header: bg `#030620` with slight blur
- Logo left, nav links center/right
- Active link: text `#5acf5d`

### Tables
- Header: bg `#111640`, text `fore-text-secondary`, uppercase, text-xs, font-semibold
- Rows: bg `#0a0f2e`, border-b `rgba(255,255,255,0.05)`
- Hover row: bg `#111640`
- Alternating rows optional

### Inputs
- bg: `#111640`, border: `rgba(255,255,255,0.08)`, rounded-lg
- Focus: border `#075056`, ring `rgba(7,80,86,0.3)`
- Placeholder: `rgba(240,240,245,0.4)`

## Animations
- Transitions: `all 150ms ease` on interactive elements
- Hover scale on cards: `transform: scale(1.01)`
- Intersection observer reveals with staggered delays (100ms)
