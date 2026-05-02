#!/usr/bin/env node
/**
 * Convert Markdown → PDF using md-to-pdf + pdf-theme.css
 * Usage: node scripts/md2pdf.mjs <file.md> [more.md ...]
 *        node scripts/md2pdf.mjs --watch <file.md>
 */

import { existsSync, watch } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-to-pdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const stylesheet = join(root, "pdf-theme.css");

const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const files = args.filter((a) => a !== "--watch");

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

  const pdf = await mdToPdf(
    { path: abs },
    {
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
