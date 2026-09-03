import { describe, expect, it, vi } from 'vitest';

import { createBearingApplication } from '@/src/application/use-cases';
import { railFixture } from '@/src/data/fixture';
import { registerBearingTools } from '@/src/webmcp/register';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('registerBearingTools', () => {
  it('registers exactly nine canonical tools and disposes them together', async () => {
    const definitions: Array<Record<string, unknown>> = [];
    const signals: AbortSignal[] = [];
    const documentLike = {
      modelContext: {
        async registerTool(definition: Record<string, unknown>, options: { signal: AbortSignal }) {
          definitions.push(definition);
          signals.push(options.signal);
        },
      },
    };
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });
    const registration = await registerBearingTools(documentLike, app);

    expect(registration.capability).toBe('available');
    expect(definitions.map((definition) => definition.name)).toEqual([
      'a11y.get_layout', 'a11y.query', 'a11y.describe', 'a11y.get_route', 'a11y.compare',
      'a11y.select', 'a11y.get_selection', 'a11y.undo', 'a11y.confirm',
    ]);
    expect(definitions.every((definition) =>
      (definition.annotations as { readOnlyHint: boolean }).readOnlyHint === false,
    )).toBe(true);
    expect(new Set(signals).size).toBe(1);
    const undo = definitions.find((definition) => definition.name === 'a11y.undo')!;
    expect(typeof undo.execute).toBe('function');
    registration.dispose();
    expect(signals[0].aborted).toBe(true);
  });

  it('rolls back the shared registration signal after a failure', async () => {
    const signals: AbortSignal[] = [];
    let count = 0;
    const documentLike = {
      modelContext: {
        async registerTool(_definition: Record<string, unknown>, options: { signal: AbortSignal }) {
          signals.push(options.signal);
          count += 1;
          if (count === 4) throw new Error('registration failed');
        },
      },
    };
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });
    const registration = await registerBearingTools(documentLike, app);
    expect(registration.capability).toBe('registration-failed');
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('does not register tools when its owner signal is already aborted', async () => {
    const owner = new AbortController();
    owner.abort();
    const registerTool = vi.fn<() => void>();
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });

    await registerBearingTools({ modelContext: { registerTool } }, app, { signal: owner.signal });

    expect(registerTool).not.toHaveBeenCalled();
  });

  it('stops registration after an owner aborts during the first registration', async () => {
    const owner = new AbortController();
    const firstRegistration = deferred<void>();
    const signals: AbortSignal[] = [];
    const registerTool = vi.fn<(definition: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<void>>((_definition, options) => {
      signals.push(options.signal);
      return firstRegistration.promise;
    });
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });
    const registering = registerBearingTools({ modelContext: { registerTool } }, app, { signal: owner.signal });

    owner.abort();
    firstRegistration.resolve();
    await registering;

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(signals).toHaveLength(1);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('keeps the shared registration signal disposed when an aborted registration rejects late', async () => {
    const owner = new AbortController();
    const firstRegistration = deferred<void>();
    const signals: AbortSignal[] = [];
    const registerTool = vi.fn<(definition: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<void>>((_definition, options) => {
      signals.push(options.signal);
      return firstRegistration.promise;
    });
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });
    const registering = registerBearingTools({ modelContext: { registerTool } }, app, { signal: owner.signal });

    owner.abort();
    firstRegistration.reject(new Error('late registration failure'));
    await registering;

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(signals).toHaveLength(1);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('reports an insecure context before checking model-context availability', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false });
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });

    const registration = await registerBearingTools({}, app);

    expect(registration.capability).toBe('insecure-context');
    if (descriptor) Object.defineProperty(globalThis, 'isSecureContext', descriptor);
    else Reflect.deleteProperty(globalThis, 'isSecureContext');
  });

  it('reports undo as unavailable while human confirmation is pending', async () => {
    const definitions: Array<Record<string, unknown>> = [];
    let settle!: (value: 'cancelled') => void;
    const app = createBearingApplication(railFixture, {
      open: () => new Promise((resolve) => { settle = resolve; }),
    });
    await registerBearingTools({
      modelContext: {
        registerTool(definition: Record<string, unknown>) { definitions.push(definition); },
      },
    }, app);
    const execute = (name: string) => definitions.find((definition) => definition.name === name)!
      .execute as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;

    await execute('a11y.select')({ ref: '6-12A' });
    const pending = execute('a11y.confirm')({});
    const undo = await execute('a11y.undo')({});

    expect(undo).toMatchObject({ ok: false, state: { undoable: false, status: 'confirmation_pending' } });
    settle('cancelled');
    await pending;
  });
});
