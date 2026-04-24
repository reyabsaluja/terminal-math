import type { MathNode } from "./ast.js";
import type { Box, CellStyle } from "../core/layout.js";
import {
  blankBox,
  blit,
  center,
  hcat,
  pad,
  spaceBox,
  textBox,
  vstackCentered,
  frameBox,
  applyStyle,
} from "../core/layout.js";
import { glyphFor, UPRIGHT_OPERATORS } from "./symbols.js";
import { toUnicodeSub, toUnicodeSup } from "./scripts.js";
import { remapLetter, type FontKind } from "./fonts.js";
import { classifySymbol } from "./spacing.js";
import { boxToString as _boxToString } from "../core/stringify.js";
import { parseMath as _parseMath } from "./parser.js";

export type RenderMathOptions = {
  display?: boolean;
  width?: number;
  unicode?: boolean;
  ascii?: boolean;
  ansi?: boolean;
  center?: boolean;
  compactFractions?: boolean;
  fallback?: "raw" | "plain" | "throw";
};

type Ctx = {
  unicode: boolean;
  ansi: boolean;
  display: boolean;
  fontStack: FontKind[];
  /** Outer upright: when true, latin letters are rendered as-is (not italic). */
  upright: boolean;
  /**
   * When set, trivial fractions (single-char over single-char) in display mode
   * may collapse to slash form. This is the "physics heuristic": we activate
   * it when the surrounding group also contains a big operator so the whole
   * equation already spans multiple visual baselines.
   */
  compactTrivialFracInDisplay: boolean;
};

function defaultCtx(opts: RenderMathOptions): Ctx {
  const unicode = opts.ascii ? false : opts.unicode !== false;
  return {
    unicode,
    ansi: !!opts.ansi,
    display: !!opts.display,
    fontStack: [],
    upright: false,
    compactTrivialFracInDisplay: false,
  };
}

function currentFont(ctx: Ctx): FontKind | undefined {
  return ctx.fontStack.length > 0 ? ctx.fontStack[ctx.fontStack.length - 1] : undefined;
}

function currentStyle(ctx: Ctx): CellStyle | undefined {
  const f = currentFont(ctx);
  if (!f || !ctx.ansi) return undefined;
  if (f === "bf") return { bold: true };
  if (f === "it") return { italic: true };
  return undefined;
}

/** Render a letter with the active math font applied. */
function renderLetter(ch: string, ctx: Ctx): Box {
  const font = currentFont(ctx);
  let rendered = ch;
  if (font && (font === "bb" || font === "cal" || font === "frak")) {
    rendered = remapLetter(ch, font, ctx.unicode);
  }
  const style = currentStyle(ctx);
  return textBox(rendered, style);
}

/* ─── main entry ─────────────────────────────────────────────────────────── */

export function renderNode(node: MathNode, options: RenderMathOptions = {}): Box {
  const ctx = defaultCtx(options);
  const box = renderIn(node, ctx);
  return box;
}

function renderIn(node: MathNode, ctx: Ctx): Box {
  switch (node.type) {
    case "group":
      return renderGroup(node.children, ctx);
    case "symbol":
      return renderSymbolNode(node.value, ctx);
    case "text":
      return textBox(node.value);
    case "space":
      return spaceBox(Math.max(0, node.width));
    case "frac":
      return renderFrac(node.numerator, node.denominator, node.variant, ctx);
    case "sqrt":
      return renderSqrt(node.body, node.degree, ctx);
    case "supsub":
      return renderSupsub(node.base, node.sup, node.sub, ctx);
    case "style":
      return applyStyle(renderIn(node.body, ctx), node.style);
    case "font": {
      ctx.fontStack.push(node.font);
      try {
        return renderIn(node.body, ctx);
      } finally {
        ctx.fontStack.pop();
      }
    }
    case "bigop":
      return renderBigOp(node, ctx);
    case "paren":
      return renderParen(node, ctx);
    case "boxed":
      return frameBox(renderIn(node.body, ctx), !ctx.unicode);
    case "tag":
      // Tags are handled specially at the top level; for nested occurrences we
      // render them as "(body)" on the baseline.
      return hcat([textBox("("), renderIn(node.body, ctx), textBox(")")], 0);
    case "matrix":
      return renderMatrix(node, ctx);
    case "cases":
      return renderCases(node, ctx);
    case "aligned":
      return renderAligned(node, ctx);
    case "accent":
      return renderAccent(node, ctx);
    case "opname":
      return textBox(node.name);
    case "raw":
      return textBox(node.value);
  }
}

