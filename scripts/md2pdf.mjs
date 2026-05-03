#!/usr/bin/env node
/**
 * Convert Markdown → PDF using md-to-pdf + pdf-theme.css
 *
 * Whole-word English Greek letter names (alpha … omega) are replaced with
 * Unicode Greek for the PDF only: capital Greek if the word’s first letter
 * is uppercase (e.g. Sigma → Σ, sigma → σ).
 *
 * Caret exponents become HTML superscript for the PDF: x^2, x^n, x^*,
 * x^{n+1}, etc. Single-symbol tails include * + relations and common math
 * Unicode; longer text uses ^{…}. Braced or word superscripts union /
 * intersection become ∪ / ∩. Skips [^…] (footnote-style) and \^ escapes.
 * Whole-word union, intersection, is a subset / member / element of, and
 * negated element phrases become ∪, ∩, ⊆, ∈, ∉.
 * Fenced ``` code blocks are left unchanged.
 *
 * Usage: node scripts/md2pdf.mjs <file.md> [more.md ...]
 *        node scripts/md2pdf.mjs --watch <file.md>
 */

import { existsSync, readFileSync, watch } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-to-pdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const stylesheet = join(root, "pdf-theme.css");

const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const files = args.filter((a) => a !== "--watch");

/** English name (lowercase) → [lowercase Greek, uppercase Greek] */
const GREEK_BY_NAME = {
  alpha: ["\u03B1", "\u0391"],
  beta: ["\u03B2", "\u0392"],
  gamma: ["\u03B3", "\u0393"],
  delta: ["\u03B4", "\u0394"],
  epsilon: ["\u03B5", "\u0395"],
  zeta: ["\u03B6", "\u0396"],
  eta: ["\u03B7", "\u0397"],
  theta: ["\u03B8", "\u0398"],
  iota: ["\u03B9", "\u0399"],
  kappa: ["\u03BA", "\u039A"],
  lambda: ["\u03BB", "\u039B"],
  mu: ["\u03BC", "\u039C"],
  nu: ["\u03BD", "\u039D"],
  xi: ["\u03BE", "\u039E"],
  omicron: ["\u03BF", "\u039F"],
  pi: ["\u03C0", "\u03A0"],
  rho: ["\u03C1", "\u03A1"],
  sigma: ["\u03C3", "\u03A3"],
  tau: ["\u03C4", "\u03A4"],
  upsilon: ["\u03C5", "\u03A5"],
  phi: ["\u03C6", "\u03A6"],
  chi: ["\u03C7", "\u03A7"],
  psi: ["\u03C8", "\u03A8"],
  omega: ["\u03C9", "\u03A9"],
};

const GREEK_NAMES_LONGEST_FIRST = Object.keys(GREEK_BY_NAME).sort(
  (a, b) => b.length - a.length,
);

const greekWordPattern = new RegExp(
  `\\b(${GREEK_NAMES_LONGEST_FIRST.join("|")})\\b`,
  "giu",
);

function replaceGreekWords(text) {
  return text.replace(greekWordPattern, (word) => {
    const pair = GREEK_BY_NAME[word.toLowerCase()];
    if (!pair) return word;
    const upperGreek = /\p{Lu}/u.test(word[0]);
    return upperGreek ? pair[1] : pair[0];
  });
}

/** Longest first so negated and longer phrases win. */
const SET_OPERATOR_PHRASES = [
  ["is not an element of", "∉"],
  ["is not a member of", "∉"],
  ["is an element of", "∈"],
  ["is a member of", "∈"],
  ["is a subset of", "⊆"],
  ["intersection", "∩"],
  ["union", "∪"],
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceSetOperatorWords(text) {
  let out = text;
  for (const [phrase, symbol] of SET_OPERATOR_PHRASES) {
    out = out.replace(new RegExp(escapeRegExp(phrase), "giu"), symbol);
  }
  return out;
}

function mapSuperscriptBody(raw) {
  if (raw == null) return "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "union") return "∪";
  if (lower === "intersection") return "∩";
  return raw;
}

/**
 * Normalizes <sup>union</sup> etc. after caret pass (e.g. x^{union}).
 */
function normalizeSuperscriptTags(text) {
  return text.replace(/<sup>([^<]*)<\/sup>/giu, (full, inner) => {
    const mapped = mapSuperscriptBody(inner);
    if (mapped === inner) return full;
    return `<sup>${mapped}</sup>`;
  });
}

/**
 * Not after `[` (footnote [^n]) or `\` (escaped caret).
 * Braced, digits, union/intersection words, single Latin letter, or one math
 * superscript char (∪ ∩ * + …). `i` so ^Union matches.
 */
const CARET_EXPONENT =
  /(?<![\[\\])\^(?:\{([^}]*)\}|([0-9]+)|(union|intersection)\b|([a-zA-Z])(?![a-zA-Z])|([*+≤≥≠=<>∪∩∧∨⊆⊇∈∉⊂⊃±×÷\-]))/giu;

function replaceCaretSuperscript(text) {
  return text.replace(
    CARET_EXPONENT,
    (_, braced, digits, wordOp, letter, sym) => {
      if (wordOp) {
        const inner = mapSuperscriptBody(wordOp);
        return `<sup>${inner}</sup>`;
      }
      const rawInner = braced ?? digits ?? letter ?? sym ?? "";
      const inner =
        braced !== undefined && braced !== null
          ? mapSuperscriptBody(rawInner)
          : rawInner;
      return `<sup>${inner}</sup>`;
    },
  );
}

function transformOutsideCodeFences(md, fn) {
  const parts = md.split("```");
  return parts.map((chunk, i) => (i % 2 === 1 ? chunk : fn(chunk))).join("```");
}

/** Greek, set operators, caret superscripts, <sup> cleanup; skips ``` ```. */
function preprocessMarkdownForPdf(md) {
  return transformOutsideCodeFences(md, (chunk) =>
    normalizeSuperscriptTags(
      replaceCaretSuperscript(
        replaceSetOperatorWords(replaceGreekWords(chunk)),
      ),
    ),
  );
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

async function convert(mdPath) {
  const abs = resolve(mdPath);
  if (!existsSync(abs)) {
    console.error(`Not found: ${abs}`);
    process.exitCode = 1;
    return;
  }
  const pdfPath = abs.replace(/\.md$/i, ".pdf");
  const rawMd = readFileSync(abs, "utf8");
  const mdForPdf = preprocessMarkdownForPdf(rawMd);

  const pdf = await mdToPdf(
    { content: mdForPdf },
    {
      basedir: dirname(abs),
      dest: pdfPath,
      stylesheet: [stylesheet],
      pdf_options: {
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", right: "20mm", bottom: "22mm", left: "20mm" },
        displayHeaderFooter: false,
      },
      launch_options: {
        args: ["--font-render-hinting=medium"],
      },
    },
  );

  if (pdf) {
    console.log(`Wrote ${pdf.filename}`);
  }
}

async function main() {
  if (files.length === 0) {
    console.error(
      "Usage: npm run pdf -- <path/to/file.md> [more.md ...]\n" +
        "       npm run pdf:watch -- <path/to/file.md>",
    );
    process.exit(1);
  }

  if (watchMode) {
    const target = resolve(files[0]);
    console.log(`Watching ${basename(target)} → PDF on change (Ctrl+C to stop)`);
    await convert(target);
    const rebuild = debounce(async () => {
      console.log(`[${new Date().toISOString()}] changed, rebuilding…`);
      await convert(target);
    }, 400);
    watch(target, { persistent: true }, () => rebuild());
    return;
  }

  for (const f of files) {
    await convert(f);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
