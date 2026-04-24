import { describe, it, expect } from "vitest";
import { renderMath } from "../src/index.js";

describe("rendering snapshots", () => {
  it("Ampere-Maxwell integral form (inline)", () => {
    const s = renderMath(
      "\\oint_C \\mathbf{H} \\cdot d\\mathbf{l} = \\int_S \\mathbf{J} \\cdot d\\mathbf{S} + \\frac{d}{dt} \\int_S \\mathbf{D} \\cdot d\\mathbf{S}",
      { display: true },
    );
    expect(s).toMatchInlineSnapshot(
      `"∮₍C₎ H · dl = ∫₍S₎ J · dS + d/dt ∫₍S₎ D · dS"`,
    );
  });

  it("Ampere-Maxwell differential form (display)", () => {
    const s = renderMath(
      "\\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}",
      { display: true },
    );
    expect(s).toMatchInlineSnapshot(`
      "             ∂D
      ∇ × H = J + ────
                   ∂t"
    `);
  });

  it("quadratic formula", () => {
    const s = renderMath("x_1^2 + y_1^2 = r^2");
    expect(s).toMatchInlineSnapshot(`"x₁² + y₁² = r²"`);
  });

  it("simple stacked fraction", () => {
    const s = renderMath("\\frac{a+b}{c}", { display: true });
    expect(s).toMatchInlineSnapshot(`
      " a + b
      ───────
         c"
    `);
  });
});