/* ─── group + spacing ────────────────────────────────────────────────────── */

function renderGroup(children: MathNode[], ctx: Ctx): Box {
  if (children.length === 0) return blankBox(0, 1, 0);

  // "Physics heuristic": if a display-mode group contains a big operator, a
  // trivial d/dt fraction inside the same group should collapse to slash form
  // so the whole equation doesn't grow too tall in proportion to its meaning.
  const savedCompact = ctx.compactTrivialFracInDisplay;
  if (ctx.display && !savedCompact && hasBigOp(children)) {
    ctx.compactTrivialFracInDisplay = true;
  }

  // Render each child with identity classification, then assemble using
  // heuristic spacing: tight around ord+ord, wider around rel/bin.
  type Item = { box: Box; kind: string; isSpace: boolean; node: MathNode };
  const items: Item[] = [];

  for (const child of children) {
    const kind = classifyChild(child);
    const isSpace = child.type === "space";
    const box = renderIn(child, ctx);
    items.push({ box, kind, isSpace, node: child });
  }

  ctx.compactTrivialFracInDisplay = savedCompact;

  // Build up result with gaps.
  const seq: Box[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (i > 0) {
      const prev = items[i - 1]!;
      const gap = gapBetween(prev, it);
      if (gap > 0) seq.push(spaceBox(gap));
    }
    seq.push(it.box);
  }
  return hcat(seq, 0);
}

function hasBigOp(children: MathNode[]): boolean {
  for (const c of children) {
    if (c.type === "bigop") return true;
    if (c.type === "group" && hasBigOp(c.children)) return true;
    if (c.type === "font" && hasBigOp([c.body])) return true;
  }
  return false;
}

function classifyChild(node: MathNode): string {
  switch (node.type) {
    case "symbol":
      return classifySymbol(node.value);
    case "space":
      return "space";
    case "frac":
    case "sqrt":
    case "supsub":
    case "group":
    case "font":
    case "boxed":
    case "paren":
    case "matrix":
    case "cases":
    case "aligned":
    case "accent":
    case "opname":
    case "text":
    case "raw":
      return "ord";
    case "bigop":
      return "op";
    default:
      return "ord";
  }
}

function gapBetween(
  prev: { kind: string; isSpace: boolean; node: MathNode },
  cur: { kind: string; isSpace: boolean; node: MathNode },
): number {
  if (prev.isSpace || cur.isSpace) return 0;
  const a = prev.kind;
  const b = cur.kind;
  if (a === "rel" || b === "rel") return 1;
  if (a === "bin" || b === "bin") return 1;
  if (a === "punct") return 1;
  // After a big-op with attached limits, separate from the body.
  if (prev.node.type === "bigop" && (prev.node.upper || prev.node.lower)) return 1;
  // After a supsub, separate from the next atom if the next is not a script.
  if (prev.node.type === "supsub" && cur.kind !== "close" && cur.kind !== "punct") return 1;
  // Before a big-op, separate from the previous ord.
  if (cur.node.type === "bigop" && a === "ord") return 1;
  if (a === "op" || b === "op") return 0;
  return 0;
}

/* ─── symbols ────────────────────────────────────────────────────────────── */

function renderSymbolNode(value: string, ctx: Ctx): Box {
  // Backslash-commands that map to symbols table
  if (value.startsWith("\\")) {
    const g = glyphFor(value);
    if (g) {
      const ch = ctx.unicode ? g.unicode : g.ascii;
      return textBox(ch);
    }
    // Unknown command — render stripped name
    return textBox(value.slice(1));
  }

  // Multi-char identifier (e.g. operator names like "sin", or letters)
  if (value.length > 1) {
    return textBox(value);
  }

  // Single character
  if (/[A-Za-z]/.test(value)) {
    return renderLetter(value, ctx);
  }
  return textBox(value);
}

/* ─── scripts ────────────────────────────────────────────────────────────── */

