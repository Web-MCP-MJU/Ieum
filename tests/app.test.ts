import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { car6 } from "../src/domain/car-6.ts";
import { createStore, selectionState } from "../src/app/store.ts";
import { createUsecases } from "../src/app/usecases.ts";
import type { SelectionState } from "../src/domain/types.ts";

/** A short timeout so the 120-second contract can be exercised in milliseconds. */
const CONFIRM_MS = 25;

const setup = (timeout = CONFIRM_MS) => {
  const store = createStore();
  return { store, use: createUsecases(store, car6, timeout) };
};

const AVAILABLE = car6.seats.find((s) => s.available)!.ref;
const ALSO_AVAILABLE = car6.seats.filter((s) => s.available)[1]!.ref;
const TAKEN = car6.seats.find((s) => !s.available)!.ref;

const stateOf = (r: unknown): SelectionState => {
  assert.ok(typeof r === "object" && r !== null && "state" in r,
    `a selection tool must return state, got ${JSON.stringify(r)}`);
  return (r as { state: SelectionState }).state;
};

// -------------------------------------------------------------- SelectionState

test("every selection tool returns full state, on success and on failure alike", () => {
  const { use } = setup();

  const results = [
    use.getSelection(),
    use.undo(),                       // fails: nothing to undo
    use.select({ ref: "not-a-seat" }), // fails: invalid ref
    use.select({ ref: TAKEN }),        // fails: unavailable
    use.select({ ref: AVAILABLE }),    // succeeds
  ];
  for (const r of results) {
    const s = stateOf(r);
    for (const key of ["selected", "selectedCount", "priceTotal_usd", "undoable", "status"]) {
      assert.ok(key in s, `state is missing ${key}: ${JSON.stringify(s)}`);
    }
  }
});

test("selectedCount and priceTotal_usd are re-derived after every transition", () => {
  const { store, use } = setup();
  const price = (ref: string) => car6.seats.find((s) => s.ref === ref)!.price_usd;

  assert.deepEqual(stateOf(use.getSelection()), {
    selected: [], selectedCount: 0, priceTotal_usd: 0, undoable: false, status: "draft",
  });

  use.select({ ref: AVAILABLE });
  let s = stateOf(use.getSelection());
  assert.equal(s.selectedCount, 1);
  assert.equal(s.priceTotal_usd, price(AVAILABLE));

  use.select({ ref: ALSO_AVAILABLE });
  s = stateOf(use.getSelection());
  assert.equal(s.selectedCount, 2);
  assert.equal(s.priceTotal_usd, price(AVAILABLE) + price(ALSO_AVAILABLE));

  // The totals are selectors, not stored fields: they must agree with a fresh derivation.
  assert.deepEqual(s, selectionState(store.getState(), car6));
});

test("undoable means an undo can succeed right now, not that anything happened", () => {
  const { use } = setup();
  assert.equal(stateOf(use.getSelection()).undoable, false, "empty history");
  use.select({ ref: AVAILABLE });
  assert.equal(stateOf(use.getSelection()).undoable, true);
});

// --------------------------------------------------------------------- select

test("select refuses a seat that is already taken", () => {
  const { use } = setup();
  const r = use.select({ ref: TAKEN });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.error.code : "", "NOT_AVAILABLE");
  assert.equal(stateOf(r).selectedCount, 0, "a refused select changes nothing");
});

test("select is append-idempotent and never spends an undo step twice", () => {
  const { store, use } = setup();
  use.select({ ref: AVAILABLE });
  const history = store.getState().history.length;

  const again = use.select({ ref: AVAILABLE });
  assert.equal(again.ok, true, "selecting the same ref again is not an error");
  assert.equal(stateOf(again).selectedCount, 1, "and does not duplicate it");
  assert.equal(store.getState().history.length, history, "and pushes no second snapshot");
});

test("a failed select pushes no snapshot", () => {
  const { store, use } = setup();
  use.select({ ref: TAKEN });
  use.select({ ref: "not-a-seat" });
  assert.equal(store.getState().history.length, 0);
});

// ----------------------------------------------------------------------- undo

test("undo restores one step and names the ref it removed", () => {
  const { use } = setup();
  use.select({ ref: AVAILABLE });
  use.select({ ref: ALSO_AVAILABLE });

  const r = use.undo();
  assert.equal(r.ok, true);
  // The contract is the ref that was undone, not a boolean.
  assert.equal(r.ok === true ? r.data.undone : null, ALSO_AVAILABLE);
  assert.deepEqual(stateOf(r).selected, [AVAILABLE], "one step back, not cleared");
});

