import type { TextSegment } from "./segments.js";

/**
 * Scan an arbitrary text and return a list of segments. Never loses characters
 * — every character of the input appears in exactly one segment.
 *
 * Precedence (line-level):
 *   1. Fenced code blocks (``` or ~~~)
 *   2. Markdown tables (consecutive lines starting with `|`)
 * Inline:
 *   1. Display math `$$...$$` or `\[...\]`
 *   2. Inline math `$...$` or `\(...\)`
 *   3. Inline code `` `...` ``
 *
 * This keeps the scanner deliberately simple and conservative — we don't
 * try to parse Markdown as a whole, just pick out segments we care about.
 */
export function scanText(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = input.split("\n");
  let i = 0;

  const flushPlainBuffer = (buf: string[], trailingNewline: boolean) => {
    if (buf.length === 0) {
      if (trailingNewline) segments.push({ type: "plain", value: "\n" });
      return;
    }
    const joined = buf.join("\n") + (trailingNewline ? "\n" : "");
    scanInlineInPlain(joined, segments);
    buf.length = 0;
  };

  const plainBuffer: string[] = [];

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trimStart();

    // Code fence
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})([^`]*)$/);
    if (fenceMatch) {
      flushPlainBuffer(plainBuffer, true);
      const fenceChar = fenceMatch[1]![0]!;
      const fenceLen = fenceMatch[1]!.length;
      const chunk: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const candidate = lines[j]!;
        const t = candidate.trimStart();
        if (t.startsWith(fenceChar.repeat(fenceLen))) {
          chunk.push(candidate);
          j++;
          break;
        }
        chunk.push(candidate);
        j++;
      }
      segments.push({ type: "codeFence", value: chunk.join("\n") });
      i = j;
      // Emit a trailing newline if there are more lines
      if (i < lines.length) segments.push({ type: "plain", value: "\n" });
      continue;
    }

    // Display math $$...$$ on its own line (possibly multi-line)
    if (trimmed.startsWith("$$")) {
      flushPlainBuffer(plainBuffer, true);
      // Case: $$...$$ single line
      const rest = line.trimEnd();
      const inlineClose = rest.lastIndexOf("$$");
      if (inlineClose > rest.indexOf("$$")) {
        const openIdx = rest.indexOf("$$");
        const content = rest.slice(openIdx + 2, inlineClose);
        segments.push({ type: "displayMath", value: content, delimiter: "$$" });
        i++;
        if (i < lines.length) segments.push({ type: "plain", value: "\n" });
        continue;
      }
      // Multi-line: consume until closing $$
      const chunk: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const cand = lines[j]!;
        if (cand.includes("$$")) {
          const closeIdx = cand.indexOf("$$");
          const before = cand.slice(0, closeIdx);
          if (before.length > 0) chunk.push(before);
          break;
        }
        chunk.push(cand);
        j++;
      }
      // Strip the leading $$ on first line
      const firstLineAfter = trimmed.slice(2);
      const body = (firstLineAfter.length > 0 ? firstLineAfter + "\n" : "") + chunk.join("\n");
      segments.push({ type: "displayMath", value: body, delimiter: "$$" });
      i = j + 1;
      if (i < lines.length) segments.push({ type: "plain", value: "\n" });
      continue;
    }

    // Display math \[ ... \]
    if (trimmed.startsWith("\\[")) {
      flushPlainBuffer(plainBuffer, true);
      const startIdx = line.indexOf("\\[");
      const closeInSame = line.indexOf("\\]", startIdx + 2);
      if (closeInSame >= 0) {
        const content = line.slice(startIdx + 2, closeInSame);
        segments.push({ type: "displayMath", value: content, delimiter: "\\[" });
        i++;
        if (i < lines.length) segments.push({ type: "plain", value: "\n" });
        continue;
      }
      const chunk: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const cand = lines[j]!;
        if (cand.includes("\\]")) {
          const closeIdx = cand.indexOf("\\]");
          const before = cand.slice(0, closeIdx);
          if (before.length > 0) chunk.push(before);
          break;
        }
        chunk.push(cand);
        j++;
      }
      const firstAfter = line.slice(startIdx + 2);
      const body = (firstAfter.length > 0 ? firstAfter + "\n" : "") + chunk.join("\n");
      segments.push({ type: "displayMath", value: body, delimiter: "\\[" });
      i = j + 1;
      if (i < lines.length) segments.push({ type: "plain", value: "\n" });
      continue;
    }

    // Markdown table
    if (isTableLine(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
      flushPlainBuffer(plainBuffer, true);
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length) {
        const cand = lines[j]!;
        if (!isTableLine(cand) && !isTableSeparator(cand)) break;
        tableLines.push(cand);
        j++;
      }
      segments.push({ type: "tableRow", value: tableLines.join("\n") });
      i = j;
      if (i < lines.length) segments.push({ type: "plain", value: "\n" });
      continue;
    }

    // Regular plain line; will inline-scan later. We do NOT append a
    // separator here — join("\n") reintroduces line breaks in flush.
    plainBuffer.push(line);
    i++;
  }
  flushPlainBuffer(plainBuffer, false);

  return segments;
}

function isTableLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("|") && t.includes("|", 1);
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  // Each cell is whitespace + dashes (+ optional colons)
  return /^\|(\s*:?-{1,}:?\s*\|)+\s*$/.test(t);
}

/**
 * Inline scan: within a plain-text blob, find inline math / inline code
 * spans and emit separate segments.
 */
function scanInlineInPlain(text: string, segments: TextSegment[]): void {
  if (text.length === 0) return;

  let i = 0;
  let buf = "";

  const flush = () => {
    if (buf.length > 0) {
      segments.push({ type: "plain", value: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i]!;

    // Inline code `...`
    if (ch === "`") {
      // Count backticks for fenced inline code
      let tickCount = 0;
      let k = i;
      while (k < text.length && text[k] === "`") {
        tickCount++;
        k++;
      }
      if (tickCount >= 3) {
        // Could be an inline fence (rare within plain line). Fall through.
      }
      const close = text.indexOf("`".repeat(tickCount), k);
      if (close >= 0 && close > i + tickCount) {
        flush();
        segments.push({ type: "inlineCode", value: text.slice(i, close + tickCount) });
        i = close + tickCount;
        continue;
      }
    }

    // \( ... \)
    if (ch === "\\" && text[i + 1] === "(") {
      const close = findUnescapedSeq(text, "\\)", i + 2);
      if (close >= 0) {
        flush();
        segments.push({
          type: "inlineMath",
          value: text.slice(i + 2, close),
          delimiter: "\\(",
        });
        i = close + 2;
        continue;
      }
    }

    // $...$
    if (ch === "$") {
      if (isLikelyInlineMathStart(text, i)) {
        const close = findInlineMathClose(text, i + 1);
        if (close >= 0) {
          flush();
          segments.push({
            type: "inlineMath",
            value: text.slice(i + 1, close),
            delimiter: "$",
          });
          i = close + 1;
          continue;
        }
      }
    }

    buf += ch;
    i++;
  }
  flush();
}

