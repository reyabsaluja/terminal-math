import { formatMathInText } from "../src/index.js";

const input = `Let me read the aid sheet to get the exact equation for you!From **Table 3** on the aid sheet, the **Ampere-Maxwell Law** is given in two forms:

---

### Ampere-Maxwell Law

**Integral form:**
$$\\oint_C \\mathbf{H} \\cdot d\\mathbf{l} = \\int_S \\mathbf{J} \\cdot d\\mathbf{S} + \\frac{d}{dt} \\int_S \\mathbf{D} \\cdot d\\mathbf{S}$$

**Differential (point) form:**
$$\\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}$$

---

### Key Terms:
| Symbol | Meaning |
|--------|---------|
| **H** | Magnetic field intensity |
| **J** | Current density (conduction current) |
| **D** | Electric flux density |
| ∂**D**/∂t | Displacement current density |

The **∂D/∂t** term is Maxwell's addition to Ampere's law.`;

process.stdout.write(formatMathInText(input, {
  width: 100,
  unicode: true,
  ansi: false,
  preserveMarkdown: true,
}));
process.stdout.write("\n");
