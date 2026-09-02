/**
 * WebMCP capability detection.
 * Guards for secure context and document.modelContext availability.
 */

export type ModelContextAPI = {
  registerTool: (tool: ToolDefinition) => void;
  executeTool: (name: string, input: unknown) => Promise<void>;
  getTools: () => ToolDefinition[];
  ontoolchange?: (event: unknown) => void;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
};

let modelContext: ModelContextAPI | null = null;

export function getModelContext(): ModelContextAPI | null {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return (document as any).modelContext ?? null;
  }
  return null;
}

export function ensureSecureContext(): boolean {
  if (typeof window === "undefined" || !window.isSecureContext) {
    console.error("WebMCP requires secure context (HTTPS)");
    return false;
  }
  return true;
}

export function initializeCapability(): ModelContextAPI | null {
  if (!ensureSecureContext()) return null;
  modelContext = getModelContext();
  if (!modelContext) {
    console.warn("document.modelContext not available");
  }
  return modelContext;
}

export function isCapable(): boolean {
  return modelContext !== null;
}

export function assertCapable(): ModelContextAPI {
  if (!modelContext) {
    throw new Error("WebMCP not initialized. Call initializeCapability() first.");
  }
  return modelContext;
}
