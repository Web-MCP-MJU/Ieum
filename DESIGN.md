---
version: "alpha"
name: Bearing
description: A precise, high-contrast spatial decision interface for rail-seat exploration by people and browser agents.
colors:
  primary: "#17324D"
  on-primary: "#FFFFFF"
  secondary: "#52606D"
  tertiary: "#005A78"
  on-tertiary: "#FFFFFF"
  neutral: "#F7F5EF"
  surface: "#FFFFFF"
  surface-muted: "#E9EEF2"
  on-surface: "#17212B"
  outline: "#637381"
  focus: "#5B21B6"
  success: "#166534"
  warning: "#8A4B08"
  error: "#A12C2C"
  unavailable: "#66717C"
  route: "#005A78"
  selected: "#8A4B08"
typography:
  headline-display:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
  headline-md:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.25
  body-lg:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label-lg:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.2
  label-md:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
  label-data:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.02em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  desktop-gutter: 24px
  mobile-gutter: 16px
components:
  app-surface:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 44px
  gridcell-available:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    size: 44px
  gridcell-route:
    backgroundColor: "{colors.route}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    size: 44px
  gridcell-unavailable:
    backgroundColor: "{colors.unavailable}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    size: 44px
  gridcell-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    size: 44px
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 8px
  status-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 8px
  focus-indicator:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    size: 3px
---

# Bearing Design System

## Overview

Bearing should feel like a trustworthy rail information instrument: calm, exact, and immediately operable. It is a working surface for blind and low-vision travelers, keyboard users, sighted companions, judges, and browser agents—not a marketing landing page. Spatial relationships and decision state are the visual hierarchy. The interface is moderately dense on desktop, linear and spacious on mobile, and never ornamental at the expense of comprehension.

## Colors

Deep ink and warm ivory establish a legible, non-clinical base. Cobalt marks interactive actions and active routes. Burnt amber marks selected seats so route, selection, and keyboard focus never share one visual signal.

- **Primary (`#17324D`):** primary headings and strong structural emphasis.
- **Tertiary (`#005A78`):** primary action and route color, always paired with white text.
- **Neutral (`#F7F5EF`):** page foundation; pure white is reserved for working panels and seat cells.
- **Focus (`#5B21B6`):** the exclusive keyboard focus-ring color.
- **Selected (`#8A4B08`):** selection state, paired with a check mark and text—not color alone.
- **Unavailable (`#66717C`):** unavailable state, paired with a diagonal hatch and an explicit label.
- **Success, warning, and error:** semantic feedback only; none substitute for text.

Every normal-text foreground/background pair must meet WCAG AA contrast. Interactive, selected, route, unavailable, error, and confirmation states must remain distinguishable in grayscale and forced-colors mode.

## Typography

Atkinson Hyperlegible is the product face because individual letterforms remain easy to distinguish at small sizes. The system sans-serif stack is the fallback. A system monospace face is limited to stable refs, measurements, prices, timestamps, and tool arguments.

The default body size is 16px. Controls never render below 13px, and core task text never renders below 14px. Headings use size and weight rather than all caps. Technical labels may use short uppercase words only when their accessible names remain natural language.

## Layout

The first desktop viewport is a three-region working surface with no marketing hero:

1. A 280–320px control rail for query and rendering preferences.
2. A flexible central workspace for the named seat grid, description, and segment-derived route overlay.
3. A 320–360px decision rail for comparison, selection, confirmation status, and tool log.

At 960px and below, the decision rail moves below the grid. At 720px and below, all regions become one document-order column: controls, results, grid, decision state, then log. Sticky behavior may preserve the selection summary but must not obscure focused content or the confirmation dialog.

Use the 4px-based spacing tokens without arbitrary local values. Dense data groups use 8–12px gaps; panels use 16px padding; major regions use 24–32px separation. Touch targets are at least 44px square.

## Elevation & Depth

Depth comes from tonal layers and 1px outlines, not floating card stacks. The warm-neutral page contains white working panels; modal confirmation is the only surface allowed to use a restrained shadow and backdrop. Hover must not introduce layout movement. Focus uses a 3px visible ring with a 2px offset.

## Shapes

Bearing uses compact 4–8px radii for controls, seat cells, and panels. The seat grid retains rectilinear geometry so it reads as a vehicle layout. Pills are limited to short status labels; content panels and primary buttons are never pill-shaped. Icons are simple stroked symbols from the pinned `lucide-react` package and always have text or accessible names. They are bundled with the application; no remote icon service or copied operator asset is used.

## Components

- **RailSeatGrid:** named `grid` containing owned rows and gridcells. Each cell exposes row, letter, side, facing, availability, price, and accessibility facts. Roving tabindex, arrows, Home/End, Enter/Space, and visible focus are mandatory.
- **Seat cell:** available is white with an outline; unavailable adds a hatch and unavailable label; route uses cobalt plus a route marker; selected uses amber plus a check mark. Focus is always violet and independent of state.
- **Filter form:** persistent labels above fields, grouped legends for related needs, explicit applied-default summary, and a visible reset action. Placeholder text never acts as the label.
- **Route panel:** ordered instructions and totals remain primary; the SVG overlay is supportive and uses the exact route segments without recalculation.
- **Comparison:** 2–4 columns on wide screens and labeled row groups on narrow screens. Every value remains associated with both candidate and axis.
- **Selection panel:** selected refs, USD total, undo availability, and confirmation status remain visible together.
- **Tool log:** uses concise rows with tool name, arguments, normalized criteria, result refs, and time. Expanded JSON uses safe text rendering and horizontal containment.
- **Confirmation dialog:** programmatically named modal with Confirm and Cancel. The least destructive control receives initial focus; background content is inert; Escape cancels; focus returns to the invoker.
- **Capability banner:** explains unsupported or blocked WebMCP without implying that the human UI is unavailable.
- **Status messages:** use concise `role="status"` output. Errors identify the failed action and recovery without echoing unsafe raw input.

## Do's and Don'ts

- Do put a useful seat result and the primary controls in the first viewport.
- Do preserve full keyboard and screen-reader parity with every Agent operation.
- Do use the same fixture and application state for UI, WebMCP results, logs, totals, and overlays.
- Do pair color with text, symbol, border, or pattern for every state.
- Do keep tool calls and confirmation transitions visible and understandable.
- Don't add a hero, testimonial, pricing block, decorative train illustration, or unrelated stock imagery.
- Don't use glassmorphism, gradients, neon glow, oversized type, excessive shadows, or nested cards.
- Don't use color as the sole indication of availability, route, selection, focus, success, or failure.
- Don't visually imply a real railway operator, real reservation inventory, payment, or certified accessibility.
- Don't hide core controls behind hover, unlabeled icons, drawers, or Agent-only interaction.
