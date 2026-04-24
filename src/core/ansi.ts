import type { CellStyle } from "./cell.js";

export function openCodes(style: CellStyle): string {
  const codes: number[] = [];
  if (style.bold) codes.push(1);
  if (style.dim) codes.push(2);
  if (style.italic) codes.push(3);
  if (style.fg !== undefined) {
    if (style.fg < 16) {
      codes.push(style.fg < 8 ? 30 + style.fg : 90 + (style.fg - 8));
    } else {
      codes.push(38, 5, style.fg);
    }
  }
  if (style.bg !== undefined) {
    if (style.bg < 16) {
      codes.push(style.bg < 8 ? 40 + style.bg : 100 + (style.bg - 8));
    } else {
      codes.push(48, 5, style.bg);
    }
  }
  if (codes.length === 0) return "";
  return `\x1b[${codes.join(";")}m`;
}

export const RESET = "\x1b[0m";

export function hasAnyStyle(s: CellStyle | undefined): boolean {
  if (!s) return false;
  return !!(s.bold || s.italic || s.dim || s.fg !== undefined || s.bg !== undefined);
}
