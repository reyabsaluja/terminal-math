export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  dim?: boolean;
  fg?: number;
  bg?: number;
};

export type Cell = {
  ch: string;
  style?: CellStyle;
};

export const SPACE: Cell = { ch: " " };

export function makeCell(ch: string, style?: CellStyle): Cell {
  if (style === undefined) return { ch };
  return { ch, style };
}

export function cloneCell(cell: Cell): Cell {
  if (cell.style === undefined) return { ch: cell.ch };
  return { ch: cell.ch, style: { ...cell.style } };
}

export function styleEquals(
  a: CellStyle | undefined,
  b: CellStyle | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.dim === !!b.dim &&
    a.fg === b.fg &&
    a.bg === b.bg
  );
}

export function mergeStyle(
  base: CellStyle | undefined,
  over: CellStyle | undefined,
): CellStyle | undefined {
  if (!base) return over ? { ...over } : undefined;
  if (!over) return { ...base };
  const merged: CellStyle = { ...base };
  if (over.bold !== undefined) merged.bold = over.bold || !!base.bold;
  if (over.italic !== undefined) merged.italic = over.italic || !!base.italic;
  if (over.dim !== undefined) merged.dim = over.dim || !!base.dim;
  if (over.fg !== undefined) merged.fg = over.fg;
  if (over.bg !== undefined) merged.bg = over.bg;
  return merged;
}
