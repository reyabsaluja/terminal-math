// Re-export layout primitives for convenience — keeps imports shallow in
// downstream math modules.
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
} from "./box.js";

export type { Box } from "./box.js";
export type { Cell, CellStyle } from "./cell.js";
