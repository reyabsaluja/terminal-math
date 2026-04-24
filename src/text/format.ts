import { scanText } from "./scan.js";
import type { TextSegment } from "./segments.js";
import { renderMath } from "../math/render.js";
import { parseMath } from "../math/parser.js";
import { renderNode } from "../math/render.js";
import { boxToString } from "../core/stringify.js";
import { MathParseError } from "../core/errors.js";

export type FormatTextOptions = {
  width?: number;
  unicode?: boolean;
  ascii?: boolean;
  ansi?: boolean;
  preserveMarkdown?: boolean;
  transformTables?: boolean;
  skipCodeFences?: boolean;
  skipInlineCode?: boolean;
  centerDisplayMath?: boolean;
  displayMathSpacing?: boolean;
  fallback?: "raw" | "plain" | "throw";
};

export function formatMathInText(input: string, options: FormatTextOptions = {}): string {
  const opts: Required<FormatTextOptions> = {
    width: options.width ?? 100,
    unicode: options.ascii ? false : options.unicode ?? true,
    ascii: options.ascii ?? false,
    ansi: options.ansi ?? false,
    preserveMarkdown: options.preserveMarkdown ?? true,
    transformTables: options.transformTables ?? false,
    skipCodeFences: options.skipCodeFences ?? true,
    skipInlineCode: options.skipInlineCode ?? true,
    centerDisplayMath: options.centerDisplayMath ?? false,
    displayMathSpacing: options.displayMathSpacing ?? true,
    fallback: options.fallback ?? "raw",
  };

  const segments = scanText(input);
  const parts: string[] = [];

  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx]!;
    parts.push(renderSegment(seg, opts));
  }

  return parts.join("");
}

function renderSegment(seg: TextSegment, opts: Required<FormatTextOptions>): string {
  switch (seg.type) {
    case "plain":
      return seg.value;

    case "codeFence":
      if (opts.skipCodeFences) return seg.value;
      // With skipCodeFences=false we still don't transform inside: conservative.
      return seg.value;

    case "inlineCode":
      if (opts.skipInlineCode) return seg.value;
      return seg.value;

    case "tableRow":
      if (!opts.transformTables) return seg.value;
      return renderTableRow(seg.value, opts);

    case "inlineMath":
      return renderInlineMathSafely(seg.value, opts);

    case "displayMath":
      return renderDisplayMathSafely(seg.value, opts);
  }
}

function renderInlineMathSafely(src: string, opts: Required<FormatTextOptions>): string {
  try {
    if (opts.fallback === "throw") assertBalanced(src);
    const ast = parseMath(src);
    const box = renderNode(ast, {
      display: false,
      unicode: opts.unicode,
      ascii: opts.ascii,
      ansi: opts.ansi,
    });
    // Inline: render the box to a single line where possible.
    const str = boxToString(box, { ansi: opts.ansi, trim: true });
    // If the box is multi-row, just keep the baseline row for inline usage.
    if (str.includes("\n")) {
      const lines = str.split("\n");
      // Prefer the baseline row
      return lines[box.baseline] ?? lines[0] ?? str;
    }
    return str;
  } catch (err) {
    if (opts.fallback === "throw") throw wrapParseError(err, src);
    if (opts.fallback === "plain") {
      return renderMath(src, {
        unicode: opts.unicode,
        ascii: opts.ascii,
        fallback: "plain",
      });
    }
    return `$${src}$`;
  }
}

function renderDisplayMathSafely(src: string, opts: Required<FormatTextOptions>): string {
  const trimmed = src.replace(/^\n+/, "").replace(/\n+$/, "");
  try {
    if (opts.fallback === "throw") assertBalanced(trimmed);
    const ast = parseMath(trimmed);
    const box = renderNode(ast, {
      display: true,
      unicode: opts.unicode,
      ascii: opts.ascii,
      ansi: opts.ansi,
    });
    let str = boxToString(box, { ansi: opts.ansi, trim: true });
    // Left-indent display math 2 columns for readability (matches the requested
    // output style). Applied on every rendered line, but not to empty lines.
    const indent = opts.centerDisplayMath ? computeCenterIndent(str, opts.width) : "  ";
    str = str
      .split("\n")
      .map((l) => (l.length === 0 ? l : indent + l))
      .join("\n");

    if (opts.displayMathSpacing) {
      // Leading newline for breathing room; scanner's trailing newline
      // (already in the segment stream) provides the bottom gap.
      return `\n${str}`;
    }
    return str;
  } catch (err) {
    if (opts.fallback === "throw") throw wrapParseError(err, trimmed);
    if (opts.fallback === "plain") {
      const plain = renderMath(trimmed, {
        unicode: opts.unicode,
        ascii: opts.ascii,
        fallback: "plain",
      });
      return `\n${plain}\n`;
    }
    return `$$${trimmed}$$`;
  }
}

function computeCenterIndent(str: string, width: number): string {
  const maxW = str.split("\n").reduce((m, l) => Math.max(m, visibleLength(l)), 0);
  if (maxW >= width) return "";
  return " ".repeat(Math.max(0, Math.floor((width - maxW) / 2)));
}

function visibleLength(s: string): number {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  let n = 0;
  for (const _ of stripped) n++;
  return n;
}

function assertBalanced(src: string): void {
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\" && i + 1 < src.length) {
      i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) throw new MathParseError("unmatched '}'", i, src);
    }
  }
  if (depth !== 0) throw new MathParseError("unclosed '{'", src.length, src);
}

function wrapParseError(err: unknown, input: string): Error {
  if (err instanceof MathParseError) return err;
  const e = err instanceof Error ? err : new Error(String(err));
  return new MathParseError(e.message, 0, input);
}

/**
 * When transformTables is enabled, walk each table cell and swap out inline
 * math occurrences only if they produce a single-line result. Multi-line math
 * would break table layout, so we bail back to the original in that case.
 */
function renderTableRow(src: string, opts: Required<FormatTextOptions>): string {
  const lines = src.split("\n");
  const out = lines.map((line) => transformTableLine(line, opts));
  return out.join("\n");
}

function transformTableLine(line: string, opts: Required<FormatTextOptions>): string {
  // Leave separator rows alone.
  if (/^\s*\|(\s*:?-{1,}:?\s*\|)+\s*$/.test(line)) return line;
  return line.replace(/\$([^$]+)\$/g, (_m, math: string) => {
    try {
      const ast = parseMath(math);
      const box = renderNode(ast, {
        display: false,
        unicode: opts.unicode,
        ascii: opts.ascii,
        ansi: opts.ansi,
      });
      if (box.height !== 1) return `$${math}$`;
      return boxToString(box, { ansi: opts.ansi, trim: true });
    } catch {
      return `$${math}$`;
    }
  });
}
