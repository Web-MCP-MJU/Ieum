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
  highlighted: "#CFE8F3"
  disabled: "#D7DCE0"
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
    padding: "{spacing.base}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    height: 44px
  input-invalid:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.sm}"
    size: 2px
  checkbox:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    size: 24px
  checkbox-checked:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    size: 24px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    size: 3px
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    height: 44px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
  button-secondary-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    size: 3px
  control-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    size: 2px
  gridcell-available:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    size: 44px
  gridcell-available-border:
    backgroundColor: "{colors.outline}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    size: 1px
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
  gridcell-highlighted:
    backgroundColor: "{colors.highlighted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    size: 3px
  comparison-surface:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  selection-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  tool-log:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-data}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  confirmation-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  capability-banner:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  status-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
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
- **Secondary (`#52606D`):** supporting metadata and disabled-control text, never core instructions or primary actions.
- **Surface muted (`#E9EEF2`):** grouped comparison, banner, and secondary-control surfaces; it does not create nested decorative cards.
- **Outline (`#637381`):** 1px structural boundaries for panels, controls, and available seats, not text emphasis.
- **Highlighted (`#CFE8F3`):** transient result association behind an explicit highlight marker; it never replaces route, selection, or focus.
- **Disabled (`#D7DCE0`):** unavailable control surface paired with secondary text and a disabled attribute; it never denotes unavailable seats.
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

At 1216px and above, use 24px outer gutters, 300px controls, a flexible workspace of at least 480px, a 340px decision rail, and 24px internal gaps. From 760–1215px, use 280px controls beside the workspace and span the decision rail below. At 759px and below, all regions become one document-order column: controls, results, grid, decision state, then log. Narrow comparison always becomes candidate-labeled definition-list rows and never scrolls horizontally. Only the desktop selection summary is sticky at `top: 16px`; below 1216px it is static.

Use the 4px-based spacing tokens without arbitrary local values. Dense data groups use 8–12px gaps; panels use 16px padding; major regions use 24–32px separation. Touch targets are at least 44px square.

## Elevation & Depth

Depth comes from tonal layers and 1px outlines, not floating card stacks. The warm-neutral page contains white working panels; modal confirmation is the only surface allowed to use a restrained shadow and backdrop. Hover must not introduce layout movement. Focus uses a 3px visible ring with a 2px offset.

## Shapes

Bearing uses compact 4–8px radii for controls, seat cells, and panels. The seat grid retains rectilinear geometry so it reads as a vehicle layout. Pills are limited to short status labels; content panels and primary buttons are never pill-shaped. Icons are simple stroked symbols from the pinned `lucide-react` package. Informative icon-only controls have explicit accessible names; an icon adjacent to equivalent visible text is decorative and uses `aria-hidden="true"` with no duplicate name. They are bundled with the application; no remote icon service or copied operator asset is used.

## Components

- **RailSeatGrid:** named `grid` containing owned rows and all 60 gridcells, including unavailable seats. Exactly one cell has `tabindex="0"`. Left/Right moves to the nearest seat in the current row across the aisle; Up/Down moves to the same letter in the adjacent row with nearest-x fallback; none wrap. Home/End moves to row edges. Enter describes the active seat. Space append-selects only an available seat; unavailable cells remain focusable, use `aria-disabled="true"`, do not mutate selection, and trigger a concise polite explanation.
- **Seat cell:** apply visual layers in fixed order: base availability surface, route stripe/marker, selected amber fill/check, transient pale-blue highlight outline, then the outer violet focus ring. `gridcell-available-border` is a 1px pseudo-element token mapped exactly to `--seat-border-color` from its background color and `--seat-border-width` from its size; it is not rendered as content. Unavailable adds a hatch and text label. Later layers never erase an earlier state's text, pattern, or marker, so route remains identifiable on selection and focus stays distinct from every semantic state. In forced colors, system-color borders, text abbreviations, and patterns replace authored colors.
- **Filter form:** persistent labels above fields, grouped legends for related needs, explicit applied-default summary, and a visible reset action. Placeholder text never acts as the label.
- **Route panel:** ordered instructions and totals remain primary; the SVG overlay is supportive and uses the exact route segments without recalculation.
- **Comparison:** 2–4 columns on wide screens and labeled row groups on narrow screens. Every value remains associated with both candidate and axis.
- **Selection panel:** selected refs, USD total, undo availability, and confirmation status remain visible together.
- **Tool log:** uses concise rows with call ID/origin, tool name, lifecycle status, safe arguments, normalized criteria, result refs, start/completion times, and fixed error/outcome. Empty success, domain failure, pending confirmation, cancellation, and rejection have distinct text labels and icons. Expanded JSON uses safe text rendering and horizontal containment above 759px; at 759px and below it uses `white-space: pre-wrap` plus `overflow-wrap: anywhere` and never scrolls horizontally.
- **Confirmation dialog:** programmatically named modal with Confirm and Cancel. The least destructive control receives initial focus; background content is inert; Escape cancels; focus returns to the invoker.
- **Capability banner:** explains unsupported or blocked WebMCP without implying that the human UI is unavailable.
- **Status messages:** use concise `role="status"` output. Errors identify the failed action and recovery without echoing unsafe raw input.

State mapping is exact: `pending` and `timeout` use `status-warning`; `succeeded`/`confirmed` use `status-success`; `domain_failed`/`rejected` use `status-error`; `cancelled` uses `status-neutral`. Primary active/disabled uses `button-primary-active`/`button-primary-disabled`; secondary active uses `button-secondary-active`; disabled inputs, secondary buttons, and checkboxes compose `control-disabled`; invalid inputs and checkboxes compose `input-invalid`; checked checkboxes use `checkbox-checked`. Every focus-visible state composes the global `focus-indicator`. Disabled controls retain readable text plus the native disabled attribute, and invalid controls retain a persistent label, fixed error text, `aria-invalid`, and 2px error outline, so neither state relies on color alone.

In `forced-colors: active`, use `Canvas`, `CanvasText`, `ButtonText`, `Highlight`, `HighlightText`, `LinkText`, and `GrayText`; preserve route, selection, unavailable, highlight, and focus through distinct solid/dashed/double borders, short text markers, and the unavailable hatch. Do not depend on background images. At 200% and 400% zoom, 320 CSS px width, and WCAG text-spacing overrides, content reflows in one dimension without clipping controls, status text, dialog actions, or focus rings.

## Do's and Don'ts

- Do put a useful seat result and the primary controls in the first viewport.
- Do preserve full keyboard and screen-reader parity with every Agent operation.
- Do use the same fixture and application state for UI, WebMCP results, logs, totals, and overlays.
- Do pair color with text, symbol, border, or pattern for every state.
- Do keep tool calls and confirmation transitions visible and understandable.
- Do load bundled Atkinson 400/700 and bundled Lucide assets only after their installed license files are verified; retain usable system-font and text-only fallbacks.
- Don't add a hero, testimonial, pricing block, decorative train illustration, or unrelated stock imagery.
- Don't use glassmorphism, gradients, neon glow, oversized type, excessive shadows, or nested cards.
- Don't use color as the sole indication of availability, route, selection, focus, success, or failure.
- Don't visually imply a real railway operator, real reservation inventory, payment, or certified accessibility.
- Don't hide core controls behind hover, unlabeled icons, drawers, or Agent-only interaction.
