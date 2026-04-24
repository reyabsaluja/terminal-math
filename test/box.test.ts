import { describe, it, expect } from "vitest";
import {
  blankBox,
  textBox,
  hcat,
  vstackCentered,
  frameBox,
  pad,
  center,
} from "../src/core/box.js";
import { boxToString } from "../src/core/stringify.js";

describe("Box primitives", () => {
  it("textBox of a single char has width 1, height 1, baseline 0", () => {
    const b = textBox("x");
    expect(b.width).toBe(1);
    expect(b.height).toBe(1);
    expect(b.baseline).toBe(0);
  });

  it("hcat aligns baselines of a text and a fraction-shaped box", () => {
    const num = textBox("a");
    const rule = textBox("─");
    const den = textBox("b");
    const frac = vstackCentered([num, rule, den]);
    frac.baseline = num.height; // rule row

    const plus = textBox("+");
    const out = hcat([plus, frac], 0);
    const s = boxToString(out);
    const lines = s.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain("+");
    expect(lines[1]).toContain("─");
  });

  it("vstackCentered centers narrower boxes", () => {
    const a = textBox("abcd");
    const b = textBox("x");
    const stack = vstackCentered([a, b]);
    expect(stack.width).toBe(4);
    const s = boxToString(stack, { trim: false });
    const lines = s.split("\n");
    expect(lines[0]).toBe("abcd");
    // Centered x should have padding around it
    expect(lines[1]?.trim()).toBe("x");
  });

  it("frameBox produces correct corner characters", () => {
    const content = textBox("hi");
    const boxed = frameBox(content);
    const s = boxToString(boxed);
    const lines = s.split("\n");
    expect(lines[0]?.startsWith("┌")).toBe(true);
    expect(lines[0]?.endsWith("┐")).toBe(true);
    expect(lines[lines.length - 1]?.startsWith("└")).toBe(true);
    expect(lines[lines.length - 1]?.endsWith("┘")).toBe(true);
    expect(lines.find((l) => l.includes("hi"))).toBeDefined();
  });

  it("boxToString trims trailing spaces but preserves interior spacing", () => {
    const b = blankBox(6, 1, 0);
    b.cells[0]![0] = { ch: "a" };
    b.cells[0]![3] = { ch: "b" };
    const s = boxToString(b);
    expect(s).toBe("a  b");
  });

  it("pad grows dimensions and shifts baseline", () => {
    const b = textBox("x");
    const padded = pad(b, { left: 2, top: 1, bottom: 1 });
    expect(padded.width).toBe(3);
    expect(padded.height).toBe(3);
    expect(padded.baseline).toBe(1);
  });

  it("center pads a narrower box to a given width", () => {
    const b = textBox("x");
    const c = center(b, 5);
    expect(c.width).toBe(5);
    const s = boxToString(c, { trim: false });
    expect(s).toBe("  x  ");
  });
});
