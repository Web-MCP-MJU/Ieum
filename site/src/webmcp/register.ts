import type { BearingApplication, CallOptions } from '@/src/application/use-cases';
import { DomainError } from '@/src/domain/errors';
import type { QueryInput, RenderInput } from '@/src/domain/types';
import { inputSchemas, type ToolName } from './schemas';

type ToolDefinition = {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: false; untrustedContentHint: false };
  execute(input: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<unknown>;
};

export type DocumentWithModelContext = {
  modelContext?: {
    registerTool(
      definition: ToolDefinition,
      options: { signal: AbortSignal },
    ): void | Promise<void>;
  };
};

export type WebMCPCapability =
  | 'available'
  | 'unsupported'
  | 'permission-denied'
  | 'security-rejected'
  | 'registration-failed';

function selectionState(app: BearingApplication) {
  const state = app.getState();
  return {
    selected: [...state.selection],
    selectedCount: state.selection.length,
    priceTotal_usd: state.priceTotal_usd,
    undoable: state.confirmationStatus === 'draft' && state.history.length > 0,
    status: state.confirmationStatus,
  };
}

function expectedFailure(error: unknown, app: BearingApplication, withState: boolean) {
  if (!(error instanceof DomainError)) throw error;
  return {
    ok: false,
    error: { code: error.code, message: error.message },
    ...(withState ? { state: selectionState(app) } : {}),
  };
}

function definitions(app: BearingApplication): ToolDefinition[] {
  const annotation = { readOnlyHint: false, untrustedContentHint: false } as const;
  const make = (
    name: ToolName,
    description: string,
    execute: (input: Record<string, unknown>, options: CallOptions) => unknown,
    withState = false,
  ): ToolDefinition => ({
    name,
    description,
    inputSchema: inputSchemas[name],
    annotations: annotation,
    async execute(input, options = {}) {
      try {
        const value = await execute(input, { origin: 'agent', signal: options.signal });
        return { ok: true, ...(name === 'a11y.query' ? value as object : { data: value }), ...(withState ? { state: selectionState(app) } : {}) };
      } catch (error) {
        return expectedFailure(error, app, withState);
      }
    },
  });
  return [
    make('a11y.get_layout', 'Start here when the traveler is new to the car. Returns how many seats exist, how many are '
      + 'available, and the named reference points they can navigate from. Read `summary` aloud: it '
      + 'orients someone who cannot see the seat map.', (input, options) => app.getLayout(input as RenderInput, options)),
    make('a11y.query', 'Find seats matching what the traveler actually said they need. Do not invent criteria — if they '
      + 'have not said what matters, ask them first. Each candidate carries a `line` written to be read '
      + 'aloud. A `hint` appears only when nothing matched or the list was capped; read it so they can '
      + 'narrow or relax the search themselves.', (input, options) => app.query(input as QueryInput, options)),
    make('a11y.describe', 'Describe one seat or reference point and its distance to every other reference. `line` is written '
      + 'to be read aloud. `followUps` are questions to put to the traveler next — ask one rather than '
      + 'ending the exchange, because deciding takes more than one fact.', (input, options) => app.describe(input as Parameters<typeof app.describe>[0], options)),
    make('a11y.get_route', 'Walking directions between two references. Call this whenever the traveler shows interest in a '
      + 'seat: a seat they cannot find is not a seat they can use. `rendered.summary` is written to be '
      + 'read aloud verbatim — it carries the turns, the landmarks passed with their sign text, and the '
      + 'total distance.', (input, options) => app.getRoute(input as Parameters<typeof app.getRoute>[0], options)),
    make('a11y.compare', 'Compare 2 to 4 distinct seats on identical axes, in the order given. Read the axis names once, then '
      + 'each seat in turn, so a listener can hold the shape in memory instead of re-deriving it.', (input, options) => app.compare(input as Parameters<typeof app.compare>[0], options)),
    make('a11y.select', 'Add one available seat to the draft selection. This books nothing — it is a draft the traveler can '
      + 'undo. Say which seat you are about to select and let them agree before calling.', (input, options) => app.select(input as { ref: string }, options), true),
    make('a11y.get_selection', 'Report what is currently selected and the running price total. Use this when the traveler asks what '
      + 'they have chosen so far, rather than relying on earlier conversation.', (_input, options) => app.getSelection({}, options), true),
    make('a11y.undo', 'Undo the last selection by one step and report which seat that removed. Tell the traveler what was '
      + 'undone and what remains selected.', (_input, options) => app.undo({}, options), true),
    make('a11y.confirm', 'Open the confirmation dialog so the traveler can approve the booking. Call this when they say they '
      + 'want to book. It blocks until they answer and returns `confirmed`, `cancelled`, or `timeout` in '
      + 'the same call. Only the traveler acting in the page can produce `confirmed`.', (_input, options) => app.confirm({}, options), true),
  ];
}

export async function registerBearingTools(
  documentLike: DocumentWithModelContext,
  app: BearingApplication,
): Promise<{ capability: WebMCPCapability; dispose(): void }> {
  if (!documentLike.modelContext?.registerTool) {
    return { capability: 'unsupported', dispose() {} };
  }
  const controller = new AbortController();
  try {
    for (const definition of definitions(app)) {
      await documentLike.modelContext.registerTool(definition, { signal: controller.signal });
    }
    return { capability: 'available', dispose: () => controller.abort() };
  } catch (error) {
    controller.abort();
    const name = error instanceof Error ? error.name : '';
    const capability: WebMCPCapability = name === 'NotAllowedError'
      ? 'permission-denied'
      : name === 'SecurityError' ? 'security-rejected' : 'registration-failed';
    return { capability, dispose() {} };
  }
}
