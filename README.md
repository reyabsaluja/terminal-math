# terminal-math-typesetter

Render LaTeX-like math inside arbitrary terminal text as beautiful
Unicode/ASCII text art.

Drop a whole assistant message into `formatMathInText` and get back a
terminal-safe string where only the math has been transformed — the prose,
Markdown headings, code fences, inline code, tables, and horizontal rules
are preserved verbatim.

- Not a full LaTeX engine.
- Not a Markdown renderer.
- Not SVG, not images, not MathJax, not KaTeX.
- Preserves non-math content by default.
- Pure TypeScript. Zero runtime dependencies.
- Returns strings. Does not write to stdout.
- Inspired by [Hyades](https://github.com/apology-is-policy/hyades)-style
  plain-text typesetting.

## Install

```sh
npm install terminal-math-typesetter
```

## Quick start

```ts
import { formatMathInText } from "terminal-math-typesetter";

const pretty = formatMathInText(assistantResponse, {
  width: process.stdout.columns ?? 100,
  unicode: true,
  ansi: true,
  preserveMarkdown: true,
});

process.stdout.write(pretty);
```

## Examples

### Inline math

```ts
formatMathInText("The equation $x_1^2 + y_1^2 = r^2$ is useful.")
```

```
The equation x₁² + y₁² = r² is useful.
```

### Display math with a stacked fraction

```ts
formatMathInText(`
**Differential form:**
$$\\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}$$
`, { width: 80 });
```

```
**Differential form:**

               ∂D
  ∇ × H = J + ────
               ∂t
```

### Mixed prose, display math, and a Markdown table

Input:

```
**Integral form:**
$$\oint_C \mathbf{H} \cdot d\mathbf{l} = \int_S \mathbf{J} \cdot d\mathbf{S} + \frac{d}{dt} \int_S \mathbf{D} \cdot d\mathbf{S}$$

### Key Terms:
| Symbol | Meaning |
|--------|---------|
| **H** | Magnetic field intensity |
```

Output:

```
**Integral form:**

  ∮₍C₎ H · dl = ∫₍S₎ J · dS + d/dt ∫₍S₎ D · dS

### Key Terms:
| Symbol | Meaning |
|--------|---------|
| **H** | Magnetic field intensity |
```

### Code fences are preserved

```ts
const src = "```ts\nconst s = '$x^2$';\n```";
formatMathInText(src) === src; // true
```

## Public API

```ts
import {
  formatMathInText,
  renderMath,
  parseMath,
  renderNode,
  boxToString,
  MathParseError,
} from "terminal-math-typesetter";
```

### `formatMathInText(input, options?)` — the top-level API

```ts
type FormatTextOptions = {
  width?: number;
  unicode?: boolean;
  ascii?: boolean;
  ansi?: boolean;
  preserveMarkdown?: boolean;   // default true
  transformTables?: boolean;    // default false
  skipCodeFences?: boolean;     // default true
  skipInlineCode?: boolean;     // default true
  centerDisplayMath?: boolean;  // default false
  displayMathSpacing?: boolean; // default true
  fallback?: "raw" | "plain" | "throw"; // default "raw"
};
```

### `renderMath(input, options?)`

Render a single math expression to a string.

```ts
type RenderMathOptions = {
  display?: boolean;
  width?: number;
  unicode?: boolean;
  ascii?: boolean;
  ansi?: boolean;
  center?: boolean;
  compactFractions?: boolean;
  fallback?: "raw" | "plain" | "throw";
};
```

### Lower-level API

- `parseMath(input) -> MathNode` — parse LaTeX-ish math into an AST.
- `renderNode(node, options?) -> Box` — render an AST node to a Box.
- `boxToString(box, options?) -> string` — serialize a Box to a terminal
  string with optional ANSI styling.
- `Box` primitives: `blankBox`, `textBox`, `hcat`, `vstackCentered`,
  `frameBox`, `pad`, `center`, `applyStyle`, etc.

## Supported math

- **Symbols:** letters, digits, punctuation, Greek, operators, relations,
  arrows, logic, set theory, common miscellany.
