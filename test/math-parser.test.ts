import { describe, it, expect } from "vitest";
import { parseMath } from "../src/math/parser.js";

describe("math parser", () => {
  it("parses x_1^2 as supsub with both sub and sup", () => {
    const ast = parseMath("x_1^2");
    // Top-level group around a single supsub, or supsub directly
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("supsub");
    if (node?.type === "supsub") {
      expect(node.sub).toBeDefined();
      expect(node.sup).toBeDefined();
    }
  });

  it("parses x^2_1 symmetrically", () => {
    const ast = parseMath("x^2_1");
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("supsub");
    if (node?.type === "supsub") {
      expect(node.sub).toBeDefined();
      expect(node.sup).toBeDefined();
    }
  });

  it("parses \\frac{a}{b}", () => {
    const ast = parseMath("\\frac{a}{b}");
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("frac");
  });

  it("parses \\sqrt[3]{x} with degree", () => {
    const ast = parseMath("\\sqrt[3]{x}");
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("sqrt");
    if (node?.type === "sqrt") {
      expect(node.degree).toBeDefined();
    }
  });

  it("parses \\sum_{i=1}^{n} into a bigop with limits", () => {
    const ast = parseMath("\\sum_{i=1}^{n} x");
    const first = ast.type === "group" ? ast.children[0] : ast;
    expect(first?.type).toBe("bigop");
    if (first?.type === "bigop") {
      expect(first.upper).toBeDefined();
      expect(first.lower).toBeDefined();
    }
  });

  it("parses \\left( ... \\right)", () => {
    const ast = parseMath("\\left( \\frac{a}{b} \\right)");
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("paren");
    if (node?.type === "paren") {
      expect(node.scalable).toBe(true);
    }
  });

  it("parses pmatrix environment", () => {
    const ast = parseMath("\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}");
    const node = ast.type === "group" ? ast.children[0] : ast;
    expect(node?.type).toBe("matrix");
    if (node?.type === "matrix") {
      expect(node.kind).toBe("pmatrix");
      expect(node.rows.length).toBe(2);
      expect(node.rows[0]?.length).toBe(2);
    }
  });

  it("parses \\boxed{x=0}\\tag{1}", () => {
    const ast = parseMath("\\boxed{x=0}\\tag{1}");
    const kids = ast.type === "group" ? ast.children : [ast];
    const types = kids.map((c) => c.type);
    expect(types).toContain("boxed");
    expect(types).toContain("tag");
  });

  it("does not crash on unknown commands", () => {
    const ast = parseMath("\\foo{x}");
    expect(ast).toBeDefined();
  });
});