function findUnescapedSeq(text: string, seq: string, from: number): number {
  let i = from;
  while (i < text.length) {
    const idx = text.indexOf(seq, i);
    if (idx < 0) return -1;
    if (idx > 0 && text[idx - 1] === "\\") {
      i = idx + 1;
      continue;
    }
    return idx;
  }
  return -1;
}

/**
 * Conservative heuristic for $ starting inline math:
 *   - Not immediately followed by whitespace or digit.
 *   - Not preceded by a letter/digit (so "cost$5" doesn't match)
 *   - Not escaped as \$
 */
function isLikelyInlineMathStart(text: string, i: number): boolean {
  if (text[i] !== "$") return false;
  if (i > 0 && text[i - 1] === "\\") return false;
  const next = text[i + 1];
  if (next === undefined) return false;
  if (/\s/.test(next)) return false;
  if (/\d/.test(next)) return false;
  if (next === "$") return false; // that's display $$
  const prev = text[i - 1];
  if (prev !== undefined && /[A-Za-z0-9]/.test(prev)) return false;
  return true;
}

function findInlineMathClose(text: string, from: number): number {
  let i = from;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "\n") {
      // Avoid crossing paragraph boundaries
      if (text[i + 1] === "\n") return -1;
    }
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "$") {
      const prev = text[i - 1];
      if (prev !== undefined && /\s/.test(prev)) {
        i++;
        continue;
      }
      return i;
    }
    i++;
  }
  return -1;
}
