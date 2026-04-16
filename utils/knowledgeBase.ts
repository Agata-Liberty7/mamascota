// utils/knowledgeBase.ts
// Универсальная загрузка YAML для Mamascota: не зависит от структуры файлов.
// Возвращает массив датасетов (по одному массиву алгоритмов на каждый YAML-файл).
//@ts-ignore 
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

//@ts-ignore
const __filename = fileURLToPath(import.meta.url);
//@ts-ignore
const __dirname = path.dirname(__filename);

// —————— утилиты ——————

/** эвристика "это именно алгоритм", а не шаг/ветка */
function isAlgorithmNode(node: any): boolean {
  if (!node || typeof node !== "object") return false;

  // 1) id должен быть строкой (не числом) и содержать буквы/подчёркивания
  const id = node.id;
  const idLooksLikeAlgo =
    typeof id === "string" && /[A-Za-z_А-Яа-я]/.test(id);

  if (!idLooksLikeAlgo) return false;

  // 2) рядом обычно есть признаки верхнего уровня
  const hasSchema = Array.isArray(node.esquema);
  const hasAnyAlgoFields =
    "nombre" in node ||
    "pagina" in node ||
    "tipoSintoma" in node ||
    "nivelUsuario" in node ||
    "especie" in node;

  return hasSchema || hasAnyAlgoFields;
}

/** рекурсивно собрать все алгоритмы в произвольной структуре */
function collectAlgorithms(root: any): any[] {
  const found: any[] = [];

  const walk = (obj: any) => {
    if (Array.isArray(obj)) {
      for (const it of obj) walk(it);
      return;
    }
    if (!obj || typeof obj !== "object") return;

    if (isAlgorithmNode(obj)) {
      found.push(obj);
      // не выходим: иногда внутри алгоритма есть вложенные алгоритмы
    }

    for (const key of Object.keys(obj)) {
      walk((obj as any)[key]);
    }
  };

  walk(root);
  return found;
}

// —————— основной загрузчик ——————

export async function loadKnowledgeBase(): Promise<any> {
  // путь стабилен независимо от cwd
  const folderPath = path.resolve(__dirname, "../assets/algoritmos");
  console.log("📂 Путь к YAML:", folderPath);

  if (!fs.existsSync(folderPath)) {
    console.warn("⚠ Папка с алгоритмами не найдена:", folderPath);
    return {
      algorithms: [],
      clinicalDetails: [],
      breedRisks: [],
    };
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => f.toLowerCase().endsWith(".yaml"))
    .sort();

  if (!files.length) {
    console.warn("⚠ Не найдено YAML-файлов в каталоге:", folderPath);
    return {
      algorithms: [],
      clinicalDetails: [],
      breedRisks: [],
    };
  }

  const allAlgorithms: any[] = [];
  const clinicalDetails: any[] = [];
  const breedRisks: any[] = [];

  let totalAlgos = 0;

  for (const file of files) {
    const full = path.join(folderPath, file);
    try {
      const text = fs.readFileSync(full, "utf8");
      if (!text.trim()) {
        console.warn(`[KB] ⚠ Пустой файл: ${file}`);
        continue;
      }

      const parsed = yaml.load(text);
      if (!parsed) {
        console.warn(`[KB] ⚠ Не удалось распарсить: ${file}`);
        continue;
      }

      const lower = file.toLowerCase();

      // 🔹 1) Klinicheskie_detali.yaml → клинические детали
      if (lower.includes("klinicheskie_detali")) {
        const detalles = (parsed as any).detalles_clinicos;
        if (Array.isArray(detalles)) {
          detalles.forEach((item: any) => {
            clinicalDetails.push({
              id: item.id_enfermedad,
              nombre: item.nombre,
              especie: item["вид"], // "perro" | "gato" | "perro_gato"
              razasRiesgo: item["породы_риска_тестирования"] || [],
              sintomasClave: item.sintomas_clave || "",
              diagnosticoRelevante: item.diagnostico_relevante || "",
            });
          });
        }
        console.log(
          `[KB] Загружен: ${file} → клин.деталей: ${clinicalDetails.length}`
        );
        continue; // НЕ считаем как алгоритмы
      }

      // 🔹 2) predisposiciones_raza.yaml → риски по породам
      if (lower.includes("predisposiciones_raza")) {
        const lista = (parsed as any).predisposiciones_raza_parte_1;
        if (Array.isArray(lista)) {
          lista.forEach((item: any) => {
            breedRisks.push({
              especie: item.especie,          // "perro" | "gato"
              raza: item.raza,                // "Labrador Retriever"
              predisposiciones: item.predisposiciones || [],
            });
          });
        }
        console.log(
          `[KB] Загружен: ${file} → пород: ${breedRisks.length}`
        );
        continue; // НЕ считаем как алгоритмы
      }

      // 🔹 3) Все остальные YAML → алгоритмы
      let algos = collectAlgorithms(parsed);

      // пометим источник, чтобы агент знал, что это гериатрия / Т4 и т.п.
      let grupo = "general";

      if (lower.includes("algoritmos_geriatricos")) {
        grupo = "geriatrico";
      } else if (lower.includes("algoritmos_t4")) {
        grupo = "t4";
      } else if (lower.includes("algoritmos_anestesia")) {
        grupo = "anestesia";
      } else if (lower.includes("algoritmos_familiar")) {
        grupo = "familiar";
      }

      algos = algos.map((algo: any) => ({
        ...algo,
        grupo,
      }));

      totalAlgos += algos.length;
      allAlgorithms.push(...algos);

      console.log(
        `[KB] Загружен: ${file} (grupo=${grupo}) → алгоритмов: ${algos.length}`
      );

    } catch (e: any) {
      console.error(`[KB] ❌ Ошибка чтения ${file}:`, e?.message || e);
    }
  }

  console.log(`📘 YAML algorithms loaded OK (total): ${totalAlgos}`);
  console.log(`📘 Clinical details total: ${clinicalDetails.length}`);
  console.log(`📘 Breed risks total: ${breedRisks.length}`);

  return {
    algorithms: allAlgorithms,
    clinicalDetails,
    breedRisks,
  };
}