- **Scripts:** `x_1^2`, `x^2_1`, `x^{n+1}`, `a_{i,j}`, `\int_0^\infty`.
  Compact Unicode scripts are used where possible; otherwise fall back to
  shifted-box layout.
- **Fractions:** `\frac{a}{b}`, `\dfrac`, `\tfrac`. Simple fractions in
  inline mode compact to `a/b`; a trivial `\frac{d}{dt}` in a display
  equation dominated by a big operator also collapses to slash form.
- **Roots:** `\sqrt{x}`, `\sqrt[3]{x}`, with overbar for multi-row bodies.
- **Math fonts:** `\mathbf`, `\mathit`, `\mathrm`, `\mathbb` (ℕ ℤ ℚ ℝ ℂ),
  `\mathcal`, `\mathfrak`. In ANSI mode `\mathbf` maps to bold.
- **Boxed:** `\boxed{…}` draws a Unicode/ASCII frame.
- **Tags:** `\tag{1}` is parsed (rendered inline as `(1)` for now).
- **Delimiters:** `\left( … \right)`, scalable parens, brackets, braces,
  `|`, `\|`.
- **Big operators:** `\int`, `\iint`, `\iiint`, `\oint`, `\sum`, `\prod`,
  `\lim`, `\max`, `\min`, `\argmax`, `\argmin`, with subscripts/superscripts
  placed as over/under limits in display mode (with sensible exceptions for
  trivial labels).
- **Matrices:** `pmatrix`, `bmatrix`, `Bmatrix`, `vmatrix`, `Vmatrix`.
- **Cases:** `\begin{cases}…\end{cases}`.
- **Aligned equations:** `\begin{aligned}…\end{aligned}`.
- **Accents:** `\hat`, `\tilde`, `\bar`, `\vec`, `\overline`, etc.

## Segment scanner

The top-level formatter scans arbitrary text and emits segments:

- fenced code blocks (``` / ~~~)
- inline code spans
- Markdown tables
- display math (`$$…$$`, `\[…\]`)
- inline math (`$…$`, `\(…\)`)
- plain text

Only math segments are transformed. Everything else is passed through
untouched.

### False-positive guards for `$`

- `$5` currency is not treated as math.
- `$ npm install` shell prompts are not treated as math.
- A `$` that opens inline math cannot be followed by whitespace or a digit.
- A `$` that closes inline math cannot be preceded by whitespace.

## Graceful failure

By default, if parsing or rendering fails, the original input is preserved:

```ts
formatMathInText("Here is broken $\\frac{a}{b$ text")
// "Here is broken $\\frac{a}{b$ text"
```

Set `fallback: "plain"` to apply a lightweight symbol-replacement fallback,
or `fallback: "throw"` to surface a `MathParseError`.

## ASCII mode

Set `ascii: true` (or `unicode: false`) to produce output safe for terminals
without Unicode math glyphs: `-` instead of `─`, `sqrt(x)` instead of `√x`,
Greek letter names instead of Unicode Greek, etc.

## Known limitations

- Not full LaTeX — no custom macros, no `\newcommand`, no environments
  beyond the list above.
- Only explicit math delimiters are transformed; no "undelimited math
  detection".
- Markdown tables are preserved verbatim by default (opt in with
  `transformTables: true`).
- Unicode width handling is approximate (fine for typical Western + math
  glyphs; CJK mixed with math is out of scope).
- No full scalable delimiter support for very tall matrices (top/mid/bot
  pieces only; middle extension is the 1-char default).
- No SVG/image rendering. No terminal image protocol. No React/Ink.

## Roadmap

- Richer scalable delimiters with piece-accurate extensions.
- Full-width matrix / cases / aligned rendering with column alignment
  markers.
- Better right-justified equation tags (`\tag{N}`).
- Extended symbol coverage.
- Better wcwidth handling for CJK-mixed math.
- Optional undelimited math detection.
- Optional deep Markdown rendering.
- Finer ANSI style control.

## License

MIT.
