import { glyphFor } from "./symbols.js";

/** Classify a single symbol character for spacing. */
export function classifySymbol(value: string): "ord" | "bin" | "rel" | "open" | "close" | "punct" {
  // Commands (e.g. "\cdot") resolve through the symbol table.
  const g = glyphFor(value);
  if (g?.kind) {
    if (g.kind === "op" || g.kind === "inner") return "ord";
    return g.kind;
  }
  if (value.length === 1) {
    if (value === "+" || value === "-" || value === "*" || value === "/") return "bin";
    if (value === "=" || value === "<" || value === ">") return "rel";
    if (value === "(" || value === "[" || value === "{") return "open";
    if (value === ")" || value === "]" || value === "}") return "close";
    if (value === "," || value === ";" || value === ":") return "punct";
  }
  // Unicode relations
  if (
    value === "≤" ||
    value === "≥" ||
    value === "≠" ||
    value === "≈" ||
    value === "≡" ||
    value === "→" ||
    value === "←" ||
    value === "↔" ||
    value === "⇒" ||
    value === "⇐" ||
    value === "⇔" ||
    value === "↦" ||
    value === "∈" ||
    value === "∉" ||
    value === "⊂" ||
    value === "⊃" ||
    value === "⊆" ||
    value === "⊇"
  ) {
    return "rel";
  }
  if (
    value === "±" ||
    value === "∓" ||
    value === "×" ||
    value === "÷" ||
    value === "·" ||
    value === "∪" ||
    value === "∩" ||
    value === "∧" ||
    value === "∨" ||
    value === "⊕" ||
    value === "⊗"
  ) {
    return "bin";
  }
  return "ord";
}
