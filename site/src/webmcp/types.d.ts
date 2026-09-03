export {};

declare global {
  interface Document {
    modelContext?: {
      registerTool(
        definition: Record<string, unknown>,
        options: { signal: AbortSignal },
      ): void | Promise<void>;
    };
  }
}
