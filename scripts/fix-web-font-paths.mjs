import { cp, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distDir = "dist";
const sourceDir = join(distDir, "assets", "node_modules");
const targetDir = join(distDir, "assets", "vendor");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(sourceDir))) {
  throw new Error(`Missing export directory: ${sourceDir}`);
}

if (await exists(targetDir)) {
  await cp(sourceDir, targetDir, { recursive: true, force: true });
} else {
  await rename(sourceDir, targetDir);
}

const bundleDir = join(distDir, "_expo", "static", "js", "web");
const bundleFiles = await import("node:fs/promises").then(({ readdir }) =>
  readdir(bundleDir)
);

for (const file of bundleFiles.filter((name) => name.endsWith(".js"))) {
  const path = join(bundleDir, file);
  const before = await readFile(path, "utf8");
  const after = before.replaceAll(
    "assets/node_modules/",
    "assets/vendor/"
  );

  if (after !== before) {
    await writeFile(path, after);
  }
}

console.log("Web font asset paths fixed.");
