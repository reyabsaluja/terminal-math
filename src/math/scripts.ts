/**
 * Unicode-compact superscript/subscript maps. When every character in a
 * script can be mapped, we emit a single-row inline form (`x₁²`); otherwise
 * the renderer falls back to shifted-box layout.
 */

export const SUP_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};

export const SUB_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

/**
 * Try to convert a short plain string into all-superscript Unicode.
 * Returns undefined if any character cannot be mapped. Allows a very short
 * cap so we don't produce unreadable runs.
 */
export function toUnicodeSup(s: string, max = 8): string | undefined {
  if (s.length === 0 || s.length > max) return undefined;
  let out = "";
  for (const ch of s) {
    const m = SUP_MAP[ch];
    if (!m) return undefined;
    out += m;
  }
  return out;
}

export function toUnicodeSub(s: string, max = 8): string | undefined {
  if (s.length === 0 || s.length > max) return undefined;
  let out = "";
  for (const ch of s) {
    const m = SUB_MAP[ch];
    if (!m) return undefined;
    out += m;
  }
  return out;
}