test("undo on an empty history fails with unchanged state", () => {
  const { use } = setup();
  const r = use.undo();
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.error.code : "", "NOTHING_TO_UNDO");
  assert.equal(stateOf(r).selectedCount, 0);
});

// ------------------------------------------------------------------- confirm

test("confirm resolves in the same call when a human confirms", async () => {
  const { store, use } = setup();
  use.select({ ref: AVAILABLE });

  const pending = use.confirm();
  assert.equal(store.getState().confirmationStatus, "confirmation_pending");
  store.resolveConfirmation("confirmed");

  const r = await pending;
  assert.equal(r.ok, true);
  assert.equal(r.ok === true ? r.data.outcome : "", "confirmed");
  assert.equal(stateOf(r).status, "confirmed");
  assert.equal(stateOf(r).undoable, false, "a confirmed booking is not undoable");
});

test("a human cancel restores the pre-confirm state and returns to draft", async () => {
  const { store, use } = setup();
  use.select({ ref: AVAILABLE });

  const pending = use.confirm();
  store.resolveConfirmation("cancelled");

  const r = await pending;
  assert.equal(r.ok, true);
  assert.equal(r.ok === true ? r.data.outcome : "", "cancelled");
  assert.equal(stateOf(r).status, "draft");
  assert.deepEqual(stateOf(r).selected, [AVAILABLE], "cancelling confirmation is not undoing");
});

test("a timeout is a successful outcome, not an error", async () => {
  const { use } = setup();
  use.select({ ref: AVAILABLE });

  const r = await use.confirm();
  // The old behaviour was ok:false + CONFIRMATION_REQUIRED, which means the
  // opposite thing: "you must confirm first".
  assert.equal(r.ok, true);
  assert.equal(r.ok === true ? r.data.outcome : "", "timeout");
  assert.equal(stateOf(r).status, "draft");
});

