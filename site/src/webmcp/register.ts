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
    undoable: state.history.length > 0,
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
    make('a11y.get_layout', 'Return the current accessible rail layout and stable references.', (input, options) => app.getLayout(input as RenderInput, options)),
    make('a11y.query', 'Find rail seats using explicit spatial and accessibility criteria.', (input, options) => app.query(input as QueryInput, options)),
    make('a11y.describe', 'Describe one valid layout reference and its spatial relations.', (input, options) => app.describe(input as Parameters<typeof app.describe>[0], options)),
    make('a11y.get_route', 'Return a structured route between two valid layout references.', (input, options) => app.getRoute(input as Parameters<typeof app.getRoute>[0], options)),
    make('a11y.compare', 'Compare two to four seat references on identical axes.', (input, options) => app.compare(input as Parameters<typeof app.compare>[0], options)),
    make('a11y.select', 'Add one available seat to the draft selection.', (input, options) => app.select(input as { ref: string }, options), true),
    make('a11y.get_selection', 'Return the current draft selection.', (_input, options) => app.getSelection({}, options), true),
    make('a11y.undo', 'Undo the most recent selection change.', (_input, options) => app.undo({}, options), true),
    make('a11y.confirm', 'Ask the human to confirm the current selection in the page.', (_input, options) => app.confirm({}, options), true),
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
