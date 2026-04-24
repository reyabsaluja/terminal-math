export type SymbolGlyph = {
  unicode: string;
  ascii: string;
  /**
   * Classification used by spacing. Ordinary atoms get no extra space;
   * binary/relation/punct atoms receive surrounding whitespace.
   */
  kind?: "ord" | "bin" | "rel" | "op" | "open" | "close" | "punct" | "inner";
};

export function glyphFor(command: string): SymbolGlyph | undefined {
  const e = SYMBOLS[command];
  if (e) return e;
  return undefined;
}

export function pickChar(g: SymbolGlyph, unicode: boolean): string {
  return unicode ? g.unicode : g.ascii;
}

export const SYMBOLS: Record<string, SymbolGlyph> = {
  // Greek lowercase
  "\\alpha": { unicode: "α", ascii: "alpha" },
  "\\beta": { unicode: "β", ascii: "beta" },
  "\\gamma": { unicode: "γ", ascii: "gamma" },
  "\\delta": { unicode: "δ", ascii: "delta" },
  "\\epsilon": { unicode: "ε", ascii: "epsilon" },
  "\\varepsilon": { unicode: "ε", ascii: "epsilon" },
  "\\zeta": { unicode: "ζ", ascii: "zeta" },
  "\\eta": { unicode: "η", ascii: "eta" },
  "\\theta": { unicode: "θ", ascii: "theta" },
  "\\vartheta": { unicode: "ϑ", ascii: "theta" },
  "\\iota": { unicode: "ι", ascii: "iota" },
  "\\kappa": { unicode: "κ", ascii: "kappa" },
  "\\lambda": { unicode: "λ", ascii: "lambda" },
  "\\mu": { unicode: "μ", ascii: "mu" },
  "\\nu": { unicode: "ν", ascii: "nu" },
  "\\xi": { unicode: "ξ", ascii: "xi" },
  "\\pi": { unicode: "π", ascii: "pi" },
  "\\varpi": { unicode: "ϖ", ascii: "pi" },
  "\\rho": { unicode: "ρ", ascii: "rho" },
  "\\varrho": { unicode: "ϱ", ascii: "rho" },
  "\\sigma": { unicode: "σ", ascii: "sigma" },
  "\\varsigma": { unicode: "ς", ascii: "sigma" },
  "\\tau": { unicode: "τ", ascii: "tau" },
  "\\upsilon": { unicode: "υ", ascii: "upsilon" },
  "\\phi": { unicode: "φ", ascii: "phi" },
  "\\varphi": { unicode: "φ", ascii: "phi" },
  "\\chi": { unicode: "χ", ascii: "chi" },
  "\\psi": { unicode: "ψ", ascii: "psi" },
  "\\omega": { unicode: "ω", ascii: "omega" },

  // Greek uppercase
  "\\Gamma": { unicode: "Γ", ascii: "Gamma" },
  "\\Delta": { unicode: "Δ", ascii: "Delta" },
  "\\Theta": { unicode: "Θ", ascii: "Theta" },
  "\\Lambda": { unicode: "Λ", ascii: "Lambda" },
  "\\Xi": { unicode: "Ξ", ascii: "Xi" },
  "\\Pi": { unicode: "Π", ascii: "Pi" },
  "\\Sigma": { unicode: "Σ", ascii: "Sigma" },
  "\\Upsilon": { unicode: "Υ", ascii: "Upsilon" },
  "\\Phi": { unicode: "Φ", ascii: "Phi" },
  "\\Psi": { unicode: "Ψ", ascii: "Psi" },
  "\\Omega": { unicode: "Ω", ascii: "Omega" },

  // Operators / miscellany
  "\\partial": { unicode: "∂", ascii: "d" },
  "\\nabla": { unicode: "∇", ascii: "nabla" },
  "\\infty": { unicode: "∞", ascii: "inf" },
  "\\times": { unicode: "×", ascii: "x", kind: "bin" },
  "\\div": { unicode: "÷", ascii: "/", kind: "bin" },
  "\\cdot": { unicode: "·", ascii: "*", kind: "bin" },
  "\\pm": { unicode: "±", ascii: "+-", kind: "bin" },
  "\\mp": { unicode: "∓", ascii: "-+", kind: "bin" },
  "\\propto": { unicode: "∝", ascii: "~", kind: "rel" },
  "\\circ": { unicode: "∘", ascii: "o", kind: "bin" },
  "\\bullet": { unicode: "•", ascii: "*", kind: "bin" },
  "\\star": { unicode: "⋆", ascii: "*", kind: "bin" },
  "\\oplus": { unicode: "⊕", ascii: "(+)", kind: "bin" },
  "\\otimes": { unicode: "⊗", ascii: "(x)", kind: "bin" },
  "\\ast": { unicode: "∗", ascii: "*", kind: "bin" },

  // Relations
  "\\leq": { unicode: "≤", ascii: "<=", kind: "rel" },
  "\\le": { unicode: "≤", ascii: "<=", kind: "rel" },
  "\\geq": { unicode: "≥", ascii: ">=", kind: "rel" },
  "\\ge": { unicode: "≥", ascii: ">=", kind: "rel" },
  "\\neq": { unicode: "≠", ascii: "!=", kind: "rel" },
  "\\ne": { unicode: "≠", ascii: "!=", kind: "rel" },
  "\\approx": { unicode: "≈", ascii: "~=", kind: "rel" },
  "\\equiv": { unicode: "≡", ascii: "==", kind: "rel" },
  "\\sim": { unicode: "∼", ascii: "~", kind: "rel" },
  "\\simeq": { unicode: "≃", ascii: "~=", kind: "rel" },
  "\\cong": { unicode: "≅", ascii: "~=", kind: "rel" },
  "\\ll": { unicode: "≪", ascii: "<<", kind: "rel" },
  "\\gg": { unicode: "≫", ascii: ">>", kind: "rel" },
  "\\coloneqq": { unicode: "≔", ascii: ":=", kind: "rel" },
  "\\eqqcolon": { unicode: "≕", ascii: "=:", kind: "rel" },
  "\\prec": { unicode: "≺", ascii: "<", kind: "rel" },
  "\\succ": { unicode: "≻", ascii: ">", kind: "rel" },
  "\\preceq": { unicode: "⪯", ascii: "<=", kind: "rel" },
  "\\succeq": { unicode: "⪰", ascii: ">=", kind: "rel" },

  // Sets / logic
  "\\in": { unicode: "∈", ascii: "in", kind: "rel" },
  "\\notin": { unicode: "∉", ascii: "!in", kind: "rel" },
  "\\ni": { unicode: "∋", ascii: "ni", kind: "rel" },
  "\\subset": { unicode: "⊂", ascii: "subset", kind: "rel" },
  "\\supset": { unicode: "⊃", ascii: "supset", kind: "rel" },
  "\\subseteq": { unicode: "⊆", ascii: "subseteq", kind: "rel" },
  "\\supseteq": { unicode: "⊇", ascii: "supseteq", kind: "rel" },
  "\\cup": { unicode: "∪", ascii: "U", kind: "bin" },
  "\\cap": { unicode: "∩", ascii: "^", kind: "bin" },
  "\\setminus": { unicode: "∖", ascii: "\\", kind: "bin" },
  "\\emptyset": { unicode: "∅", ascii: "{}" },
  "\\varnothing": { unicode: "∅", ascii: "{}" },
  "\\forall": { unicode: "∀", ascii: "forall" },
  "\\exists": { unicode: "∃", ascii: "exists" },
  "\\nexists": { unicode: "∄", ascii: "!exists" },
  "\\neg": { unicode: "¬", ascii: "!" },
  "\\lnot": { unicode: "¬", ascii: "!" },
  "\\land": { unicode: "∧", ascii: "&&", kind: "bin" },
  "\\wedge": { unicode: "∧", ascii: "&&", kind: "bin" },
  "\\lor": { unicode: "∨", ascii: "||", kind: "bin" },
  "\\vee": { unicode: "∨", ascii: "||", kind: "bin" },
  "\\implies": { unicode: "⇒", ascii: "=>", kind: "rel" },
  "\\iff": { unicode: "⇔", ascii: "<=>", kind: "rel" },
  "\\therefore": { unicode: "∴", ascii: "therefore" },
  "\\because": { unicode: "∵", ascii: "because" },

  // Arrows
  "\\to": { unicode: "→", ascii: "->", kind: "rel" },
  "\\rightarrow": { unicode: "→", ascii: "->", kind: "rel" },
  "\\leftarrow": { unicode: "←", ascii: "<-", kind: "rel" },
  "\\gets": { unicode: "←", ascii: "<-", kind: "rel" },
  "\\leftrightarrow": { unicode: "↔", ascii: "<->", kind: "rel" },
  "\\Rightarrow": { unicode: "⇒", ascii: "=>", kind: "rel" },
  "\\Leftarrow": { unicode: "⇐", ascii: "<=", kind: "rel" },
  "\\Leftrightarrow": { unicode: "⇔", ascii: "<=>", kind: "rel" },
  "\\mapsto": { unicode: "↦", ascii: "|->", kind: "rel" },
  "\\hookrightarrow": { unicode: "↪", ascii: "->", kind: "rel" },
  "\\longrightarrow": { unicode: "⟶", ascii: "-->", kind: "rel" },
  "\\longleftarrow": { unicode: "⟵", ascii: "<--", kind: "rel" },

  // Dots
  "\\ldots": { unicode: "…", ascii: "..." },
  "\\cdots": { unicode: "⋯", ascii: "..." },
  "\\vdots": { unicode: "⋮", ascii: ":" },
  "\\ddots": { unicode: "⋱", ascii: "..." },
  "\\dots": { unicode: "…", ascii: "..." },

  // Delimiter names
  "\\{": { unicode: "{", ascii: "{", kind: "open" },
  "\\}": { unicode: "}", ascii: "}", kind: "close" },
  "\\lbrace": { unicode: "{", ascii: "{", kind: "open" },
  "\\rbrace": { unicode: "}", ascii: "}", kind: "close" },
  "\\langle": { unicode: "⟨", ascii: "<", kind: "open" },
  "\\rangle": { unicode: "⟩", ascii: ">", kind: "close" },
  "\\lceil": { unicode: "⌈", ascii: "[", kind: "open" },
  "\\rceil": { unicode: "⌉", ascii: "]", kind: "close" },
  "\\lfloor": { unicode: "⌊", ascii: "[", kind: "open" },
  "\\rfloor": { unicode: "⌋", ascii: "]", kind: "close" },
  "\\vert": { unicode: "|", ascii: "|" },
  "\\Vert": { unicode: "‖", ascii: "||" },
  "\\|": { unicode: "‖", ascii: "||" },
  "\\backslash": { unicode: "\\", ascii: "\\" },

  // Spaces (handled in parser usually)
  "\\,": { unicode: " ", ascii: " " },
  "\\;": { unicode: " ", ascii: " " },
  "\\:": { unicode: " ", ascii: " " },
  "\\!": { unicode: "", ascii: "" },
  "\\ ": { unicode: " ", ascii: " " },

  // Miscellaneous
  "\\prime": { unicode: "′", ascii: "'" },
  "\\degree": { unicode: "°", ascii: "deg" },
  "\\angle": { unicode: "∠", ascii: "angle" },
  "\\hbar": { unicode: "ℏ", ascii: "hbar" },
  "\\ell": { unicode: "ℓ", ascii: "l" },
  "\\Re": { unicode: "ℜ", ascii: "Re" },
  "\\Im": { unicode: "ℑ", ascii: "Im" },
  "\\aleph": { unicode: "ℵ", ascii: "aleph" },

  // Escaped characters
  "\\$": { unicode: "$", ascii: "$" },
  "\\%": { unicode: "%", ascii: "%" },
  "\\&": { unicode: "&", ascii: "&" },
  "\\#": { unicode: "#", ascii: "#" },
  "\\_": { unicode: "_", ascii: "_" },
};

