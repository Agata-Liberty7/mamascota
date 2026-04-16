// tools/import_pet_dimensions_to_kb.mjs
// Импортирует assets/algoritmos/pet_dimensions_complete_from_book.yaml -> knowledgeBase.json
// Добавляет/обновляет kb.petDimensions (без ломания остальных секций), делает бэкап.

import fs from "fs";

const DEFAULT_YAML_PATH = "assets/algoritmos/pet_dimensions_complete_from_book.yaml";
const DEFAULT_KB_PATH =
  "cloudflare/agent-worker/mamascota-agent/src/brain/knowledgeBase.json";

const SOURCES = [
  "pet_dimensions_complete_from_book.yaml",
  "Klinicheskie_detali.yaml",
  "algoritmos_familiar.yaml",
  "algoritmos_geriatricos.yaml",
];

// --- CLI args: --yaml=... --kb=...
const args = process.argv.slice(2);
const yamlArg = args.find((a) => a.startsWith("--yaml="));
const kbArg = args.find((a) => a.startsWith("--kb="));

const YAML_PATH = (
  yamlArg ? yamlArg.split("=").slice(1).join("=") : DEFAULT_YAML_PATH
).trim();

const KB_PATH = (
  kbArg ? kbArg.split("=").slice(1).join("=") : DEFAULT_KB_PATH
).trim();

function die(msg) {
  console.error("❌", msg);
  process.exit(1);
}

async function awaitImport(name) {
  return import(name);
}

async function loadYaml(text) {
  // ВАЖНО: .mjs → только dynamic import (require здесь ломается)
  try {
    const mod = await awaitImport("yaml");
    if (typeof mod?.parse === "function") return mod.parse(text);
    if (typeof mod?.default?.parse === "function") return mod.default.parse(text);
  } catch {}

  try {
    const mod = await awaitImport("js-yaml");
    if (typeof mod?.load === "function") return mod.load(text);
    if (typeof mod?.default?.load === "function") return mod.default.load(text);
  } catch {}

  die(
    'Не найден YAML-парсер. Установи один из пакетов: "npm i -D yaml" или "npm i -D js-yaml", и повтори.'
  );
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function parseRange(str) {
  // Принимаем: "3-4.5", "3 – 4.5", "3 — 4.5", "3", "3.0 - 4"
  if (typeof str !== "string") return null;
  const raw = str.trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[—–]/g, "-").replace(/\s+/g, "");
  const parts = cleaned.split("-").filter(Boolean);

  const toNum = (x) => {
    const v = Number(String(x).replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };

  if (parts.length === 1) {
    const v = toNum(parts[0]);
    if (v === null) return null;
    return { min: v, max: v };
  }

  if (parts.length >= 2) {
    const a = toNum(parts[0]);
    const b = toNum(parts[1]);
    if (a === null || b === null) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  return null;
}

function toPetDimEntry(especie, row) {
  // row: { breed, size_class, weight_kg, height_cm }
  const raza = typeof row?.breed === "string" ? row.breed.trim() : "";
  if (!raza) return null;

  const w = parseRange(row?.weight_kg);
  const h = parseRange(row?.height_cm);

  const entry = {
    especie, // "perro" | "gato"
    raza,
    size_class: typeof row?.size_class === "string" ? row.size_class.trim() : null,
    weight: w ? { kg_min: w.min, kg_max: w.max } : null,
    height: h ? { cm_min: h.min, cm_max: h.max } : null,
    fuente: { archivos: [...SOURCES] },
  };

  // подчистим null-поля (чтобы JSON был аккуратный)
  if (!entry.size_class) delete entry.size_class;
  if (!entry.weight) delete entry.weight;
  if (!entry.height) delete entry.height;

  return entry;
}

function upsertByKey(list, entry) {
  // ключ: especie + raza (нормализованные)
  const key = `${norm(entry.especie)}::${norm(entry.raza)}`;
  const idx = list.findIndex(
    (x) => `${norm(x?.especie)}::${norm(x?.raza)}` === key
  );

  if (idx === -1) {
    list.push(entry);
    return { inserted: 1, updated: 0 };
  }

  // обновляем целиком запись (без сюрпризов)
  list[idx] = { ...list[idx], ...entry };
  return { inserted: 0, updated: 1 };
}

async function main() {
  if (!fs.existsSync(YAML_PATH)) die(`YAML не найден: ${YAML_PATH}`);
  if (!fs.existsSync(KB_PATH)) die(`knowledgeBase.json не найден: ${KB_PATH}`);

  // 1) Бэкап KB
  const backupPath =
    KB_PATH.replace(/\.json$/i, "") +
    `.backup.${new Date().toISOString().replace(/[:]/g, "-").slice(0, 19)}.json`;
  fs.copyFileSync(KB_PATH, backupPath);
  console.log(`✅ Backup: ${backupPath}`);

  // 2) Читаем KB
  let kb;
  try {
    kb = JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
  } catch {
    die("knowledgeBase.json невалидный JSON (не парсится).");
  }

  if (!kb || typeof kb !== "object") die("knowledgeBase.json: корень не объект.");

  // гарантируем массивы, чтобы не сломать buildAgentContext
  if (!Array.isArray(kb.algorithms)) kb.algorithms = [];
  if (!Array.isArray(kb.clinicalDetails)) kb.clinicalDetails = [];
  if (!Array.isArray(kb.breedRisks)) kb.breedRisks = [];
  if (!Array.isArray(kb.petDimensions)) kb.petDimensions = [];

  // 3) Читаем YAML
  const yamlText = fs.readFileSync(YAML_PATH, "utf8");
  const y = await loadYaml(yamlText);

  const dogs = y?.pets?.dogs;
  const cats = y?.pets?.cats;

  if (!Array.isArray(dogs) && !Array.isArray(cats)) {
    die('YAML структура не распознана. Ожидаю "pets: { dogs: [...], cats: [...] }".');
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const list = kb.petDimensions;

  const handle = (rows, especie) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const entry = toPetDimEntry(especie, row);
      if (!entry) {
        skipped++;
        continue;
      }
      const r = upsertByKey(list, entry);
      inserted += r.inserted;
      updated += r.updated;
    }
  };

  handle(dogs, "perro");
  handle(cats, "gato");

  // 4) Пишем KB обратно
  fs.writeFileSync(KB_PATH, JSON.stringify(kb, null, 2) + "\n", "utf8");

  console.log("✅ Import done.");
  console.log(`- inserted: ${inserted}`);
  console.log(`- updated: ${updated}`);
  console.log(`- skipped: ${skipped}`);
  console.log(
    `- total petDimensions: ${
      Array.isArray(kb.petDimensions) ? kb.petDimensions.length : "n/a"
    }`
  );
}

main().catch((e) => {
  console.error("❌ Script failed:", e?.message || e);
  process.exit(1);
});