test("the timeout fires on its own, with nothing else holding the event loop", () => {
  // node:test keeps the loop alive, so the test above passes even if the timer is
  // unref'd — and an unref'd timer would make the 120-second contract depend on
  // whatever else the host happens to be doing. Only a bare process proves it.
  const script = `
    import { createStore } from "${import.meta.dirname}/../src/app/store.ts";
    import { createUsecases } from "${import.meta.dirname}/../src/app/usecases.ts";
    import { car6 } from "${import.meta.dirname}/../src/domain/car-6.ts";
    const store = createStore();
    const use = createUsecases(store, car6, 30);
    use.select({ ref: "6-12A" });
    const r = await use.confirm();
    console.log(JSON.stringify({ outcome: r.data.outcome, status: r.state.status }));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script],
    { encoding: "utf8", timeout: 15_000 });

  assert.deepEqual(JSON.parse(out.trim()), { outcome: "timeout", status: "draft" },
    "a confirm left alone must still time out");
});

test("cancelling a confirmation does not consume the user's undo history", async () => {
  const { store, use } = setup();
  use.select({ ref: AVAILABLE });
  const history = store.getState().history.length;

  const pending = use.confirm();
  store.resolveConfirmation("cancelled");
  await pending;

  assert.equal(store.getState().history.length, history);
  assert.equal(stateOf(use.undo()).selectedCount, 0, "the real undo still works afterwards");
});

test("an aborted confirm rejects and is never reported as a human cancellation", async () => {
  const { store, use } = setup(10_000);
  use.select({ ref: AVAILABLE });

  const controller = new AbortController();
  const pending = use.confirm({ signal: controller.signal });
  controller.abort(new Error("the agent gave up"));

  await assert.rejects(pending, /gave up/);
  assert.equal(store.getState().confirmationStatus, "draft", "the dialog state is restored");
});

test("an already-aborted signal rejects before anything is opened", async () => {
  const { store, use } = setup(10_000);
  use.select({ ref: AVAILABLE });
  await assert.rejects(use.confirm({ signal: AbortSignal.abort() }));
  assert.equal(store.getState().confirmationStatus, "draft");
});

test("confirm settles exactly once, whatever races it", async () => {
  const { store, use } = setup(10_000);
  use.select({ ref: AVAILABLE });

  const pending = use.confirm();
  store.resolveConfirmation("confirmed");
  // Late callbacks and racing UI actions must not settle a second time or
  // overwrite the terminal state.
  store.resolveConfirmation("cancelled");
  store.resolveConfirmation("confirmed");

  const r = await pending;
  assert.equal(r.ok === true ? r.data.outcome : "", "confirmed");
});

test("confirm leaves no listener behind", async () => {
  const { store, use } = setup();
  const baseline = store.listenerCount();

  for (let i = 0; i < 5; i++) {
    use.select({ ref: AVAILABLE });
    const pending = use.confirm();
    store.resolveConfirmation("cancelled");
    await pending;
  }

  // Every confirm used to subscribe and never unsubscribe, so one setState
  // eventually ran the check once per confirm ever made.
  assert.equal(store.listenerCount(), baseline,
    `confirm leaked ${store.listenerCount() - baseline} listeners`);
});

test("confirm needs something selected", async () => {
  const { use } = setup();
  const r = await use.confirm();
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.error.code : "", "INVALID_SELECTION");
});

// ------------------------------------------------------------------ the lock

test("while a confirmation is pending, mutations are locked with unchanged state", async () => {
  const { store, use } = setup(10_000);
  use.select({ ref: AVAILABLE });
  const pending = use.confirm();

  for (const r of [use.select({ ref: ALSO_AVAILABLE }), use.undo(), await use.confirm()]) {
    assert.equal(r.ok, false);
    assert.equal(r.ok === false ? r.error.code : "", "CONFIRMATION_REQUIRED");
    assert.deepEqual(stateOf(r).selected, [AVAILABLE], "the locked state is reported in full");
  }
  // Reads stay available while pending.
  assert.equal(use.getSelection().ok, true);
  assert.equal(use.getLayout().ok, true);

  store.resolveConfirmation("cancelled");
  await pending;
});

test("after confirmation the selection is locked for good", async () => {
  const { store, use } = setup(10_000);
  use.select({ ref: AVAILABLE });
  const pending = use.confirm();
  store.resolveConfirmation("confirmed");
  await pending;

  for (const r of [use.select({ ref: ALSO_AVAILABLE }), use.undo(), await use.confirm()]) {
    assert.equal(r.ok === false ? r.error.code : "", "CONFIRMATION_REQUIRED");
  }
});

// ------------------------------------------------------------------ describe

test("describe says whether the seat can actually be booked", () => {
  const { use } = setup();
  const r = use.describe({ ref: TAKEN });
  assert.equal(r.ok, true);
  const data = r.ok === true ? r.data : null;
  assert.equal(data!.attributes["available"], false);
  assert.match(data!.line, /taken/, data!.line);
});

test("describe accepts a landmark, not only a seat", () => {
  const { use } = setup();
  const r = use.describe({ ref: "restroom" });
  assert.equal(r.ok, true, "query takes a landmark as `near`; describe must take one too");
});

test("describe lists what a walk passes, not the place it ends at", () => {
  const { use } = setup();
  const r = use.describe({ ref: AVAILABLE });
  const data = r.ok === true ? r.data : null;
  for (const rel of data!.relations) {
    assert.ok(!rel.landmarksPassed.includes(rel.to),
      `${rel.to} is the destination, not something passed on the way`);
  }
});

test("a wheelchair space is never described as a seat", () => {
  const { use } = setup();
  const space = car6.seats.find((s) => s.wheelchairSpace)!;
  const r = use.describe({ ref: space.ref });
  const line = r.ok === true ? r.data.line : "";
  assert.match(line, /Wheelchair space/);
  assert.ok(!line.startsWith("Seat "), line);
});

// -------------------------------------------------------------------- errors

test("no error message repeats what the caller sent in", () => {
  const { use } = setup();
  const injected = "<img src=x onerror=alert(1)>";
  const results = [
    use.select({ ref: injected }),
    use.describe({ ref: injected }),
    use.getRoute({ from: injected, to: AVAILABLE }),
    use.compare({ refs: [injected, AVAILABLE] }),
  ];
  for (const r of results) {
    assert.equal(r.ok, false);
    const message = r.ok === false ? r.error.message : "";
    assert.ok(!message.includes("<img"), `echoed the caller's string: ${message}`);
  }
});

// ----------------------------------------------------------------- log effect

test("a failed call is still logged but applies no transition", () => {
  const { store, use } = setup();
  use.select({ ref: TAKEN });
  const log = store.getState().toolLog;
  assert.equal(log.at(-1)?.name, "a11y.select");
  assert.deepEqual(store.getState().selection, []);
});

test("a successful query logs the normalized criteria it actually applied", () => {
  const { store, use } = setup();
  const r = use.query({ rail: { side: "window" } });
  assert.equal(r.ok, true);
  const entry = store.getState().toolLog.at(-1)!;
  assert.equal(entry.name, "a11y.query");
  assert.equal(entry.appliedCriteria?.availableOnly, true,
    "the log records the default the caller never typed");
});
