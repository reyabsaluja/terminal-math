import { type MathNode, group } from "./ast.js";
import { MathParseError } from "../core/errors.js";
import { tokenize, type Token } from "./tokenizer.js";
import { BIG_OPS, UPRIGHT_OPERATORS } from "./symbols.js";

type Stop = {
  rbrace?: boolean;
  rightCmd?: boolean; // stop when we hit \right
  endEnv?: string; // stop at \end{envName}
  rowBreak?: boolean; // stop at \\
  ampersand?: boolean; // stop at &
};

export class Parser {
  private tokens: Token[];
  private pos = 0;
  public input: string;

  constructor(source: string) {
    this.input = source;
    this.tokens = tokenize(source);
  }

  parse(): MathNode {
    const nodes = this.parseExpression({});
    return group(nodes);
  }

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset] ?? { type: "eof", pos: this.input.length };
  }

  private consume(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private error(msg: string, pos: number): MathParseError {
    return new MathParseError(msg, pos, this.input);
  }

  parseExpression(stop: Stop): MathNode[] {
    const out: MathNode[] = [];
    while (true) {
      const t = this.peek();
      if (t.type === "eof") break;
      if (stop.rbrace && t.type === "rbrace") break;
      if (stop.rowBreak && t.type === "dblbackslash") break;
      if (stop.ampersand && t.type === "amp") break;
      if (stop.rightCmd && t.type === "command" && t.name === "\\right") break;
      if (stop.endEnv && t.type === "command" && t.name === "\\end") break;

      const atom = this.parseAtom();
      if (atom === undefined) break;
      const withScripts = this.parseScripts(atom);
      out.push(withScripts);
    }
    return out;
  }

  /**
   * Pull scripts (`^{...}` / `_{...}`) attached to the atom. Supports
   * x^2_1 and x_1^2 symmetrically, collapses primes into sup.
   */
  private parseScripts(base: MathNode): MathNode {
    let sup: MathNode | undefined;
    let sub: MathNode | undefined;

    while (true) {
      const t = this.peek();
      if (t.type === "sup") {
        this.consume();
        const s = this.parseScriptOperand();
        sup = sup ? group([sup, s]) : s;
        continue;
      }
      if (t.type === "sub") {
        this.consume();
        const s = this.parseScriptOperand();
        sub = sub ? group([sub, s]) : s;
        continue;
      }
      // Prime chains: '' treated as ^{\prime\prime}
      if (t.type === "char" && t.value === "'") {
        let count = 0;
        while (this.peek().type === "char" && (this.peek() as any).value === "'") {
          this.consume();
          count++;
        }
        const primes: MathNode[] = [];
        for (let i = 0; i < count; i++) primes.push({ type: "symbol", value: "′" });
        const primesNode = group(primes);
        sup = sup ? group([sup, primesNode]) : primesNode;
        continue;
      }
      break;
    }

    if (sup === undefined && sub === undefined) return base;
    const node: MathNode = { type: "supsub", base };
    if (sup !== undefined) node.sup = sup;
    if (sub !== undefined) node.sub = sub;

    // If base is a big-op symbol, promote supsub into a bigop node with limits
    if (base.type === "symbol" && this.isBigOpSymbol(base.value)) {
      const bigop: MathNode = { type: "bigop", op: base.value };
      if (sup !== undefined) bigop.upper = sup;
      if (sub !== undefined) bigop.lower = sub;
      return bigop;
    }
    return node;
  }

  private isBigOpSymbol(v: string): boolean {
    return (
      v === "∫" ||
      v === "∬" ||
      v === "∭" ||
      v === "∮" ||
      v === "∑" ||
      v === "∏" ||
      v === "∐" ||
      v === "⋃" ||
      v === "⋂" ||
      v === "⨁" ||
      v === "⨂" ||
      v === "lim" ||
      v === "max" ||
      v === "min" ||
      v === "sup" ||
      v === "inf" ||
      v === "argmax" ||
      v === "argmin"
    );
  }

  private parseScriptOperand(): MathNode {
    const t = this.peek();
    if (t.type === "lbrace") {
      return this.parseRequiredGroup();
    }
    if (t.type === "eof") {
      return group([]);
    }
    // Single-token operand
    const atom = this.parseAtomNoScripts();
    return atom ?? group([]);
  }

  parseAtom(): MathNode | undefined {
    return this.parseAtomNoScripts();
  }

  private parseAtomNoScripts(): MathNode | undefined {
    const t = this.peek();
    if (t.type === "eof") return undefined;
    if (t.type === "rbrace") return undefined;
    if (t.type === "dblbackslash") return undefined;
    if (t.type === "amp") return undefined;

    if (t.type === "lbrace") {
      return this.parseRequiredGroup();
    }
    if (t.type === "sup" || t.type === "sub") {
      // Leading script with no base — treat base as empty group
      return group([]);
    }
    if (t.type === "command") {
      return this.parseCommand();
    }
    // char
    this.consume();
    const ch = (t as any).value as string;
    // In math mode, ordinary whitespace is absorbed — rendering handles spacing.
    if (ch === " " || ch === "\t" || ch === "\n") {
      return this.parseAtomNoScripts();
    }
    return { type: "symbol", value: ch };
  }

  parseRequiredGroup(): MathNode {
    const t = this.peek();
    if (t.type !== "lbrace") {
      // Accept a single atom if not a group
      const a = this.parseAtomNoScripts();
      return a ?? group([]);
    }
    this.consume(); // {
    const children = this.parseExpression({ rbrace: true });
    const closing = this.peek();
    if (closing.type === "rbrace") this.consume();
    return group(children);
  }

  parseOptionalGroup(): MathNode | undefined {
    const t = this.peek();
    if (t.type === "char" && t.value === "[") {
      const start = this.pos;
      this.consume(); // [
      const children: MathNode[] = [];
      while (true) {
        const p = this.peek();
        if (p.type === "eof") {
          // unterminated, bail to raw
          this.pos = start;
          this.consume();
          return undefined;
        }
        if (p.type === "char" && p.value === "]") {
          this.consume();
          return group(children);
        }
        const atom = this.parseAtomNoScripts();
        if (!atom) break;
        const withScripts = this.parseScripts(atom);
        children.push(withScripts);
      }
      return group(children);
    }
    return undefined;
  }

  private parseCommand(): MathNode {
    const tok = this.consume();
    if (tok.type !== "command") {
      throw this.error("expected command", tok.pos);
    }
    const name = tok.name;

    switch (name) {
      case "\\frac":
      case "\\dfrac":
      case "\\tfrac": {
        const num = this.parseRequiredGroup();
        const den = this.parseRequiredGroup();
        const variant: "display" | "text" | "normal" =
          name === "\\dfrac" ? "display" : name === "\\tfrac" ? "text" : "normal";
        return { type: "frac", numerator: num, denominator: den, variant };
      }
      case "\\sqrt": {
        const degree = this.parseOptionalGroup();
        const body = this.parseRequiredGroup();
        if (degree !== undefined) return { type: "sqrt", body, degree };
        return { type: "sqrt", body };
      }
      case "\\mathbf":
      case "\\bm":
      case "\\boldsymbol":
        return { type: "font", font: "bf", body: this.parseRequiredGroup() };
      case "\\mathrm":
        return { type: "font", font: "rm", body: this.parseRequiredGroup() };
      case "\\mathit":
        return { type: "font", font: "it", body: this.parseRequiredGroup() };
      case "\\mathbb":
        return { type: "font", font: "bb", body: this.parseRequiredGroup() };
      case "\\mathcal":
        return { type: "font", font: "cal", body: this.parseRequiredGroup() };
      case "\\mathfrak":
        return { type: "font", font: "frak", body: this.parseRequiredGroup() };
      case "\\mathsf":
        return { type: "font", font: "sf", body: this.parseRequiredGroup() };
      case "\\mathtt":
        return { type: "font", font: "tt", body: this.parseRequiredGroup() };
      case "\\text":
      case "\\textrm":
      case "\\textbf":
      case "\\textit":
      case "\\mbox": {
        const body = this.parseTextGroup();
        return body;
      }
      case "\\operatorname":
      case "\\operatorname*": {
        const body = this.parseRequiredGroup();
        const s = renderNodeToFlatText(body);
        return { type: "opname", name: s };
      }
      case "\\boxed":
        return { type: "boxed", body: this.parseRequiredGroup() };
      case "\\tag": {
        const body = this.parseTextGroup();
        return { type: "tag", body };
      }

      case "\\left": {
        const open = this.readDelimiterToken();
        const body = group(this.parseExpression({ rightCmd: true }));
        // consume \right
        const next = this.peek();
        let close = ".";
        if (next.type === "command" && next.name === "\\right") {
          this.consume();
          close = this.readDelimiterToken();
        }
        return { type: "paren", left: open, body, right: close, scalable: true };
      }
      case "\\right": {
        // Stray \right — treat as nothing
        this.readDelimiterToken();
        return group([]);
      }

      case "\\begin": {
        return this.parseEnvironment();
      }
      case "\\end": {
        // Stray \end — consume name and return empty
        this.consumeEnvName();
        return group([]);
      }

      // Explicit horizontal spaces
      case "\\,":
        return { type: "space", width: 1 };
      case "\\:":
      case "\\;":
        return { type: "space", width: 1 };
      case "\\!":
        return { type: "space", width: 0 };
      case "\\ ":
        return { type: "space", width: 1 };
      case "\\quad":
        return { type: "space", width: 4 };
      case "\\qquad":
        return { type: "space", width: 6 };

      case "\\over": {
        // \over is infix; we can't easily handle without restructuring — treat as
        // an ordinary symbol "/" to avoid crashes.
        return { type: "symbol", value: "/" };
      }

      default:
        break;
    }

    // Big operator?
    if (BIG_OPS[name]) {
      const g = BIG_OPS[name]!;
      return { type: "symbol", value: g.unicode };
    }

    // Accent commands (simplified: just render body, no accent glyph)
    if (
      name === "\\hat" ||
      name === "\\bar" ||
      name === "\\vec" ||
      name === "\\tilde" ||
      name === "\\dot" ||
      name === "\\ddot" ||
      name === "\\widehat" ||
      name === "\\widetilde" ||
      name === "\\overline"
    ) {
      const body = this.parseRequiredGroup();
      return { type: "accent", kind: name.replace(/^\\/, ""), body };
    }

    // Known standalone symbol (\alpha, \partial, \in, etc.) — consumer will
    // resolve through SYMBOLS table.
    return { type: "symbol", value: name };
  }

  /**
   * Text-group parser used by \text{...}. Tokenizing inside preserves the
   * literal characters (including spaces), skipping over \ escapes.
   */
  private parseTextGroup(): MathNode {
    const t = this.peek();
    if (t.type !== "lbrace") {
      // Accept a single atom — not ideal but forgiving.
      const a = this.parseAtomNoScripts();
      if (!a) return group([]);
      if (a.type === "symbol") return { type: "text", value: a.value };
      return a;
    }
    const open = this.consume();
    // Reconstruct the raw text up to the matching brace.
    const start = open.pos + 1;
    let depth = 1;
    let i = start;
    while (i < this.input.length && depth > 0) {
      const ch = this.input[i]!;
      if (ch === "\\" && i + 1 < this.input.length) {
        i += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const raw = this.input.slice(start, i);
    // Advance token cursor to after the closing brace.
    while (this.pos < this.tokens.length) {
      const tk = this.tokens[this.pos]!;
      if (tk.pos > i) break;
      this.pos++;
    }
    // Drop simple LaTeX escapes in text mode: "\$" -> "$", etc.
    const cleaned = raw.replace(/\\([%$&#_{}])/g, "$1");
    return { type: "text", value: cleaned };
  }

  private readDelimiterToken(): string {
    const t = this.peek();
    if (t.type === "char") {
      this.consume();
      return t.value;
    }
    if (t.type === "command") {
      this.consume();
      switch (t.name) {
        case "\\{": return "{";
        case "\\}": return "}";
        case "\\lbrace": return "{";
        case "\\rbrace": return "}";
        case "\\langle": return "⟨";
        case "\\rangle": return "⟩";
        case "\\lceil": return "⌈";
        case "\\rceil": return "⌉";
        case "\\lfloor": return "⌊";
        case "\\rfloor": return "⌋";
        case "\\vert": return "|";
        case "\\|":
        case "\\Vert": return "‖";
        case "\\backslash": return "\\";
        default:
          // Unrecognised delimiter — treat as invisible
          return ".";
      }
    }
    if (t.type === "lbrace") {
      this.consume();
      return "{";
    }
    if (t.type === "rbrace") {
      this.consume();
      return "}";
    }
    return ".";
  }

  private consumeEnvName(): string {
    const t = this.peek();
    if (t.type !== "lbrace") return "";
    this.consume();
    let name = "";
    while (true) {
      const p = this.peek();
      if (p.type === "rbrace") {
        this.consume();
        break;
      }
      if (p.type === "eof") break;
      if (p.type === "char") {
        name += p.value;
        this.consume();
        continue;
      }
      if (p.type === "command") {
        // environment names can include * in practice
        name += p.name.replace(/^\\/, "");
        this.consume();
        continue;
      }
      this.consume();
    }
    return name.trim();
  }

  private parseEnvironment(): MathNode {
    const envName = this.consumeEnvName();
    const isMatrixLike =
      envName === "matrix" ||
      envName === "pmatrix" ||
      envName === "bmatrix" ||
      envName === "Bmatrix" ||
      envName === "vmatrix" ||
      envName === "Vmatrix" ||
      envName === "smallmatrix";

    // Parse rows until \end{envName}
    const rows: Array<MathNode[][]> = [];
    let currentRow: MathNode[][] = [];
    let currentCell: MathNode[] = [];

    const finishCell = () => {
      currentRow.push(currentCell);
      currentCell = [];
    };
    const finishRow = () => {
      finishCell();
      if (
        currentRow.length > 0 &&
        !(currentRow.length === 1 && currentRow[0]!.length === 0)
      ) {
        rows.push(currentRow);
      }
      currentRow = [];
    };

    while (true) {
      const t = this.peek();
      if (t.type === "eof") break;
      // Swallow whitespace at delimiter boundaries so the row/cell markers
      // get seen without being consumed as an atom.
      if (t.type === "char" && (t.value === " " || t.value === "\t" || t.value === "\n")) {
        this.consume();
        continue;
      }
      if (t.type === "command" && t.name === "\\end") {
        this.consume();
        this.consumeEnvName();
        break;
      }
      if (t.type === "amp") {
        this.consume();
        finishCell();
        continue;
      }
      if (t.type === "dblbackslash") {
        this.consume();
        finishRow();
        continue;
      }
      const atom = this.parseAtomNoScripts();
      if (!atom) {
        // skip stray token
        if (this.peek().type !== "eof") this.consume();
        continue;
      }
      const node = this.parseScripts(atom);
      currentCell.push(node);
    }
    // tail row
    if (currentCell.length > 0 || currentRow.length > 0) finishRow();

    if (isMatrixLike) {
      return {
        type: "matrix",
        kind: envName,
        rows: rows.map((r) => r.map((cell) => group(cell))),
      };
    }

    if (envName === "cases") {
      const caseRows: Array<{ expr: MathNode; condition?: MathNode }> = rows.map((r) => {
        const expr = group(r[0] ?? []);
        if (r[1]) return { expr, condition: group(r[1]) };
        return { expr };
      });
      return { type: "cases", rows: caseRows };
    }

    if (
      envName === "aligned" ||
      envName === "align" ||
      envName === "align*" ||
      envName === "equation" ||
      envName === "equation*" ||
      envName === "gather" ||
      envName === "gather*"
    ) {
      return {
        type: "aligned",
        rows: rows.map((r) => ({ columns: r.map((c) => group(c)) })),
      };
    }

    // Unknown env — flatten to a group of the first row's cells.
    const flat: MathNode[] = [];
    for (const r of rows) {
      for (const cell of r) flat.push(...cell);
    }
    return group(flat);
  }
}

/**
 * Flatten an AST to a text identifier for \operatorname. Keeps letters,
 * digits, and simple spaces.
 */
export function renderNodeToFlatText(node: MathNode): string {
  switch (node.type) {
    case "group":
      return node.children.map(renderNodeToFlatText).join("");
    case "symbol":
      return node.value.startsWith("\\") ? node.value.slice(1) : node.value;
    case "text":
      return node.value;
    case "space":
      return " ";
    default:
      return "";
  }
}

export function parseMath(input: string): MathNode {
  const p = new Parser(input);
  return p.parse();
}

export { UPRIGHT_OPERATORS };
