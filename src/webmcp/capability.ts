/**
 * WebMCP capability detection.
 * Guards for secure context and `document.modelContext` availability, and
 * classifies registration failures per Architecture 15.4.
 */

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown, ctx: { signal: AbortSignal }) => unknown;
};

export type ModelContextAPI = {
  registerTool: (tool: ToolDefinition, options: { signal: AbortSignal }) => Promise<void>;
  executeTool: (name: string, input: unknown) => Promise<void>;
  getTools: () => ToolDefinition[];
  ontoolchange?: (event: unknown) => void;
};

/** The shape `document` takes once a WebMCP host has installed the API. */
interface DocumentWithModelContext {
  modelContext?: ModelContextAPI;
}

/** Architecture 15.4: bootstrap diagnostics, kept out of `ToolErrorCode`. */
export type WebMCPCapability =
  | "available"
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "security-rejected"
  | "registration-failed";

export function ensureSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

/**
 * Reads `document.modelContext` fresh on every call. There is no separate
 * cached copy, so nothing can disagree with what this returns.
 */
export function getModelContext(): ModelContextAPI | null {
  if (typeof document === "undefined") return null;
  const ctx = (document as DocumentWithModelContext).modelContext;
  return typeof ctx?.registerTool === "function" ? ctx : null;
}

export function isCapable(): boolean {
  return ensureSecureContext() && getModelContext() !== null;
}

export function assertCapable(): ModelContextAPI {
  if (!ensureSecureContext()) {
    throw new Error("WebMCP requires a secure context (HTTPS)");
  }
  const ctx = getModelContext();
  if (!ctx) {
    throw new Error("document.modelContext is not available");
  }
  return ctx;
}

/** The bootstrap diagnostic itself, before any registration is attempted. */
export function detectCapability(): WebMCPCapability {
  if (!ensureSecureContext()) return "insecure-context";
  if (!getModelContext()) return "unsupported";
  return "available";
}

/** Classifies a `registerTool` rejection per Architecture 15.4. */
export function classifyRegistrationError(e: unknown): WebMCPCapability {
  const name = e instanceof Error ? e.name : "";
  if (name === "NotAllowedError") return "permission-denied";
  if (name === "SecurityError") return "security-rejected";
  return "registration-failed";
}
