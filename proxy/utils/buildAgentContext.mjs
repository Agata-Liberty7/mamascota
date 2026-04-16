import { loadKnowledgeBase } from "./knowledgeBase-loader.mjs";
import {
  DOG_BREED_ALIASES,
  CAT_BREED_ALIASES,
} from "../../utils/breeds.ts";


// Унифицированная нормализация питомца
function normalizePet(p) {
  return {
    id: p?.id || null,
    name: p?.name || "Sin nombre",
    species: p?.species || "No especificada",  // 'dog' | 'cat' | ...
    breed: p?.breed || null,
    sex: p?.sex || "No indicado",
    ageYears: p?.ageYears || null,
    neutered: !!p?.neutered,
  };
}
// ---------------------------
// 🔤 Нормализация строк
// ---------------------------
function norm(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// 🧠 Кэш базы знаний (загружается один раз за сессию)
let cachedKnowledgeBase = null;

// 🧩 Основная функция формирования контекста
export async function buildAgentContext(
  pet = {},
  symptomKeys = [],
  userLang,
  nivelFilter = "familiar" // ← фильтр по nivelUsuario
) {
  try {
    // 🔹 Унифицированная логика выбора языка
    const lang =
      userLang ||
      pet?.lang ||
      process.env.DEFAULT_LANG ||
      "en";

    console.log("🟢 [1] buildAgentContext запущен");
    console.log("🐾 Питомец:", pet?.name || "undefined", "| Язык:", lang);

    // 🔹 Нормализация данных питомца
    const petData = normalizePet(pet);
    console.log("🟢 [2] normalizePet завершён:", petData);

    // 🔹 Загрузка YAML-базы (с кэшем)
    if (!cachedKnowledgeBase) {
      cachedKnowledgeBase = await loadKnowledgeBase();
      console.log(
        "🟢 [3] База знаний загружена впервые:",
        cachedKnowledgeBase?.algorithms?.length ?? "unknown",
        "алгоритмов"
      );
    } else {
      console.log(
        "🟢 [3] Используется кэшированная база знаний:",
        cachedKnowledgeBase?.algorithms?.length ?? "unknown",
        "алгоритмов"
      );
    }

    const knowledgeBase = cachedKnowledgeBase || {};

    // Нормализуем поля
    const algorithms = Array.isArray(knowledgeBase)
      ? knowledgeBase
      : knowledgeBase.algorithms || [];

    const clinicalDetails = knowledgeBase.clinicalDetails || [];
    const breedRisks = knowledgeBase.breedRisks || [];

    // 🔹 Фильтрация алгоритмов по nivelUsuario (по умолчанию только familiar)
    const filteredAlgorithms = Array.isArray(algorithms)
      ? algorithms.filter((alg) => {
          const nivel = alg?.nivelUsuario?.toLowerCase?.() || "";
          if (!nivel) return false;
          if (nivelFilter === "all") return true;
          return nivel === nivelFilter.toLowerCase();
        })
      : [];

    console.log(
      `🧩 [3a] Отфильтровано по nivelUsuario="${nivelFilter}":`,
      filteredAlgorithms.length
    );

    // 🔹 Разделяем гериатрические и обычные алгоритмы
    const geriatricAlgorithms = filteredAlgorithms.filter(
      (alg) => alg?.grupo === "geriatrico"
    );
    const nonGeriatricAlgorithms = filteredAlgorithms.filter(
      (alg) => alg?.grupo !== "geriatrico"
    );

    let finalAlgorithms = filteredAlgorithms;

    if (typeof petData.ageYears === "number" && petData.ageYears >= 7) {
      // приоритет гериатрических: сначала они, потом всё остальное
      finalAlgorithms = [...geriatricAlgorithms, ...nonGeriatricAlgorithms];
      console.log(
        `🧓 [3b] Возраст ${petData.ageYears} → гериатрические алгоритмы в приоритете:`,
        geriatricAlgorithms.length
      );
    } else {
      // молодое животное: гериатрические пока не используем
      finalAlgorithms = nonGeriatricAlgorithms;
      console.log(
        "🧒 [3b] Молодое животное → гериатрические алгоритмы исключены:",
        geriatricAlgorithms.length
      );
    }


    // -----------------------------------
    // 🔹 Приводим вид к формату clinical/YAML
    // -----------------------------------
    const speciesCode = (petData.species || "").toLowerCase(); // 'dog' / 'cat'
    const especie =
      speciesCode === "dog"
        ? "perro"
        : speciesCode === "cat"
        ? "gato"
        : "";

    // -----------------------------------
    // 🧬 Породные риски (с алиасами)
    // -----------------------------------

    const speciesKey =
      especie === "perro" ? "dog" :
      especie === "gato" ? "cat" :
      null;

    const uiBreed = petData.breed || "";

    // выбираем карту алиасов по виду
    const aliasMap =
      speciesKey === "dog"
        ? DOG_BREED_ALIASES
        : speciesKey === "cat"
        ? CAT_BREED_ALIASES
        : {};

    const candidates = [
      uiBreed,
      ...(aliasMap[uiBreed] || []),
    ].map(norm);

    const breedRisksForPet = Array.isArray(breedRisks)
      ? breedRisks.filter((br) => {
          const esp = norm(br.especie); // perro / gato
          const raza = norm(br.raza);   // из YAML

          if (!speciesKey) return false;
          if (esp !== especie) return false;
          if (candidates.length === 0) return false;

          return candidates.includes(raza);
        })
      : [];
        console.log(
          "🐾 Breed matching:",
          petData.breed,
          "→",
          breedRisksForPet.map((r) => r.raza)
        );


    // 🔹 Клинические детали по виду (perro / gato / perro_gato)
    const clinicalDetailsForSpecies = Array.isArray(clinicalDetails)
      ? clinicalDetails.filter((cd) => {
          const esp = (cd.especie || "").toLowerCase(); // 'perro' / 'gato' / 'perro_gato'
          if (!especie) return false;
          if (especie === "perro") {
            return esp === "perro" || esp === "perro_gato";
          }
          if (especie === "gato") {
            return esp === "gato" || esp === "perro_gato";
          }
          return false;
        })
      : [];

    console.log(
      "🧬 [3b] clinicalDetailsForSpecies:",
      clinicalDetailsForSpecies.length,
      "| breedRisksForPet:",
      breedRisksForPet.length
    );

    // 🔹 Подготовка языкового обозначения
    const langText =
      {
        es: "Español",
        en: "English",
        ru: "Русский",
        he: "עברית",
        de: "Deutsch",
        fr: "Français",
        it: "Italiano",
      }[lang] || lang;

    // 🔹 Формирование текстового контекста (краткая сводка)
    const symptomText = symptomKeys.length
      ? `Síntomas reportados: ${symptomKeys.join(", ")}.`
      : "No se han indicado síntomas específicos.";

    const context = `
🧩 Contexto clínico del paciente:
Nombre: ${petData.name || "Desconocido"}
Especie: ${petData.species || "No especificada"}
Raza: ${petData.breed || "No especificada"}
Sexo: ${petData.sex || "No indicado"}
Edad: ${petData.ageYears || "Sin datos"} años
Esterilizado: ${petData.neutered ? "Sí" : "No"}

🌐 Idioma del usuario: ${langText}
${symptomText}
    `.trim();

    console.log("📘 [4] Contexto для GPT сформирован:\n", context);

    // 🔹 Возврат финального JSON-контекста
    return JSON.stringify({
      pet: petData,
      userLang: lang,
      symptomKeys,
      nivelUsuario: nivelFilter,

      // Алгоритмы (familiar/т.д.)
      algorithms: finalAlgorithms,

      // 🆕 Клинические детали и породные риски
      clinical_details_for_species: clinicalDetailsForSpecies,
      breed_risks_for_pet: breedRisksForPet,

      // Старое поле knowledgeBase оставляем для совместимости
      knowledgeBase: filteredAlgorithms,

      // Краткая текстовая сводка
      context,
    });
  } catch (error) {
    console.error("❌ Ошибка buildAgentContext:", error);
    return JSON.stringify({
      error: "Error al generar el contexto clínico.",
      details: error.message,
    });
  }
}
