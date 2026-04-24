import { type Cell, type CellStyle, SPACE, cloneCell, mergeStyle } from "./cell.js";

export type Box = {
  width: number;
  height: number;
  baseline: number;
  cells: Cell[][];
  tagWidth?: number;
  subShift?: number;
  supShift?: number;
};

export function blankBox(width: number, height: number, baseline = 0): Box {
  const cells: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) row.push({ ch: " " });
    cells.push(row);
  }
  return { width, height, baseline, cells };
}

/**
 * Build a single-row Box from a string. Treats each iterator code point as
 * exactly one cell. Newlines split into rows; baseline defaults to 0 (top row).
 */
export function textBox(text: string, style?: CellStyle): Box {
  if (text === "") return blankBox(0, 1, 0);
  const lines = text.split("\n");
  const rows: string[][] = lines.map((line) => Array.from(line));
  const width = rows.reduce((m, r) => (r.length > m ? r.length : m), 0);
  const height = rows.length;
  const box = blankBox(width, height, 0);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === undefined) continue;
      box.cells[y]![x] = style ? { ch, style: { ...style } } : { ch };
    }
  }
  return box;
}

export function spaceBox(width: number): Box {
  return blankBox(width, 1, 0);
}

export function cloneBox(box: Box): Box {
  const cells: Cell[][] = [];
  for (let y = 0; y < box.height; y++) {
    const row = box.cells[y]!;
    const newRow: Cell[] = [];
    for (let x = 0; x < box.width; x++) {
      const c = row[x];
      newRow.push(c ? cloneCell(c) : { ch: " " });
    }
    cells.push(newRow);
  }
  const out: Box = {
    width: box.width,
    height: box.height,
    baseline: box.baseline,
    cells,
  };
  if (box.tagWidth !== undefined) out.tagWidth = box.tagWidth;
  if (box.subShift !== undefined) out.subShift = box.subShift;
  if (box.supShift !== undefined) out.supShift = box.supShift;
  return out;
}

/**
 * Blit source onto target at offset (x, y). Out-of-bounds cells are clipped.
 * Spaces in source do not overwrite non-space cells in target — this keeps
 * overlapping layouts (e.g. a tall delimiter next to scripts) from erasing
 * meaningful content. Non-space cells always overwrite.
 */
export function blit(target: Box, source: Box, x: number, y: number): void {
  for (let sy = 0; sy < source.height; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= target.height) continue;
    const srcRow = source.cells[sy];
    const dstRow = target.cells[dy];
    if (!srcRow || !dstRow) continue;
    for (let sx = 0; sx < source.width; sx++) {
      const dx = x + sx;
      if (dx < 0 || dx >= target.width) continue;
      const s = srcRow[sx];
      if (!s) continue;
      const d = dstRow[dx];
      if (s.ch === " " && d && d.ch !== " ") continue;
      dstRow[dx] = cloneCell(s);
    }
  }
}

export function overlay(base: Box, child: Box, x: number, y: number): Box {
  const out = cloneBox(base);
  blit(out, child, x, y);
  return out;
}

export function pad(
  box: Box,
  padding: { left?: number; right?: number; top?: number; bottom?: number },
): Box {
  const left = padding.left ?? 0;
  const right = padding.right ?? 0;
  const top = padding.top ?? 0;
  const bottom = padding.bottom ?? 0;
  const width = box.width + left + right;
  const height = box.height + top + bottom;
  const baseline = box.baseline + top;
  const out = blankBox(width, height, baseline);
  blit(out, box, left, top);
  if (box.tagWidth !== undefined) out.tagWidth = box.tagWidth;
  if (box.subShift !== undefined) out.subShift = box.subShift;
  if (box.supShift !== undefined) out.supShift = box.supShift;
  return out;
}

export function center(box: Box, width: number): Box {
  if (width <= box.width) return box;
  const leftPad = Math.floor((width - box.width) / 2);
  const rightPad = width - box.width - leftPad;
  return pad(box, { left: leftPad, right: rightPad });
}

export function rightAlign(box: Box, width: number): Box {
  if (width <= box.width) return box;
  return pad(box, { left: width - box.width });
}

/**
 * Horizontal concatenation with baseline alignment. For each child, pad above
 * and below so that its baseline row lands on the shared output baseline.
 * This is what lets `J + frac{dD}{dt}` align the `J +` with the fraction's
 * horizontal rule.
 */
