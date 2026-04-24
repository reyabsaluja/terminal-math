// Public API

export { formatMathInText } from "./text/format.js";
export type { FormatTextOptions } from "./text/format.js";

export { renderMath, renderNode } from "./math/render.js";
export type { RenderMathOptions } from "./math/render.js";

export { parseMath } from "./math/parser.js";

export { boxToString } from "./core/stringify.js";
export type { StringifyOptions } from "./core/stringify.js";

export {
  blankBox,
  textBox,
  spaceBox,
  cloneBox,
  blit,
  overlay,
  pad,
  center,
  rightAlign,
  hcat,
  hcatOverlap,
  hcatShifted,
  vstackCentered,
  frameBox,
  applyStyle,
} from "./core/box.js";

export type { Box } from "./core/box.js";
export type { Cell, CellStyle } from "./core/cell.js";
export type { MathNode } from "./math/ast.js";

export { MathParseError } from "./core/errors.js";
