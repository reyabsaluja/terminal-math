export type Token =
  | { type: "char"; value: string; pos: number }
  | { type: "command"; name: string; pos: number } // raw "\foo" including backslash
  | { type: "lbrace"; pos: number }
  | { type: "rbrace"; pos: number }
  | { type: "sup"; pos: number } // ^
  | { type: "sub"; pos: number } // _
  | { type: "amp"; pos: number } // & in envs
  | { type: "dblbackslash"; pos: number } // \\ (row break)
  | { type: "eof"; pos: number };

const SINGLE_ESCAPES = new Set<string>([
  ",",
  ";",
  ":",
  "!",
  " ",
  "{",
  "}",
  "$",
  "%",
  "&",
  "#",
  "_",
  "|",
  "\\",
]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;

  while (i < n) {
    const ch = source[i]!;

    if (ch === "{") {
      tokens.push({ type: "lbrace", pos: i });
      i++;
      continue;
    }
    if (ch === "}") {
      tokens.push({ type: "rbrace", pos: i });
      i++;
      continue;
    }
    if (ch === "^") {
      tokens.push({ type: "sup", pos: i });
      i++;
      continue;
    }
    if (ch === "_") {
      tokens.push({ type: "sub", pos: i });
      i++;
      continue;
    }
    if (ch === "&") {
      tokens.push({ type: "amp", pos: i });
      i++;
      continue;
    }

    if (ch === "\\") {
      if (i + 1 < n && source[i + 1] === "\\") {
        tokens.push({ type: "dblbackslash", pos: i });
        i += 2;
        continue;
      }
      const start = i;
      i++;
      if (i >= n) {
        tokens.push({ type: "command", name: "\\", pos: start });
        continue;
      }
      const next = source[i]!;
      if (SINGLE_ESCAPES.has(next)) {
        tokens.push({ type: "command", name: "\\" + next, pos: start });
        i++;
        continue;
      }
      if (/[a-zA-Z]/.test(next)) {
        let j = i;
        while (j < n && /[a-zA-Z]/.test(source[j]!)) j++;
        const name = "\\" + source.slice(i, j);
        tokens.push({ type: "command", name, pos: start });
        i = j;
        // Skip following spaces, as in TeX
        while (i < n && source[i] === " ") i++;
        continue;
      }
      // Fallback: treat as literal backslash followed by char
      tokens.push({ type: "command", name: "\\" + next, pos: start });
      i++;
      continue;
    }

    tokens.push({ type: "char", value: ch, pos: i });
    i++;
  }

  tokens.push({ type: "eof", pos: n });
  return tokens;
}