function isTrivialTextNode(n: MathNode): string | undefined {
  if (n.type === "symbol") return n.value;
  if (n.type === "text") return n.value;
  if (n.type === "group" && n.children.length === 0) return "";
  if (n.type === "group") {
    let s = "";
    for (const c of n.children) {
      const v = isTrivialTextNode(c);
      if (v === undefined) return undefined;
      s += v;
    }
    return s;
  }
  return undefined;
}

function flatScriptText(n: MathNode): string | undefined {
  const raw = isTrivialTextNode(n);
  if (raw === undefined) return undefined;
  // Strip a leading backslash or unknown command remains
  if (raw.includes("\\")) return undefined;
  return raw;
}

function renderSupsub(base: MathNode, sup: MathNode | undefined, sub: MathNode | undefined, ctx: Ctx): Box {
  const baseBox = renderIn(base, ctx);

  // Try Unicode-compact form
  let compactSup: string | undefined;
  let compactSub: string | undefined;
  if (ctx.unicode && sup !== undefined) {
    const flat = flatScriptText(sup);
    if (flat !== undefined) compactSup = toUnicodeSup(flat);
  }
  if (ctx.unicode && sub !== undefined) {
    const flat = flatScriptText(sub);
    if (flat !== undefined) compactSub = toUnicodeSub(flat);
  }

  // Second attempt: wrap short non-subscriptable content in ₍ ₎ / ⁽ ⁾. This
  // is the visual idiom for e.g. `∮_C` → `∮₍C₎` — the subscript parens are
  // themselves subscript-size, so the C inside still reads as a label.
  if (ctx.unicode) {
    if (sub !== undefined && compactSub === undefined) {
      const raw = flatScriptText(sub);
      if (raw !== undefined && isShortLabel(raw)) compactSub = `₍${raw}₎`;
    }
    if (sup !== undefined && compactSup === undefined) {
      const raw = flatScriptText(sup);
      if (raw !== undefined && isShortLabel(raw)) compactSup = `⁽${raw}⁾`;
    }
  }

  if (
    (sup === undefined || compactSup !== undefined) &&
    (sub === undefined || compactSub !== undefined)
  ) {
    const str = (compactSub ?? "") + (compactSup ?? "");
    if (str.length === 0) return baseBox;
    return hcat([baseBox, textBox(str)], 0);
  }

  // Fallback: shifted-box layout. Stack sup above baseline, sub below.
  const subBoxRaw = sub !== undefined ? renderIn(sub, ctx) : undefined;
  const supBoxRaw = sup !== undefined ? renderIn(sup, ctx) : undefined;

  // For compact scripts that failed compaction, wrap in parentheses so they
  // read correctly when we lay them out on the baseline.
  const subBox = subBoxRaw;
  const supBox = supBoxRaw;

  // Compose a script column: sup on top (if any), spacing, sub on bottom.
  const width = Math.max(subBox?.width ?? 0, supBox?.width ?? 0);
  if (width === 0) return baseBox;

  // Height assembly:
  //   [sup rows] + [baseline row (empty filler)] + [sub rows]
  const filler = spaceBox(width);
  const stack: Box[] = [];
  if (supBox) stack.push(padToWidth(supBox, width));
  stack.push(filler);
  if (subBox) stack.push(padToWidth(subBox, width));
  const scriptCol = vstackCentered(stack);
  // baseline of scriptCol = supBox.height if supBox present, else 0
  const scriptBaseline = supBox ? supBox.height : 0;
  scriptCol.baseline = scriptBaseline;

  return hcat([baseBox, scriptCol], 0);
}

function bothLimitsAreShortLabels(
  upper: MathNode | undefined,
  lower: MathNode | undefined,
): boolean {
  const check = (n: MathNode | undefined): boolean => {
    if (n === undefined) return true;
    const flat = flatScriptText(n);
    if (flat === undefined) return false;
    return isShortLabel(flat);
  };
  // At least one must exist and both (when present) must be short.
  if (upper === undefined && lower === undefined) return false;
  return check(upper) && check(lower);
}

function isShortLabel(s: string): boolean {
  if (s.length === 0 || s.length > 4) return false;
  // Only accept letters/digits/basic punctuation
  return /^[A-Za-z0-9+\-=,]+$/.test(s);
}

