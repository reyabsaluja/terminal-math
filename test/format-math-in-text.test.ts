import { describe, it, expect } from "vitest";
import { formatMathInText } from "../src/index.js";

describe("formatMathInText", () => {
  it("transforms inline math", () => {
    const out = formatMathInText("The equation $x_1^2 + y_1^2 = r^2$ is useful.");
    expect(out).toContain("x₁²");
    expect(out).toContain("y₁²");
    expect(out).toContain("r²");
    expect(out).not.toContain("$");
  });

  it("leaves code fences alone", () => {
    const src = "```ts\nconst s = '$x^2$';\n```";
    const out = formatMathInText(src);
    expect(out).toContain("```ts");
    expect(out).toContain("$x^2$");
  });

  it("leaves inline code alone", () => {
    const src = "Run `echo '$x^2$'` and then use $x^2$.";
    const out = formatMathInText(src);
    expect(out).toContain("`echo '$x^2$'`");
    expect(out).toMatch(/x²/);
  });

  it("does not touch currency", () => {
    const out = formatMathInText("This costs $5 and not $x$.");
    expect(out).toContain("$5");
    // $x$ should have been transformed
    expect(out).toMatch(/not x\./);
  });

  it("does not touch shell prompt", () => {
    const out = formatMathInText("$ npm install\nThen $x^2$.");
    expect(out).toContain("$ npm install");
    expect(out).toContain("x²");
  });

  it("preserves Markdown tables by default", () => {
    const src = "| Symbol | Meaning |\n|---|---|\n| $x^2$ | square |";
    const out = formatMathInText(src);
    expect(out).toContain("$x^2$");
    expect(out).toContain("|---|---|");
  });

  it("transforms table cells when transformTables=true", () => {
    const src = "| Symbol | Meaning |\n|---|---|\n| $x^2$ | square |";
    const out = formatMathInText(src, { transformTables: true });
    expect(out).toContain("x²");
    expect(out).not.toContain("$x^2$");
  });

  it("renders \\[ ... \\] display math", () => {
    const out = formatMathInText("\\[\\frac{a}{b}\\]");
    expect(out).toContain("a");
    expect(out).toContain("b");
    expect(out).toContain("─");
  });

  it("handles multi-line $$...$$ display", () => {
    const out = formatMathInText("$$\n\\frac{a+b}{c}\n$$");
    expect(out).toContain("─");
  });

  it("default fallback=raw returns input on broken math", () => {
    const out = formatMathInText("Here is broken math $\\frac{a}{b$ but continue.");
    // Should not throw; "but continue." preserved
    expect(out).toContain("but continue");
  });

  it("fallback=throw throws on broken math", () => {
    expect(() =>
      formatMathInText("Here is $\\frac{a}{b$ but continue.", {
        fallback: "throw",
      }),
    ).toThrow();
  });

  it("Ampere-Maxwell sample preserves prose + renders math", () => {
    const input = [
      "**Integral form:**",
      "$$\\oint_C \\mathbf{H} \\cdot d\\mathbf{l} = \\int_S \\mathbf{J} \\cdot d\\mathbf{S} + \\frac{d}{dt} \\int_S \\mathbf{D} \\cdot d\\mathbf{S}$$",
      "",
      "**Differential (point) form:**",
      "$$\\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}$$",
    ].join("\n");
    const out = formatMathInText(input, { width: 100 });
    expect(out).toContain("**Integral form:**");
    expect(out).toContain("∮");
    expect(out).toContain("∫");
    expect(out).toContain("∇");
    expect(out).toContain("×");
    expect(out).toContain("∂");
    expect(out).toContain("─"); // differential fraction rule
    expect(out).not.toContain("$$");
  });
});
