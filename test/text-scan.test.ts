import { describe, it, expect } from "vitest";
import { scanText } from "../src/text/scan.js";

describe("text scanner", () => {
  it("detects inline math $...$", () => {
    const segs = scanText("hello $x^2$ world");
    const types = segs.map((s) => s.type);
    expect(types).toContain("inlineMath");
  });

  it("rejects $5 currency", () => {
    const segs = scanText("costs $5 today");
    expect(segs.find((s) => s.type === "inlineMath")).toBeUndefined();
  });

  it("rejects shell prompt at line start", () => {
    const segs = scanText("$ npm install\nand $x^2$");
    const mathSegs = segs.filter((s) => s.type === "inlineMath");
    expect(mathSegs.length).toBe(1);
  });

  it("detects display math $$...$$", () => {
    const segs = scanText("$$\\frac{a}{b}$$");
    const disp = segs.find((s) => s.type === "displayMath");
    expect(disp).toBeDefined();
  });

  it("detects multiline display math", () => {
    const segs = scanText("$$\n\\frac{a}{b}\n$$");
    const disp = segs.find((s) => s.type === "displayMath");
    expect(disp).toBeDefined();
    if (disp?.type === "displayMath") {
      expect(disp.value).toContain("frac");
    }
  });

  it("detects \\[ ... \\] display math", () => {
    const segs = scanText("\\[\\frac{a}{b}\\]");
    expect(segs.find((s) => s.type === "displayMath")).toBeDefined();
  });

  it("detects code fences", () => {
    const segs = scanText("```ts\nconst x = 1;\n```");
    expect(segs.find((s) => s.type === "codeFence")).toBeDefined();
  });

  it("detects inline code", () => {
    const segs = scanText("use `echo` now");
    expect(segs.find((s) => s.type === "inlineCode")).toBeDefined();
  });

  it("detects Markdown tables", () => {
    const segs = scanText("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(segs.find((s) => s.type === "tableRow")).toBeDefined();
  });
});
