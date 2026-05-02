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
