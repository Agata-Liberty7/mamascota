// tools/fix_kb_breed_sources.mjs
// Делает бэкап, убирает "Google..." заглушки и добавляет fuentes в breedRisks[*].predisposiciones[*]

import fs from "fs";

const KB_PATH = "cloudflare/agent-worker/mamascota-agent/src/brain/knowledgeBase.json";
const BACKUP_PATH = `${KB_PATH}.backup.${new Date().toISOString().slice(0, 10)}.json`;

const SOURCES = [
  "Klinicheskie_detali.yaml",
  "algoritmos_familiar.yaml",
  "algoritmos_geriatricos.yaml",
];

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

function cleanPlaceholders(arr, replacement) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((v) => {
    if (!isNonEmptyString(v)) return v;
    // Убираем любые варианты "Google" / "Используйте Google..."
    if (/google/i.test(v)) return replacement;
    if (/Используйте\s+Google/i.test(v)) return replacement;
    return v;
  });
}

function main() {
  if (!fs.existsSync(KB_PATH)) {
    console.error(`❌ knowledgeBase.json не найден: ${KB_PATH}`);
    process.exit(1);
  }

  // 1) Бэкап
  fs.copyFileSync(KB_PATH, BACKUP_PATH);
  console.log(`✅ Backup: ${BACKUP_PATH}`);

  // 2) Читаем KB
  const raw = fs.readFileSync(KB_PATH, "utf8");
  let kb;
  try {
    kb = JSON.parse(raw);
  } catch (e) {
    console.error("❌ knowledgeBase.json невалидный JSON, не могу править автоматически.");
    process.exit(1);
  }

  const breedRisks = Array.isArray(kb?.breedRisks) ? kb.breedRisks : null;
  if (!breedRisks) {
    console.error("❌ В knowledgeBase.json нет массива breedRisks.");
    process.exit(1);
  }

  let changed = 0;
  let sourcesAdded = 0;
  let googleCleaned = 0;

  for (const br of breedRisks) {
    if (!br || typeof br !== "object") continue;

    const preds = Array.isArray(br.predisposiciones) ? br.predisposiciones : null;
    if (!preds) continue;

    for (const p of preds) {
      if (!p || typeof p !== "object") continue;

      // 2a) fuentes
      if (!Array.isArray(p.fuentes) || p.fuentes.length === 0) {
        p.fuentes = [...SOURCES];
        sourcesAdded++;
        changed++;
      }

      // 2b) чистим заглушки в sintomas_clave / diagnostico_relevante
      const before1 = JSON.stringify(p.sintomas_clave ?? null);
      const before2 = JSON.stringify(p.diagnostico_relevante ?? null);

      p.sintomas_clave = cleanPlaceholders(
        p.sintomas_clave,
        "См. Klinicheskie_detali.yaml."
      );
      p.diagnostico_relevante = cleanPlaceholders(
        p.diagnostico_relevante,
        "См. algoritmos_familiar.yaml и algoritmos_geriatricos.yaml."
      );

      const after1 = JSON.stringify(p.sintomas_clave ?? null);
      const after2 = JSON.stringify(p.diagnostico_relevante ?? null);

      if (before1 !== after1) {
        googleCleaned++;
        changed++;
      }
      if (before2 !== after2) {
        googleCleaned++;
        changed++;
      }
    }
  }

  // 3) Пишем обратно
  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2) + "\n", "utf8");

  console.log("✅ Done.");
  console.log(`- fuentes added: ${sourcesAdded}`);
  console.log(`- placeholder cleaned: ${googleCleaned}`);
}

main();
