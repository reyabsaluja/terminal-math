import type { Box } from "./box.js";
import { hasAnyStyle, openCodes, RESET } from "./ansi.js";
import { type CellStyle, styleEquals } from "./cell.js";

export type StringifyOptions = {
  ansi?: boolean;
  trim?: boolean;
};

export function boxToString(box: Box, options: StringifyOptions = {}): string {
  const ansi = options.ansi ?? false;
  const trim = options.trim ?? true;

  const lines: string[] = [];
  for (let y = 0; y < box.height; y++) {
    const row = box.cells[y]!;
    let line = "";
    if (ansi) {
      let curStyle: CellStyle | undefined = undefined;
      for (let x = 0; x < box.width; x++) {
        const c = row[x]!;
        const styleOn = hasAnyStyle(c.style) ? c.style : undefined;
        if (!styleEquals(curStyle, styleOn)) {
          if (hasAnyStyle(curStyle)) line += RESET;
          if (styleOn) line += openCodes(styleOn);
          curStyle = styleOn;
        }
        line += c.ch;
      }
      if (hasAnyStyle(curStyle)) line += RESET;
    } else {
      for (let x = 0; x < box.width; x++) {
        line += row[x]!.ch;
      }
    }
    if (trim) line = line.replace(/[ \t]+$/, "");
    lines.push(line);
  }

  return lines.join("\n");
}
