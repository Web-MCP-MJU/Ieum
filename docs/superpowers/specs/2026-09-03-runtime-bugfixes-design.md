# Ieum Runtime Bugfixes Design

## Goal

Remove the confirmed WebMCP lifecycle, comparison, preference, confirmation,
and UI contract defects from the deployed `site/` application without changing
the domain contract or deployment policy.

## Scope

This change will:

- make WebMCP registration cancellation-safe when `BearingApp` unmounts before
  asynchronous registration completes;
- prevent comparison from silently dropping selections after the fourth seat by
  exposing an explicit, accessible 2–4 seat comparison choice;
- prevent non-finite or non-positive step length and walking speed values from
  entering shared application preferences;
- preserve the contract-level `CONFIRMATION_REQUIRED` code while returning a
  context-appropriate safe message when confirmation has no selection;
- record human cancellation as `cancelled` and retain only the newest ten tool
  log entries;
- prevent Enter on a seat button from invoking inspection twice;
- render distinct capability failure categories instead of collapsing them into
  the unsupported fallback;
- expose the missing `availableOnly` and `quietCar` human query controls;
- replace user-facing `Bearing` branding with the contract name `Ieum`; and
- ensure Playwright starts the build under test rather than accepting an
  unrelated server already listening on port 3000; and
- keep route segments aligned with their aisle and seat endpoints at desktop,
  tablet, and mobile widths without hiding the route behind unrelated seats.

This change will not:

- merge or rewrite `main` and `dev`;
- change the OpenAI Sites deployment or access policy;
- change WebMCP `readOnlyHint` annotations; or
- unify the intentionally separate root reference engine and `site/` fixture.

## Design

### WebMCP registration lifetime

`registerBearingTools` will accept an optional owner signal. It will connect that
signal to the registration controller before the first registration attempt and
will check for abort both before and after every awaited registration so a late
resolution cannot start the next tool. `BearingApp` will create the owner
controller synchronously inside its effect, abort it during cleanup, and ignore
late capability results after cleanup. Owner abort is a normal lifecycle event,
not a capability failure; any returned registration is already disposed and its
`dispose` operation remains idempotent. Partial registration continues to roll
back atomically. Tests cover an already-aborted owner, unmount during a deferred
registration followed by late resolve or reject, and Strict Mode cleanup/retry.

Capability detection will classify `window.isSecureContext === false` as
`insecure-context` before checking `document.modelContext`. The banner will map
available, unsupported, insecure context, permission denied, security rejected,
and registration failed to distinct messages.

### Comparison intent

The query candidate list will show a comparison checkbox for every current
candidate, including unavailable candidates when `availableOnly` is false.
Comparison choices are independent from booking selection and begin empty. A
successful query clears the choices and any stale comparison table. Inspecting,
selecting, or undoing a booking does not change comparison choices. The UI will
allow at most four checked refs, announce `Choose up to four seats to compare.`
when a fifth is attempted, and enable comparison only for two through four
unique refs. No array slicing will occur at the application boundary.

### Preference boundary

The Application `setPreferences` write boundary will accept only finite positive
step length and walking speed values. The UI keeps invalid draft text editable
but writes each valid preference independently, so one invalid field does not
block units or direction-style changes. An invalid step length blocks only
step-rendered human actions and announces `Enter a step length greater than 0.`;
feet and metres do not consume that draft. Invalid walking speed blocks only
route actions and announces `Enter a walking speed greater than 0.`. Human calls
use the last valid stored values rather than forwarding invalid draft numbers.
Agent calls that omit rendering options therefore inherit valid preferences.

### Application state and log semantics

Confirmation preconditions will distinguish an active/locked confirmation from
an empty selection while preserving the `CONFIRMATION_REQUIRED` wire code. The
empty-selection message is `Select at least one seat before confirming.`.
`finish` will preserve explicit terminal statuses, and cancelled confirmation
will use the existing `cancelled` status. The internal log retains every pending
entry plus the ten most recent terminal entries, so a long-running confirmation
can always update the same entry exactly once. The UI remains a newest-ten
projection of that state.

### UI contract alignment

Enter handling will rely on the native button click instead of manually calling
`inspect` during keydown. The live announcement uses `role="status"`,
`aria-live="polite"`, and `aria-atomic="true"`. Query controls will initialize
`availableOnly` to true and expose it as an include-unavailable toggle. Quiet-car
filtering will use an `Any / Quiet / Non-quiet` selector so `undefined`, `true`,
and `false` remain distinct. User-visible headings, metadata, accessible names,
and the design document will use `Ieum`; internal TypeScript symbols may retain
`Bearing` to avoid an unrelated refactor. Spatial `bearing` fields are unchanged.

### Responsive route projection

Route geometry will move into a focused `RouteOverlay` component. It will not
calculate routes; it only projects the refs already present in
`activeRoute.segments`. Seat endpoints come from the rendered seat-button
centres. All non-seat fixture points lie on the centre aisle, whose x coordinate
comes from the midpoint between the rendered B and C columns. Their y coordinate
is interpolated from the rendered row centres and the authored fixture y values.
The projection is recomputed with `ResizeObserver` after layout changes.

The corridor line remains behind seat content, while an independent route marker
on endpoint seats remains visible above availability and selected fills without
covering the seat label or focus ring. After a human requests a route below the
map, focus moves to the route summary so tablet and mobile users reach the result
without searching upward.

### Verification

Each production change will start with a focused failing Vitest or Playwright
test. Verification requires:

- focused red/green evidence for every corrected behavior;
- all `site/` Vitest tests;
- `site/` typecheck and lint;
- a production Vinext build;
- all Playwright E2E tests with `reuseExistingServer: false`;
- responsive route assertions at 760, 759, 390, and 320 CSS pixels proving that
  aisle segments intersect no unrelated seat and the seat endpoint is centred;
- `npm run design:lint`;
- root reference tests; and
- a real Chrome WebMCP smoke test for registration, invocation, disposal, and
  clean retry, with the result recorded in the pull request; and
- a clean diff check followed by an independent code review.

## Pull request

The implementation will be committed on a dedicated bugfix branch and opened
as a pull request targeting `dev`. The PR will describe the reproduced defects,
the regression coverage, verification commands, and any intentionally deferred
operational risks.
