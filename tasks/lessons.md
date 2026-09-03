# Lessons

- When the user identifies one project document as newer or authoritative, treat it as the source of truth immediately. Synchronize every downstream contract, example, test, ADR, and acceptance criterion against it rather than presenting both documents as equally authoritative.
- When the user asks only for theme/rules/technical conformance, do not substitute schedule management or recommend scope cuts. Keep delivery planning separate unless the user explicitly asks for it.
- Product documents are authoritative for intent, but current official rules and platform specifications outrank them for compliance and API facts. Record technical errata explicitly instead of reproducing a known-stale contract.
- Before implementation, turn every authored data boundary and asynchronous lifecycle into a machine-checkable contract: define the canonical fixture/schema and cross-field invariants, model pending and terminal transitions explicitly, and test rollback at every partial-failure position.
- Accessibility prose must remove interaction ambiguity. Specify exact grid keys, unavailable-item behavior, overlapping visual-state precedence, forced-colors mappings, zoom/reflow checks, and asset-delivery evidence before component work starts.
- Keep one source of truth for every derived spatial fact: author edge length and forward car-axis bearing once, derive traversal time and reverse bearing, and prove continuation strictly progresses and terminates for every routable ordered pair.
- Validate generated-framework artifact paths with a real pinned build before treating them as an architecture contract; use Vinext's observed output tree rather than inventing compatibility directories.
