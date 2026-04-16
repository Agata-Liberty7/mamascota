// tools/validate_knowledge_base.mjs
// Падает с ошибкой, если в knowledgeBase.json есть запрещённые маркеры (например "Google").
// Можно гонять вручную или повесить на pre-commit / CI.

import fs from "fs";

const KB_PATH = "cloudflare/agent-worker/mamascota-agent/src/brain/knowledgeBase.json";

// Что считаем запрещённым
const FORBIDDEN_PATTERNS = [
  { name: "Google", re: /\bgoogle\b/i },
  { name: "Используйте Google", re: /Используйте\s+Google/i },
];

function main() {
  if (!fs.existsSync(KB_PATH)) {
    console.error(`❌ knowledgeBase.json не найден: ${KB_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(KB_PATH, "utf8");

  const hits = [];
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.re.test(text)) hits.push(p.name);
  }

  if (hits.length > 0) {
    console.error("❌ knowledgeBase.json содержит запрещённые маркеры:", hits.join(", "));
    console.error(`Файл: ${KB_PATH}`);
    console.error("Исправь данные и повтори проверку.");
    process.exit(1);
  }

  // Доп. мини-проверка: JSON должен парситься
  try {
    JSON.parse(text);
  } catch {
    console.error("❌ knowledgeBase.json невалидный JSON (не парсится).");
    process.exit(1);
  }

  console.log("✅ knowledgeBase.json OK (forbidden markers not found, JSON valid).");
}

main();