export function hcat(boxes: Box[], gap = 0): Box {
  const nonEmpty = boxes.filter((b) => b.width > 0 || b.height > 0);
  if (nonEmpty.length === 0) return blankBox(0, 1, 0);

  let above = 0;
  let below = 0;
  for (const b of nonEmpty) {
    if (b.baseline > above) above = b.baseline;
    const bel = b.height - b.baseline - 1;
    if (bel > below) below = bel;
  }
  const outHeight = above + 1 + below;
  const outBaseline = above;

  let totalW = 0;
  for (let i = 0; i < nonEmpty.length; i++) {
    totalW += nonEmpty[i]!.width;
    if (i > 0) totalW += gap;
  }

  const out = blankBox(totalW, outHeight, outBaseline);
  let x = 0;
  for (let i = 0; i < nonEmpty.length; i++) {
    const b = nonEmpty[i]!;
    const y = outBaseline - b.baseline;
    blit(out, b, x, y);
    x += b.width;
    if (i < nonEmpty.length - 1) x += gap;
  }
  return out;
}

export function hcatOverlap(left: Box, right: Box, overlap: number): Box {
  const above = Math.max(left.baseline, right.baseline);
  const below = Math.max(
    left.height - left.baseline - 1,
    right.height - right.baseline - 1,
  );
  const outHeight = above + 1 + below;
  const outBaseline = above;
  const outWidth = Math.max(left.width + right.width - overlap, left.width, right.width);
  const out = blankBox(outWidth, outHeight, outBaseline);
  blit(out, left, 0, outBaseline - left.baseline);
  blit(out, right, left.width - overlap, outBaseline - right.baseline);
  return out;
}

/**
 * hcat, but the right box's baseline is raised by shiftUp rows relative to
 * left's baseline. Used for scripts that ride above the base.
 */
export function hcatShifted(left: Box, right: Box, gap: number, shiftUp: number): Box {
  const leftAbove = left.baseline;
  const leftBelow = left.height - left.baseline - 1;
  const rightAbove = right.baseline + shiftUp;
  const rightBelow = right.height - right.baseline - 1 - shiftUp;
  const above = Math.max(leftAbove, rightAbove);
  const below = Math.max(leftBelow, rightBelow);
  const outHeight = above + 1 + below;
  const outBaseline = above;
  const outWidth = left.width + gap + right.width;
  const out = blankBox(outWidth, outHeight, outBaseline);
  blit(out, left, 0, outBaseline - left.baseline);
  blit(out, right, left.width + gap, outBaseline - right.baseline - shiftUp);
  return out;
}

/**
 * Stack boxes vertically, each centered horizontally in the result. Baseline
 * defaults to the middle row. Callers needing different semantics (e.g. frac
 * with a rule) should set baseline after construction.
 */
export function vstackCentered(boxes: Box[]): Box {
  if (boxes.length === 0) return blankBox(0, 1, 0);
  const width = boxes.reduce((m, b) => (b.width > m ? b.width : m), 0);
  const height = boxes.reduce((s, b) => s + b.height, 0);
  const out = blankBox(width, height, Math.floor(height / 2));
  let y = 0;
  for (const b of boxes) {
    const x = Math.floor((width - b.width) / 2);
    blit(out, b, x, y);
    y += b.height;
  }
  return out;
}

/**
 * Draw a unicode box around content. Interior padding is 1 column left/right,
 * no extra rows top/bottom beyond the borders themselves.
 */
export function frameBox(content: Box, asciiOnly = false): Box {
  const innerPadded = pad(content, { left: 1, right: 1 });
  const width = innerPadded.width + 2;
  const height = innerPadded.height + 2;
  const out = blankBox(width, height, innerPadded.baseline + 1);
  const h = asciiOnly ? "-" : "─";
  const v = asciiOnly ? "|" : "│";
  const tl = asciiOnly ? "+" : "┌";
  const tr = asciiOnly ? "+" : "┐";
  const bl = asciiOnly ? "+" : "└";
  const br = asciiOnly ? "+" : "┘";

  for (let x = 1; x < width - 1; x++) {
    out.cells[0]![x] = { ch: h };
    out.cells[height - 1]![x] = { ch: h };
  }
  for (let y = 1; y < height - 1; y++) {
    out.cells[y]![0] = { ch: v };
    out.cells[y]![width - 1] = { ch: v };
  }
  out.cells[0]![0] = { ch: tl };
  out.cells[0]![width - 1] = { ch: tr };
  out.cells[height - 1]![0] = { ch: bl };
  out.cells[height - 1]![width - 1] = { ch: br };
  blit(out, innerPadded, 1, 1);
  return out;
}

export function applyStyle(box: Box, style: CellStyle): Box {
  const out = cloneBox(box);
  for (let y = 0; y < out.height; y++) {
    const row = out.cells[y]!;
    for (let x = 0; x < out.width; x++) {
      const c = row[x]!;
      if (c.ch === " ") continue;
      const merged = mergeStyle(c.style, style);
      out.cells[y]![x] = merged ? { ch: c.ch, style: merged } : { ch: c.ch };
    }
  }
  return out;
}

export { SPACE };
