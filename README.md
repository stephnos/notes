# notes

Taking notes in class…

## Markdown → PDF (macOS)

This repo uses **[md-to-pdf](https://github.com/simonhaenisch/md-to-pdf)** (headless Chromium) plus **`pdf-theme.css`** so exports look clean on paper: system fonts, readable code blocks, and sensible margins.

### Setup (once)

1. Install [Node.js](https://nodejs.org/) (LTS is fine), which includes `npm`.
2. In this folder:

```bash
npm install
```

### Commands

| Command | What it does |
|--------|----------------|
| `npm run pdf -- path/to/note.md` | Writes `path/to/note.pdf` next to the Markdown file. |
| `npm run pdf -- a.md b.md` | Converts several files in one go. |
| `npm run pdf:watch -- path/to/note.md` | Rebuilds the PDF whenever that file changes (stop with **Ctrl+C**). |

Examples:

```bash
npm run pdf -- README.md
npm run pdf -- ./lectures/week3.md
npm run pdf:watch -- ./lectures/week3.md
```

### PDF-only text transforms

`scripts/md2pdf.mjs` runs **before** Markdown is turned into HTML. It only touches text **outside** fenced triple-backtick code blocks. Your `.md` files on disk are unchanged; the PDF sees the transformed string.

**Order of steps:** Greek letter names → set/membership phrases (below) → caret superscripts → cleanup inside `<sup>…</sup>` tags.

#### Greek letter names → Unicode

English names are found case-insensitively; the **first character of the matched word** picks uppercase vs lowercase Greek (e.g. `SIGMA` and `Sigma` → Σ, `sigma` → σ):

| You write | PDF gets |
|-----------|----------|
| `alpha` … `omega` | α … ω (lowercase Greek) |
| `Alpha` … `Omega` | Α … Ω (uppercase Greek) |

Names supported: **alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lambda, mu, nu, xi, omicron, pi, rho, sigma, tau, upsilon, phi, chi, psi, omega**.

The first character of the word decides upper vs lower Greek: `Sigma` → Σ, `sigma` → σ, `SIGMA` → Σ. Names must appear as **whole words** (word boundaries), so `epsilon` in prose becomes ε, but a variable like `myepsilon` is left alone.

#### Discrete phrases → symbols

Phrases are matched as substrings (case-insensitive). Longer phrases are applied first so negations stay correct.

| You write (examples) | Symbol |
|----------------------|--------|
| `is not an element of`, `is not a member of` | ∉ |
| `is an element of`, `is a member of` | ∈ |
| `is a subset of` | ⊆ |
| `intersection` | ∩ |
| `union` | ∪ |

Typical patterns: `if A union B`, `L is a subset of Sigma ^*`, `x is a member of S`.

#### Caret superscripts (`^…`)

A caret not immediately after `[` (footnote style) or `\` (escape) becomes an HTML superscript for the PDF.

| Form | Example | Result (idea) |
|------|---------|----------------|
| Digits | `x^2`, `Sigma^10` | superscript digits |
| Single Latin letter | `x^n` | one letter, not followed by another letter |
| Braced text | `x^{n+1}`, `Sigma^{*}` | anything in `{…}` |
| Word | `Sigma^union`, `Sigma^Union` | ∪ in superscript |
| Single math / operator character | `Sigma^*`, `x^+`, `A^C` | `*` `+` ∪ ∩ ≤ ≥ … and related symbols (see script) |

Inside `{…}` or word superscripts, **`union`** and **`intersection`** are normalized to **∪** and **∩**. You can also type those Unicode symbols directly after `^` as a one-character superscript.

`[^label]` footnote markers and `\^` (escaped caret) are **not** treated as superscripts.

Implementation detail: [`scripts/md2pdf.mjs`](scripts/md2pdf.mjs) (`GREEK_BY_NAME`, `SET_OPERATOR_PHRASES`, `CARET_EXPONENT`).

### Styling the PDF

Edit **`pdf-theme.css`** at the project root. The script always applies that stylesheet on top of the HTML that `md-to-pdf` generates from your Markdown.

Use normal CSS aimed at **print**: `@page` margins, `body` typography, `pre` / `code`, `table`, `blockquote`, etc. After changes, run `npm run pdf -- your-file.md` again.

---

## Markdown commands for styling

Below is a concise reference for what you can write in `.md` files. The converter uses **Marked** with GitHub-flavored Markdown–style features (tables, task lists, strikethrough, etc.).

### Headings

```markdown
# Largest title
## Section
### Subsection
#### Smaller heading
```

Use more `#` symbols for deeper levels (up to six levels with `######`).

### Emphasis

| You write | Result |
|-----------|--------|
| `**bold**` or `__bold__` | **bold** |
| `*italic*` or `_italic_` | *italic* |
| `***bold italic***` | ***bold italic*** |
| `~~strikethrough~~` | ~~strikethrough~~ (GFM) |

### Paragraphs and line breaks

- One blank line starts a new paragraph.
- End a line with **two spaces** before the newline, or use a **backslash** at end of line, for a soft line break inside a paragraph.

### Lists

**Bulleted:**

```markdown
- Item one
- Item two
  - Nested item
```

**Numbered:**

```markdown
1. First
2. Second
   1. Nested step
```

### Links and images

```markdown
[Link text](https://example.com)
![Description of image](./figures/diagram.png)
```

Paths to images are resolved relative to the **Markdown file’s folder**, which helps for lecture assets next to your notes.

### Code

Inline: `` `const x = 1` ``

Fenced block with optional language for highlighting:

````markdown
```javascript
function hello(name) {
  return `Hello, ${name}`;
}
```
````

### Blockquotes

```markdown
> Important definition or quote.
> Multiple lines can continue with `>`.
```

### Horizontal rule

```markdown
---
```

(or `***` on its own line)

### Tables (GFM)

```markdown
| Column A | Column B |
|----------|----------|
| foo      | bar      |
| baz      | qux      |
```

Alignment: `|:---|` left, `|:---:|` center, `---:|` right.

### Task lists (GFM)

```markdown
- [ ] Todo item
- [x] Done item
```

### Escaping

Prefix special characters with `\` when you want them literally, e.g. `\*not italic\*`.