function padToWidth(box: Box, w: number): Box {
  if (box.width >= w) return box;
  return center(box, w);
}

/* ─── fractions ──────────────────────────────────────────────────────────── */

function isSimpleFragment(n: MathNode): boolean {
  // A fragment that compacts nicely into a slash fraction. Rule of thumb:
  // short, no nested stacked constructs.
  if (n.type === "symbol") return true;
  if (n.type === "text") return n.value.length <= 4;
  if (n.type === "font") return isSimpleFragment(n.body);
  if (n.type === "opname") return true;
  if (n.type === "group") {
    let total = 0;
    for (const c of n.children) {
      if (!isSimpleFragment(c)) return false;
      total++;
      if (total > 3) return false;
    }
    return true;
  }
  return false;
}

function renderFrac(
  num: MathNode,
  den: MathNode,
  variant: "normal" | "display" | "text" | undefined,
  ctx: Ctx,
): Box {
  const forceText = variant === "text";
  const forceDisplay = variant === "display";

  // Compact slash heuristic: in inline mode, or inside a display equation
  // dominated by a big operator (the "physics" case — d/dt next to an
  // integral), collapse single-char fractions to slash form.
  if (!forceDisplay) {
    const inline = forceText || !ctx.display;
    if (inline && isSimpleFragment(num) && isSimpleFragment(den)) {
      return hcat([renderIn(num, ctx), textBox("/"), renderIn(den, ctx)], 0);
    }
    if (
      ctx.display &&
      ctx.compactTrivialFracInDisplay &&
      isObviouslyTrivial(num, den)
    ) {
      return hcat([renderIn(num, ctx), textBox("/"), renderIn(den, ctx)], 0);
    }
  }

  const nBox = pad(renderIn(num, ctx), { left: 1, right: 1 });
  const dBox = pad(renderIn(den, ctx), { left: 1, right: 1 });
  const width = Math.max(nBox.width, dBox.width);
  const ruleCh = ctx.unicode ? "─" : "-";
  const ruleStr = ruleCh.repeat(width);
  const ruleBox = textBox(ruleStr);

  const nCentered = center(nBox, width);
  const dCentered = center(dBox, width);
  const stacked = vstackCentered([nCentered, ruleBox, dCentered]);
  stacked.baseline = nCentered.height; // baseline = rule row
  return stacked;
}

function isObviouslyTrivial(num: MathNode, den: MathNode): boolean {
  // d/dt, dx/dt style: both sides are one or two characters.
  const a = flatScriptText(num);
  const b = flatScriptText(den);
  if (a === undefined || b === undefined) return false;
  if (a.length <= 2 && b.length <= 2) return true;
  return false;
}

/* ─── sqrt ───────────────────────────────────────────────────────────────── */

function renderSqrt(body: MathNode, degree: MathNode | undefined, ctx: Ctx): Box {
  const inner = renderIn(body, ctx);

  if (inner.height === 1) {
    // Single-row sqrt: "√body"
    const hook = ctx.unicode ? "√" : "sqrt(";
    const tail = ctx.unicode ? "" : ")";
    const pieces: Box[] = [];
    if (degree !== undefined) {
      const degBox = renderIn(degree, ctx);
      // Attach degree as a superscript to the radical sign
      pieces.push(renderSupsub({ type: "symbol", value: hook }, degree, undefined, ctx));
    } else {
      pieces.push(textBox(hook));
    }
    pieces.push(inner);
    if (tail) pieces.push(textBox(tail));
    return hcat(pieces, 0);
  }

  // Multi-row sqrt with vinculum.
  const vinculum = ctx.unicode ? "─" : "_";
  const bar = textBox(vinculum.repeat(inner.width + 2));
  // body below bar, centered/padded
  const padded = pad(inner, { left: 2, right: 1 });
  const combined = vstackCentered([bar, padded]);
  combined.baseline = padded.baseline + 1; // keep body baseline

  // Prepend radical sign: a vertical stroke with a small hook.
  const radHook = ctx.unicode ? "╱" : "/";
  const radVert = ctx.unicode ? "│" : "|";
  const radRows = combined.height;
  const radBox = blankBox(1, radRows, combined.baseline);
  for (let y = 0; y < radRows; y++) {
    radBox.cells[y]![0] = { ch: y === radRows - 1 ? "√" : radVert };
  }
  // tweak: only bottom row shows √; ascii fallback uses V
  if (!ctx.unicode) {
    for (let y = 0; y < radRows - 1; y++) radBox.cells[y]![0] = { ch: "|" };
    radBox.cells[radRows - 1]![0] = { ch: "V" };
  } else {
    // use radHook for a stroke row just above √ when tall enough
    if (radRows >= 2) {
      radBox.cells[radRows - 2]![0] = { ch: radHook };
    }
  }

  if (degree !== undefined) {
    const degBox = renderIn(degree, ctx);
    return hcat([degBox, radBox, combined], 0);
  }
  return hcat([radBox, combined], 0);
}

