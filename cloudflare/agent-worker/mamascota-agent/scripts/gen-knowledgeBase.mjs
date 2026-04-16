import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function main() {
  // Путь до utils/knowledgeBase.ts из scripts/
  const kbTsPath = path.resolve(__dirname, "../../../../utils/knowledgeBase.ts");

  // Куда сохранить JSON в воркере
  const outPath = path.resolve(__dirname, "../src/brain/knowledgeBase.json");

  let tsx;
  try {
    tsx = require("tsx/cjs/api");
    if (tsx.create) tsx = tsx.create({});
    console.log("⚙ tsx: new API");
  } catch {
    tsx = require("tsx");
    console.log("⚙ tsx: fallback API");
  }

  const mod = tsx.import?.(kbTsPath) || (await import(kbTsPath));

  if (!mod?.loadKnowledgeBase) {
    throw new Error("knowledgeBase.ts does not export loadKnowledgeBase()");
  }

  const data = await mod.loadKnowledgeBase();

  // минимальная проверка формы
  const algorithms = Array.isArray(data?.algorithms) ? data.algorithms : [];
  const clinicalDetails = Array.isArray(data?.clinicalDetails) ? data.clinicalDetails : [];
  const breedRisks = Array.isArray(data?.breedRisks) ? data.breedRisks : [];

  const normalized = { algorithms, clinicalDetails, breedRisks };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2), "utf8");

  console.log("✅ knowledgeBase.json generated:", outPath);
  console.log("algorithms:", algorithms.length);
  console.log("clinicalDetails:", clinicalDetails.length);
  console.log("breedRisks:", breedRisks.length);
}

main().catch((e) => {
  console.error("❌ gen-knowledgeBase failed:", e?.message || e);
  process.exit(1);
});
