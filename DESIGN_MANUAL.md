# PSBTHub Design Manual

This document defines the visual and interaction system for PSBTHub, with focus on the public landing page.

## 1. Scope and Source of Truth

- Scope: public marketing/landing experience and shared visual primitives.
- Primary source of truth:
  - `src/views/LandingView.vue` (structure and scoped component styles)
  - `src/style.css` (global base styles)
  - `src/theme/preset.ts` (PrimeVue semantic theme tokens)
  - `src/utils/theme.ts` and `src/stores/app.ts` (theme mode behavior)
  - `index.html` (document metadata)

When documentation conflicts with implementation, implementation is canonical until this manual is updated.

## 2. Design Principles

- Security-first tone: clean, explicit, and trustworthy.
- Minimalism over ornament: use visual effects only when they improve hierarchy.
- One primary conversion target per viewport region.
- High legibility in both dark and light themes.
- Keep interactions predictable, fast, and keyboard-friendly.

## 3. Brand and Voice

- Brand wordmark format: `psbt:hub`.
- Core accent hue: amber (`#f59e0b`), with warm highlight (`#fbbf24`).
- Product personality: technical, calm, and verification-focused.

## 4. Typography System

Fonts are local-first. The app does not fetch external web fonts at runtime.

- Primary body: system sans-serif stack (`system-ui`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Arial`, `sans-serif`)
- Headings and CTAs: preferred `Space Grotesk` when available locally, fallback to sans-serif
- Technical labels and utility text: preferred `Roboto Mono` when available locally, fallback to monospace

Usage guidance:

- `Space Grotesk`: hero title, section titles, major CTA labels.
- `Roboto Flex`: long-form copy and body paragraphs.
- `Roboto Mono`: metadata, micro labels, trust chips, and small UI utility text.

## 5. Color and Theme Tokens

Landing styles use CSS custom properties on `.landing` and `html.app-light .landing`.

### Core semantic tokens

| Token            | Dark mode                | Light mode            | Purpose                  |
| ---------------- | ------------------------ | --------------------- | ------------------------ |
| `--bg`           | `#050a15`                | `#f8fafc`             | Page background          |
| `--text`         | `#e2e8f0`                | `#0f172a`             | Primary text             |
| `--text-muted`   | `#94a3b8`                | `#475569`             | Secondary text           |
| `--text-dim`     | `#64748b`                | `#64748b`             | Tertiary/supporting text |
| `--heading`      | `#ffffff`                | `#0f172a`             | Heading color            |
| `--accent`       | `#f59e0b`                | `#f59e0b`             | Brand accent             |
| `--accent-light` | `#fbbf24`                | `#fbbf24`             | Accent highlight         |
| `--border`       | `rgba(255,255,255,0.06)` | `rgba(15,23,42,0.12)` | Subtle separators        |

### PrimeVue semantic baseline

- PrimeVue preset extends Aura (`src/theme/preset.ts`).
- Primary semantic scale maps to `amber`.
- Surface scales:
  - Light mode: `zinc`
  - Dark mode: `slate`

## 6. Layout and Spacing

Global layout tokens:

- `--content-max-width: 74rem`
- `--page-padding-x: clamp(1.25rem, 3.4vw, 2.5rem)`
- `--hero-padding-top: clamp(7.75rem, 10vw, 9.5rem)`
- `--hero-padding-bottom: clamp(4.5rem, 7vw, 6.5rem)`
- `--section-padding-y: clamp(5.5rem, 8vw, 7.75rem)`

Layout pattern:

- Fixed top navigation with blur and border.
- Centered content containers.
- Vertical rhythm by section-level padding.
- Hero and bottom CTA act as primary entry/exit conversion points.

## 7. Component Patterns

### Navigation

- Structure: brand (left), section links (center), social icon links (right).
- Header CTA was intentionally removed.
- Primary conversion now lives in the hero CTA only.
- On small screens (`max-width: 640px`), nav links and icon links are hidden.

### Hero

- Badge + large headline + explanatory paragraph + primary CTA + trust bar.
- Hero CTA uses gradient fill with animated rotating conic-border glow.
- CTA must remain a highly visible focal element.

### Glass cards (steps and security features)

- Semi-transparent card background with subtle border.
- Hover behavior:
  - border glow sweep (`border-spin`)
  - radial spotlight that follows cursor position
- Keep card content concise and scannable.

### Quote dividers

- Horizontal rule fragments and centered quote/citation.
- Used between major sections to break rhythm.

### Footer

- Gradient background, center-balanced content rows.
- Includes theme toggle and social links.
- Footer social chips are secondary actions, not primary conversion targets.

## 8. Motion and Interaction

Motion primitives:

- `fadeInUp` for entrance sequencing in hero content.
- `border-spin` for CTA/card border accent.
- `glow-pulse` for ambient glows.
- Floating cube background drift animations.

Interaction guidance:

- Hover effects should increase clarity, not introduce layout shift.
- Use `focus-visible` outlines for keyboard users.
- Keep transition durations in the `0.2s-0.4s` range for UI controls.

Reduced motion:

- For `prefers-reduced-motion: reduce`, floating cube animations are disabled.
- New decorative animation should include equivalent reduced-motion handling.

## 9. Responsive Behavior

Breakpoints:

- `max-width: 768px`
  - section spacing tightens
  - cards become denser
  - steps/features grids collapse to one column
  - quote divider rules hidden
- `max-width: 640px`
  - ambient cubes hidden
  - nav links and social icon links hidden
  - hero CTA scales down
  - trust separators hidden for cleaner wrapping

## 10. Theme Behavior

Theme mode is controlled by app state and DOM classes:

- Theme modes: `light` and `dark`
- Root classes:
  - dark: `app-dark`
  - light: `app-light`
- Storage key: `psbthub-theme-mode`
- PrimeVue dark mode selector: `.app-dark`

Implementation flow:

1. App initializes theme from local storage (fallback: dark).
2. Root class and `color-scheme` are applied.
3. User toggles update both state and persistent storage.

## 11. Accessibility Baseline

- Maintain visible `focus-visible` states for interactive elements.
- Keep contrast strong for text and controls in both themes.
- Use semantic landmarks (`header`, `nav`, `section`, `footer`).
- External links must use `rel="noopener noreferrer"`.
- Decorative-only visuals use `aria-hidden="true"`.

## 12. Extension Rules

When adding or modifying UI:

1. Reuse existing tokens before introducing new raw color values.
2. Preserve typography roles (`Space Grotesk` for hierarchy, `Roboto Mono` for utility).
3. Keep one primary CTA per major section.
4. Prefer PrimeVue components first for application UI.
5. Use custom components/styles only when PrimeVue cannot reasonably achieve the required visual behavior.
6. Document any new design token in this file.

---

If this manual is updated, ensure all new guidance remains consistent with security-first product positioning and the existing dark/light theming model.
