import type { CellStyle } from "../core/cell.js";

export type MathNode =
  | { type: "group"; children: MathNode[] }
  | { type: "symbol"; value: string }
  | { type: "text"; value: string }
  | { type: "space"; width: number }
  | {
      type: "frac";
      numerator: MathNode;
      denominator: MathNode;
      variant?: "normal" | "display" | "text";
    }
  | { type: "sqrt"; body: MathNode; degree?: MathNode }
  | { type: "supsub"; base: MathNode; sup?: MathNode; sub?: MathNode }
  | { type: "style"; style: CellStyle; body: MathNode }
  | {
      type: "font";
      font: "bf" | "rm" | "it" | "bb" | "cal" | "frak" | "sf" | "tt";
      body: MathNode;
    }
  | {
      type: "bigop";
      op: string;
      upper?: MathNode;
      lower?: MathNode;
      body?: MathNode;
    }
  | {
      type: "paren";
      left: string;
      body: MathNode;
      right: string;
      scalable?: boolean;
    }
  | { type: "boxed"; body: MathNode }
  | { type: "tag"; body: MathNode }
  | { type: "matrix"; kind: string; rows: MathNode[][] }
  | {
      type: "cases";
      rows: Array<{ expr: MathNode; condition?: MathNode }>;
    }
  | {
      type: "aligned";
      rows: Array<{ columns: MathNode[]; tag?: MathNode }>;
    }
  | { type: "accent"; kind: string; body: MathNode }
  | { type: "raw"; value: string }
  | { type: "opname"; name: string };

export function group(children: MathNode[]): MathNode {
  if (children.length === 1) return children[0]!;
  return { type: "group", children };
}

export function isEmptyGroup(node: MathNode): boolean {
  return node.type === "group" && node.children.length === 0;
}