/* ─── big operators ──────────────────────────────────────────────────────── */

function renderBigOp(
  node: Extract<MathNode, { type: "bigop" }>,
  ctx: Ctx,
): Box {
  const opBox = textBox(node.op);

  // In display mode, place limits above and below for \sum and \prod-like ops.
  // Integrals even in display mode conventionally take side limits, and a
  // trivial label (single-letter domain, e.g. `\oint_C`) is better rendered
  // inline as `∮₍C₎` than stacked.
  const base: MathNode = { type: "symbol", value: node.op };
  const opSymbol = node.op;
  const isIntegral =
    opSymbol === "∫" || opSymbol === "∬" || opSymbol === "∭" || opSymbol === "∮";
  const limitsAreTrivial =
    bothLimitsAreShortLabels(node.upper, node.lower) && ctx.unicode;

  if (!ctx.display || isIntegral || limitsAreTrivial) {
    const main = renderSupsub(base, node.upper, node.lower, ctx);
    if (node.body !== undefined) return hcat([main, renderIn(node.body, ctx)], 1);
    return main;
  }

  // display: stack upper / op / lower
  const pieces: Box[] = [];
  const hasUpper = node.upper !== undefined;
  const hasLower = node.lower !== undefined;
  const upperBox = hasUpper ? renderIn(node.upper!, ctx) : undefined;
  const lowerBox = hasLower ? renderIn(node.lower!, ctx) : undefined;
  const width = Math.max(opBox.width, upperBox?.width ?? 0, lowerBox?.width ?? 0);

  const centeredOp = center(opBox, width);
  const centeredUpper = upperBox ? center(upperBox, width) : undefined;
  const centeredLower = lowerBox ? center(lowerBox, width) : undefined;

  const stack: Box[] = [];
  if (centeredUpper) stack.push(centeredUpper);
  stack.push(centeredOp);
  if (centeredLower) stack.push(centeredLower);
  const stacked = vstackCentered(stack);
  // baseline = row of op
  stacked.baseline = centeredUpper ? centeredUpper.height : 0;
  pieces.push(stacked);
  if (node.body !== undefined) pieces.push(renderIn(node.body, ctx));
  return hcat(pieces, 1);
}

/* ─── delimiters ─────────────────────────────────────────────────────────── */

const TALL_PIECES_UNICODE: Record<string, { top: string; ext: string; bot: string }> = {
  "(": { top: "⎛", ext: "⎜", bot: "⎝" },
  ")": { top: "⎞", ext: "⎟", bot: "⎠" },
  "[": { top: "⎡", ext: "⎢", bot: "⎣" },
  "]": { top: "⎤", ext: "⎥", bot: "⎦" },
  "{": { top: "⎧", ext: "⎪", bot: "⎩" },
  "}": { top: "⎫", ext: "⎪", bot: "⎭" },
  "|": { top: "│", ext: "│", bot: "│" },
  "‖": { top: "‖", ext: "‖", bot: "‖" },
};

const TALL_PIECES_ASCII: Record<string, { top: string; ext: string; bot: string }> = {
  "(": { top: "/", ext: "|", bot: "\\" },
  ")": { top: "\\", ext: "|", bot: "/" },
  "[": { top: "|", ext: "|", bot: "|" },
  "]": { top: "|", ext: "|", bot: "|" },
  "{": { top: "/", ext: "|", bot: "\\" },
  "}": { top: "\\", ext: "|", bot: "/" },
  "|": { top: "|", ext: "|", bot: "|" },
  "‖": { top: "|", ext: "|", bot: "|" },
};

