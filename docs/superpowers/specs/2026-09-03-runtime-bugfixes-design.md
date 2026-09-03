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
- return `INVALID_SELECTION` when confirmation is requested with no selection;
- record human cancellation as `cancelled` and retain only the newest ten tool
  log entries;
- prevent Enter on a seat button from invoking inspection twice;
- render distinct capability failure categories instead of collapsing them into
  the unsupported fallback;
- expose the missing `availableOnly` and `quietCar` human query controls;
- replace user-facing `Bearing` branding with the contract name `Ieum`; and
- ensure Playwright starts the build under test rather than accepting an
  unrelated server already listening on port 3000.

This change will not:

- merge or rewrite `main` and `dev`;
- change the OpenAI Sites deployment or access policy;
- change WebMCP `readOnlyHint` annotations; or
- unify the intentionally separate root reference engine and `site/` fixture.

## Design

### WebMCP registration lifetime

`registerBearingTools` will accept an optional owner signal. It will connect that
signal to the registration controller before the first registration attempt and
will stop registering when the owner aborts. `BearingApp` will create the owner
controller synchronously inside its effect and abort it during cleanup. If the
registration promise resolves after cleanup, its returned registration will
already be disposed. Partial registration continues to roll back atomically.

### Comparison intent

The selection panel will show a checkbox for each selected seat. Comparison
choices are independent from booking selection and are kept as a set of refs.
The UI will allow at most four checked refs, announce why a fifth cannot be
added, and enable comparison only for two through four unique refs. No array
slicing will occur at the application boundary.

### Preference boundary

A small parser will accept only finite positive numeric values. Invalid draft
text remains editable but is not written to application preferences. Human
actions that require rendering will announce a fixed validation message until
the value is corrected. Agent calls that omit rendering options will therefore
continue to inherit the last valid preferences.

### Application state and log semantics

Confirmation preconditions will distinguish an active/locked confirmation from
an empty selection. `finish` will preserve explicit terminal statuses, and
cancelled confirmation will use the existing `cancelled` status. Both pending
and completed log updates will retain the newest ten entries, matching the UI
contract and bounding update cost.

### UI contract alignment

Enter handling will rely on the native button click instead of manually calling
`inspect` during keydown. The capability banner will map each capability enum to
a distinct stable message. Query controls will explicitly set `availableOnly`
and `rail.quietCar`. User-visible headings, metadata, and accessible names will
use `Ieum`; spatial `bearing` field names remain unchanged.

### Verification

Each production change will start with a focused failing Vitest or Playwright
test. Verification requires:

- focused red/green evidence for every corrected behavior;
- all `site/` Vitest tests;
- `site/` typecheck and lint;
- a production Vinext build;
- all Playwright E2E tests with `reuseExistingServer: false`;
- root reference tests; and
- a clean diff check followed by an independent code review.

## Pull request

The implementation will be committed on a dedicated bugfix branch and opened
as a pull request targeting `dev`. The PR will describe the reproduced defects,
the regression coverage, verification commands, and any intentionally deferred
operational risks.
