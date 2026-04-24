export type TextSegment =
  | { type: "plain"; value: string }
  | { type: "inlineMath"; value: string; delimiter: "$" | "\\(" }
  | { type: "displayMath"; value: string; delimiter: "$$" | "\\[" | "fence" }
  | { type: "codeFence"; value: string }
  | { type: "inlineCode"; value: string }
  | { type: "tableRow"; value: string };
