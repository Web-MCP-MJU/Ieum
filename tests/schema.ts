/**
 * Minimal JSON Schema (draft 2020-12) validator for
 * docs/contracts/ieum-output.schema.json. Not a general JSON Schema engine —
 * it supports exactly the keyword subset that schema uses: $ref (local
 * "#/$defs/..." pointers only), $defs, type (incl. array-valued type),
 * const, enum, required, properties, additionalProperties (false | schema),
 * items, minItems, maxItems, uniqueItems, minimum, maximum, exclusiveMaximum,
 * minLength, maxLength, allOf, oneOf, if/then, and boolean schemas (true /
 * false as a schema value). Any other keyword (patternProperties, format,
 * $anchor, ...) is silently ignored — do not assume full JSON Schema coverage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SchemaError = { path: string; message: string };

type JsonSchema = Record<string, unknown> | boolean;

const typeOf = (v: unknown): string =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a), bk = Object.keys(b);
    return ak.length === bk.length &&
      ak.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
};

const typeMatches = (value: unknown, t: string): boolean => {
  switch (t) {
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "string": return typeof value === "string";
    // Infinity and NaN are JS numbers but not JSON ones: JSON.stringify turns them
    // into null, so a result carrying one silently loses the field on the wire.
    // Architecture 15.2 requires the boundary to reject them, and so does this.
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    default: return false;
  }
};

const resolveRef = (ref: string, root: unknown): JsonSchema => {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref: ${ref}`);
  let node: unknown = root;
  for (const part of ref.slice(2).split("/")) {
    if (typeof node !== "object" || node === null) throw new Error(`cannot resolve $ref ${ref}`);
    node = (node as Record<string, unknown>)[part];
  }
  return node as JsonSchema;
};

const p = (path: string, seg: string | number): string => `${path}/${seg}`;

function validateNode(schema: JsonSchema, value: unknown, path: string, root: unknown, errors: SchemaError[]): void {
  if (schema === true) return;
  if (schema === false) { errors.push({ path, message: "value not allowed here" }); return; }
  const s = schema;

  if (typeof s["$ref"] === "string") validateNode(resolveRef(s["$ref"], root), value, path, root, errors);

  if ("const" in s && !deepEqual(value, s["const"])) {
    errors.push({ path, message: `expected const ${JSON.stringify(s["const"])}, got ${JSON.stringify(value)}` });
  }
  if (Array.isArray(s["enum"]) && !s["enum"].some((a) => deepEqual(a, value))) {
    errors.push({ path, message: `expected one of ${JSON.stringify(s["enum"])}, got ${JSON.stringify(value)}` });
  }
  if (typeof s["type"] === "string" && !typeMatches(value, s["type"])) {
    errors.push({ path, message: `expected type ${s["type"]}, got ${typeOf(value)}` });
  } else if (Array.isArray(s["type"]) && !s["type"].some((t) => typeMatches(value, t as string))) {
    errors.push({ path, message: `expected type one of ${(s["type"] as string[]).join("|")}, got ${typeOf(value)}` });
  }

  if (typeof value === "string") {
    if (typeof s["minLength"] === "number" && value.length < s["minLength"]) {
      errors.push({ path, message: `length ${value.length} < minLength ${s["minLength"]}` });
    }
    if (typeof s["maxLength"] === "number" && value.length > s["maxLength"]) {
      errors.push({ path, message: `length ${value.length} > maxLength ${s["maxLength"]}` });
    }
  }
  if (typeof value === "number") {
    if (typeof s["minimum"] === "number" && value < s["minimum"]) {
      errors.push({ path, message: `${value} < minimum ${s["minimum"]}` });
    }
    if (typeof s["maximum"] === "number" && value > s["maximum"]) {
      errors.push({ path, message: `${value} > maximum ${s["maximum"]}` });
    }
    if (typeof s["exclusiveMaximum"] === "number" && value >= s["exclusiveMaximum"]) {
      errors.push({ path, message: `${value} >= exclusiveMaximum ${s["exclusiveMaximum"]}` });
    }
  }

  if (Array.isArray(value)) {
    if (typeof s["minItems"] === "number" && value.length < s["minItems"]) {
      errors.push({ path, message: `array length ${value.length} < minItems ${s["minItems"]}` });
    }
    if (typeof s["maxItems"] === "number" && value.length > s["maxItems"]) {
      errors.push({ path, message: `array length ${value.length} > maxItems ${s["maxItems"]}` });
    }
    if (s["uniqueItems"] === true) {
      const seen: unknown[] = [];
      for (const item of value) {
        if (seen.some((x) => deepEqual(x, item))) {
          errors.push({ path, message: `duplicate item ${JSON.stringify(item)} violates uniqueItems` });
          break;
        }
        seen.push(item);
      }
    }
    if (s["items"] !== undefined) {
      value.forEach((item, i) => validateNode(s["items"] as JsonSchema, item, p(path, i), root, errors));
    }
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (s["properties"] as Record<string, JsonSchema> | undefined) ?? {};

    if (Array.isArray(s["required"])) {
      for (const key of s["required"] as string[]) {
        if (!(key in obj)) errors.push({ path: p(path, key), message: `missing required property "${key}"` });
      }
    }
    for (const key of Object.keys(props)) {
      if (key in obj) validateNode(props[key]!, obj[key], p(path, key), root, errors);
    }
    if (s["additionalProperties"] === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) errors.push({ path: p(path, key), message: `unexpected property "${key}" (additionalProperties: false)` });
      }
    } else if (s["additionalProperties"] !== undefined && s["additionalProperties"] !== true) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) validateNode(s["additionalProperties"] as JsonSchema, obj[key], p(path, key), root, errors);
      }
    }
  }

  if (Array.isArray(s["allOf"])) {
    for (const sub of s["allOf"] as JsonSchema[]) validateNode(sub, value, path, root, errors);
  }

  if (Array.isArray(s["oneOf"])) {
    const branches = s["oneOf"] as JsonSchema[];
    const results = branches.map((b, i) => {
      const branchErrors: SchemaError[] = [];
      validateNode(b, value, path, root, branchErrors);
      return { i, branchErrors };
    });
    const passing = results.filter((r) => r.branchErrors.length === 0);
    if (passing.length === 0) {
      const detail = results
        .map((r) => `branch ${r.i}: ${r.branchErrors.map((e) => `${e.path} ${e.message}`).join("; ")}`)
        .join(" | ");
      errors.push({ path, message: `matched none of ${branches.length} oneOf branches — ${detail}` });
    } else if (passing.length > 1) {
      errors.push({ path, message: `matched ${passing.length} oneOf branches (expected exactly 1): ${passing.map((r) => r.i).join(",")}` });
    }
  }

  if (s["if"] !== undefined) {
    const ifErrors: SchemaError[] = [];
    validateNode(s["if"] as JsonSchema, value, path, root, ifErrors);
    if (ifErrors.length === 0 && s["then"] !== undefined) {
      validateNode(s["then"] as JsonSchema, value, path, root, errors);
    }
  }
}

export function validate(schema: unknown, value: unknown, rootSchema?: unknown): SchemaError[] {
  const errors: SchemaError[] = [];
  validateNode(schema as JsonSchema, value, "", rootSchema ?? schema, errors);
  return errors;
}

export function loadContract(): unknown {
  const path = join(import.meta.dirname, "..", "docs", "contracts", "ieum-output.schema.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateToolOutput(tool: string, value: unknown): SchemaError[] {
  const root = loadContract() as Record<string, unknown>;
  const properties = root["properties"] as Record<string, JsonSchema>;
  const schema = properties[tool];
  if (schema === undefined) return [{ path: "", message: `unknown tool "${tool}"` }];
  return validate(schema, value, root);
}