function buildTallDelim(ch: string, height: number, unicode: boolean): Box {
  if (ch === "." || ch === "") return blankBox(0, height, Math.floor(height / 2));
  if (height <= 1) {
    const display = ch;
    return textBox(display);
  }
  const set = unicode ? TALL_PIECES_UNICODE : TALL_PIECES_ASCII;
  const pieces = set[ch];
  if (!pieces) {
    // Unknown character — replicate vertically
    const box = blankBox(1, height, Math.floor(height / 2));
    for (let y = 0; y < height; y++) box.cells[y]![0] = { ch };
    return box;
  }
  const box = blankBox(1, height, Math.floor(height / 2));
  box.cells[0]![0] = { ch: pieces.top };
  box.cells[height - 1]![0] = { ch: pieces.bot };
  for (let y = 1; y < height - 1; y++) box.cells[y]![0] = { ch: pieces.ext };
  return box;
}

function renderParen(
  node: Extract<MathNode, { type: "paren" }>,
  ctx: Ctx,
): Box {
  const body = renderIn(node.body, ctx);
  const height = body.height;
  const left = buildTallDelim(node.left, height, ctx.unicode);
  const right = buildTallDelim(node.right, height, ctx.unicode);
  // Align baselines
  left.baseline = body.baseline;
  right.baseline = body.baseline;
  return hcat([left, body, right], 0);
}

/* ─── matrices / cases / aligned ─────────────────────────────────────────── */

function renderMatrix(node: Extract<MathNode, { type: "matrix" }>, ctx: Ctx): Box {
  const rowBoxes: Box[][] = node.rows.map((row) => row.map((cell) => renderIn(cell, ctx)));
  if (rowBoxes.length === 0) return blankBox(0, 1, 0);

  const numCols = rowBoxes.reduce((m, r) => Math.max(m, r.length), 0);
  const colWidths: number[] = new Array(numCols).fill(0);
  const rowHeights: number[] = new Array(rowBoxes.length).fill(0);
  const rowBaselines: number[] = new Array(rowBoxes.length).fill(0);

  for (let r = 0; r < rowBoxes.length; r++) {
    const row = rowBoxes[r]!;
    let above = 0;
    let below = 0;
    for (let c = 0; c < row.length; c++) {
      const b = row[c]!;
      if (b.width > colWidths[c]!) colWidths[c] = b.width;
      if (b.baseline > above) above = b.baseline;
      const bel = b.height - b.baseline - 1;
      if (bel > below) below = bel;
    }
    rowHeights[r] = above + 1 + below;
    rowBaselines[r] = above;
  }

  const colGap = 2;
  const rowGap = 0;
  const contentWidth =
    colWidths.reduce((s, w) => s + w, 0) + colGap * Math.max(0, numCols - 1);
  const contentHeight =
    rowHeights.reduce((s, h) => s + h, 0) + rowGap * Math.max(0, rowBoxes.length - 1);
  const content = blankBox(contentWidth, contentHeight, Math.floor(contentHeight / 2));

  let y = 0;
  for (let r = 0; r < rowBoxes.length; r++) {
    let x = 0;
    const row = rowBoxes[r]!;
    const rowBaseline = rowBaselines[r]!;
    for (let c = 0; c < numCols; c++) {
      const cell = row[c];
      const colW = colWidths[c]!;
      if (cell) {
        const cx = x + Math.floor((colW - cell.width) / 2);
        const cy = y + (rowBaseline - cell.baseline);
        blit(content, cell, cx, cy);
      }
      x += colW + (c < numCols - 1 ? colGap : 0);
    }
    y += rowHeights[r]! + rowGap;
  }

  // Delimiters
  let left = "";
  let right = "";
  switch (node.kind) {
    case "pmatrix":
      left = "(";
      right = ")";
      break;
    case "bmatrix":
      left = "[";
      right = "]";
      break;
    case "Bmatrix":
      left = "{";
      right = "}";
      break;
    case "vmatrix":
      left = "|";
      right = "|";
      break;
    case "Vmatrix":
      left = "‖";
      right = "‖";
      break;
    case "matrix":
    default:
      left = "";
      right = "";
  }
  const padded = pad(content, { left: 1, right: 1 });
  const lBox = buildTallDelim(left, padded.height, ctx.unicode);
  const rBox = buildTallDelim(right, padded.height, ctx.unicode);
  lBox.baseline = padded.baseline;
  rBox.baseline = padded.baseline;
  return hcat([lBox, padded, rBox], 0);
}

