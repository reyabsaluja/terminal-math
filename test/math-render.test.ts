import { describe, it, expect } from "vitest";
import { renderMath } from "../src/math/render.js";

describe("math renderer", () => {
  it("renders a display fraction with a rule row", () => {
    const s = renderMath("\\frac{a+b}{c}", { display: true });
    expect(s).toMatch(/a/);
    expect(s).toMatch(/b/);
    expect(s).toMatch(/c/);
    expect(s).toMatch(/─/);
  });

  it("renders compact Unicode scripts", () => {
    const s = renderMath("x_1^2 + y_1^2 = r^2");
    expect(s).toContain("x₁²");
    expect(s).toContain("y₁²");
    expect(s).toContain("r²");
  });

  it("renders Maxwell differential form", () => {
    const s = renderMath(
      "\\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}",
      { display: true },
    );
    expect(s).toMatch(/∇/);
    expect(s).toMatch(/×/);
    expect(s).toMatch(/H/);
    expect(s).toMatch(/J/);
    expect(s).toMatch(/∂/);
    expect(s).toMatch(/D/);
    expect(s).toMatch(/t/);
    expect(s).toMatch(/─/);
  });

  it("renders contour integral with subscript", () => {
    const s = renderMath("\\oint_C \\mathbf{H} \\cdot d\\mathbf{l}", { display: false });
    expect(s).toContain("∮");
    expect(s).toContain("C");
    expect(s).toContain("H");
    expect(s).toContain("·");
    expect(s).toContain("dl");
  });

  it("renders \\boxed{...} with a border", () => {
    const s = renderMath("\\boxed{\\partial_\\mu j^\\mu = 0}", { display: true });
    expect(s).toMatch(/┌/);
    expect(s).toMatch(/└/);
    expect(s).toMatch(/∂/);
    expect(s).toMatch(/j/);
    expect(s).toMatch(/0/);
  });

  it("ASCII mode uses - instead of ─", () => {
    const s = renderMath("\\frac{a}{b}", { display: true, ascii: true, unicode: false });
    expect(s).toContain("-");
    expect(s).not.toContain("─");
  });

  it("does not throw on unknown commands", () => {
    expect(() => renderMath("\\foo{x}")).not.toThrow();
  });
});
