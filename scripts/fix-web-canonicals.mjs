import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");

const canonicalByFile = new Map([
  ["index.html", "https://mamascota.com/"],
  ["about.html", "https://mamascota.com/about"],
  ["contact.html", "https://mamascota.com/contact"],
  ["free.html", "https://mamascota.com/free"],
  ["plus.html", "https://mamascota.com/plus"],
  ["paywall.html", "https://mamascota.com/paywall"],
]);

const canonicalPattern =
  /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>\s*/gi;

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

const htmlFiles = await collectHtmlFiles(distDir);
let canonicalCount = 0;

for (const filePath of htmlFiles) {
  const relativePath = path
    .relative(distDir, filePath)
    .split(path.sep)
    .join("/");

  let html = await readFile(filePath, "utf8");

  // Remove every canonical inherited from app/+html.tsx.
  html = html.replace(canonicalPattern, "");

  const canonicalUrl = canonicalByFile.get(relativePath);

  if (canonicalUrl) {
    if (!html.includes("</head>")) {
      throw new Error(`Missing </head> in ${relativePath}`);
    }

    html = html.replace(
      "</head>",
      `<link rel="canonical" href="${canonicalUrl}"/></head>`
    );

    canonicalCount += 1;
  }

  await writeFile(filePath, html, "utf8");
}

if (canonicalCount !== canonicalByFile.size) {
  throw new Error(
    `Expected ${canonicalByFile.size} public canonicals, added ${canonicalCount}`
  );
}

console.log(`Web canonicals fixed: ${canonicalCount}`);