function renderCases(node: Extract<MathNode, { type: "cases" }>, ctx: Ctx): Box {
  const rows: Box[][] = node.rows.map((r) => {
    const row: Box[] = [renderIn(r.expr, ctx)];
    if (r.condition) row.push(renderIn(r.condition, ctx));
    return row;
  });
  const matrix: Extract<MathNode, { type: "matrix" }> = {
    type: "matrix",
    kind: "matrix",
    rows: node.rows.map((r) => {
      const cells: MathNode[] = [r.expr];
      if (r.condition) cells.push(r.condition);
      return cells;
    }),
  };
  const body = renderMatrix(matrix, ctx);
  // Add a left brace
  const brace = buildTallDelim("{", body.height, ctx.unicode);
  brace.baseline = body.baseline;
  return hcat([brace, body], 0);
  void rows; // not otherwise used
}

function renderAligned(node: Extract<MathNode, { type: "aligned" }>, ctx: Ctx): Box {
  if (node.rows.length === 0) return blankBox(0, 1, 0);
  const numCols = node.rows.reduce((m, r) => Math.max(m, r.columns.length), 0);
  const matrix: Extract<MathNode, { type: "matrix" }> = {
    type: "matrix",
    kind: "matrix",
    rows: node.rows.map((r) => {
      const cells: MathNode[] = [];
      for (let i = 0; i < numCols; i++) cells.push(r.columns[i] ?? { type: "group", children: [] });
      return cells;
    }),
  };
  return renderMatrix(matrix, ctx);
}

/* ─── accents ────────────────────────────────────────────────────────────── */

function renderAccent(node: Extract<MathNode, { type: "accent" }>, ctx: Ctx): Box {
  const body = renderIn(node.body, ctx);
  if (!ctx.unicode) return body;

  const accentChar = (() => {
    switch (node.kind) {
      case "hat":
      case "widehat":
        return "^";
      case "tilde":
      case "widetilde":
        return "~";
      case "bar":
      case "overline":
        return "─";
      case "vec":
        return "→";
      case "dot":
        return "˙";
      case "ddot":
        return "¨";
      default:
        return "";
    }
  })();
  if (!accentChar) return body;
  const accentStr = accentChar.repeat(body.width);
  const accentBox = textBox(accentStr);
  const stacked = vstackCentered([accentBox, body]);
  stacked.baseline = body.baseline + 1;
  return stacked;
}

/* ─── public helpers ─────────────────────────────────────────────────────── */

export function renderMath(input: string, options: RenderMathOptions = {}): string {
  const fallback = options.fallback ?? "raw";
  try {
    const ast = _parseMath(input);
    const box = renderNode(ast, options);
    let out = _boxToString(box, { ansi: !!options.ansi, trim: true });
    if (options.center && options.width && options.width > 0) {
      const lines = out.split("\n");
      const maxW = lines.reduce((m, l) => Math.max(m, visibleWidth(l)), 0);
      if (maxW < options.width) {
        const leftPad = " ".repeat(Math.max(0, Math.floor((options.width - maxW) / 2)));
        out = lines.map((l) => leftPad + l).join("\n");
      }
    }
    return out;
  } catch (err) {
    if (fallback === "throw") throw err;
    if (fallback === "plain") return plainFallback(input, !!options.unicode || options.ascii !== true);
    return input;
  }
}

function visibleWidth(s: string): number {
  // Strip ANSI for width measurement
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  // Count unicode scalar characters, not utf-16 code units
  let n = 0;
  for (const _ of stripped) n++;
  return n;
}

export function plainFallback(input: string, unicode: boolean): string {
  // Lightweight symbol-replacement-only rendering, used when parsing fails.
  let s = input;
  s = s.replace(/\\([a-zA-Z]+)/g, (_m, name: string) => {
    const g = glyphFor("\\" + name);
    if (!g) return name;
    return unicode ? g.unicode : g.ascii;
  });
  s = s.replace(/[{}]/g, "");
  return s;
}

export { UPRIGHT_OPERATORS };