/**
 * Operator-name words: rendered upright, never italicized, never transformed
 * through math fonts.
 */
export const UPRIGHT_OPERATORS = new Set<string>([
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "det",
  "ker",
  "gcd",
  "lcm",
  "dim",
  "deg",
  "arg",
  "hom",
  "inf",
  "sup",
  "max",
  "min",
  "argmax",
  "argmin",
  "softmax",
  "lim",
  "liminf",
  "limsup",
  "mod",
]);

export const BIG_OPS: Record<string, { unicode: string; ascii: string }> = {
  "\\int": { unicode: "∫", ascii: "int" },
  "\\iint": { unicode: "∬", ascii: "iint" },
  "\\iiint": { unicode: "∭", ascii: "iiint" },
  "\\oint": { unicode: "∮", ascii: "oint" },
  "\\sum": { unicode: "∑", ascii: "Sum" },
  "\\prod": { unicode: "∏", ascii: "Prod" },
  "\\coprod": { unicode: "∐", ascii: "Coprod" },
  "\\bigcup": { unicode: "⋃", ascii: "U" },
  "\\bigcap": { unicode: "⋂", ascii: "^" },
  "\\bigoplus": { unicode: "⨁", ascii: "(+)" },
  "\\bigotimes": { unicode: "⨂", ascii: "(x)" },
  "\\lim": { unicode: "lim", ascii: "lim" },
  "\\max": { unicode: "max", ascii: "max" },
  "\\min": { unicode: "min", ascii: "min" },
  "\\sup": { unicode: "sup", ascii: "sup" },
  "\\inf": { unicode: "inf", ascii: "inf" },
  "\\argmax": { unicode: "argmax", ascii: "argmax" },
  "\\argmin": { unicode: "argmin", ascii: "argmin" },
};
