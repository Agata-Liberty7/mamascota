import { KNOWLEDGE_BASE } from "./knowledgeBaseData";

// ВАЖНО: чтобы 1:1 совпало с proxy, алиасы пород должны быть теми же.
// Самый надёжный путь в рамках воркера — скопировать maps сюда же.
import { DOG_BREED_ALIASES, CAT_BREED_ALIASES } from "./breedsAliases";

function normalizePet(p: any) {
  return {
    id: p?.id || null,
    name: p?.name || "Sin nombre",
    species: p?.species || "No especificada",  // 'dog' | 'cat' | ...
    speciesLabel: p?.speciesLabel || null,     // 🆕 готовое слово: Пёс / Собака / Кот / Кошка...
    breed: p?.breed || null,
    sex: p?.sex || "No indicado",
    ageYears: p?.ageYears ?? null,
    neutered: !!p?.neutered,
  };
}

function norm(s = "") {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ");
}

export async function buildAgentContext(
  pet: any = {},
  symptomKeys: string[] = [],
  userLang?: string,
  nivelFilter = "familiar"
) {
  try {
    const lang = userLang || pet?.lang || "en";

    const petData = normalizePet(pet);

    // Данные уже предзагружены в JSON
    const knowledgeBase = KNOWLEDGE_BASE || { algorithms: [], clinicalDetails: [], breedRisks: [] };

    const algorithms = Array.isArray(knowledgeBase.algorithms) ? knowledgeBase.algorithms : [];
    const clinicalDetails = Array.isArray(knowledgeBase.clinicalDetails) ? knowledgeBase.clinicalDetails : [];
    const breedRisks = Array.isArray(knowledgeBase.breedRisks) ? knowledgeBase.breedRisks : [];

    const filteredAlgorithms = Array.isArray(algorithms)
      ? algorithms.filter((alg: any) => {
          const nivel = alg?.nivelUsuario?.toLowerCase?.() || "";
          if (!nivel) return false;
          if (nivelFilter === "all") return true;
          return nivel === nivelFilter.toLowerCase();
        })
      : [];

    const geriatricAlgorithms = filteredAlgorithms.filter((alg: any) => alg?.grupo === "geriatrico");
    const nonGeriatricAlgorithms = filteredAlgorithms.filter((alg: any) => alg?.grupo !== "geriatrico");

    let finalAlgorithms = filteredAlgorithms;

    if (typeof petData.ageYears === "number" && petData.ageYears >= 7) {
      finalAlgorithms = [...geriatricoFirst(geriatricAlgorithms), ...nonGeriatricAlgorithms];
    } else {
      finalAlgorithms = nonGeriatricAlgorithms;
    }

    // dog/cat -> perro/gato
    const speciesCode = (petData.species || "").toLowerCase();
    const especie = speciesCode === "dog" ? "perro" : speciesCode === "cat" ? "gato" : "";

    const speciesKey = especie === "perro" ? "dog" : especie === "gato" ? "cat" : null;

    const uiBreed = petData.breed || "";
    const aliasMap =
      speciesKey === "dog" ? DOG_BREED_ALIASES : speciesKey === "cat" ? CAT_BREED_ALIASES : {};

    const candidates = [uiBreed, ...(aliasMap[uiBreed] || [])].map(norm);

    const breedRisksForPet = Array.isArray(breedRisks)
      ? breedRisks.filter((br: any) => {
          const esp = norm(br.especie);
          const raza = norm(br.raza);
          if (!speciesKey) return false;
          if (esp !== especie) return false;
          if (candidates.length === 0) return false;
          return candidates.includes(raza);
        })
      : [];

    const clinicalDetailsForSpecies = Array.isArray(clinicalDetails)
      ? clinicalDetails.filter((cd: any) => {
          const esp = (cd.especie || "").toLowerCase();
          if (!especie) return false;
          if (especie === "perro") return esp === "perro" || esp === "perro_gato";
          if (especie === "gato") return esp === "gato" || esp === "perro_gato";
          return false;
        })
      : [];

    const langText =
      ({ es: "Español", en: "English", ru: "Русский", he: "עברית", de: "Deutsch", fr: "Français", it: "Italiano" } as any)[
        lang
      ] || lang;

    const symptomText = symptomKeys.length
      ? `Síntomas reportados: ${symptomKeys.join(", ")}.`
      : "No se han indicado síntomas específicos.";

    const especieText =
      petData.speciesLabel ||      // 🆕 Пёс / Собака / Кот / Кошка...
      petData.species ||           // fallback
      "No especificada";

    const context = `
    🧩 Contexto clínico del paciente:
    Nombre: ${petData.name || "Desconocido"}
    Especie: ${especieText}
    Raza: ${petData.breed || "No especificada"}
    Sexo: ${petData.sex || "No indicado"}
    Edad: ${petData.ageYears || "Sin datos"} años
    Esterilizado: ${petData.neutered ? "Sí" : "No"}

    🌐 Idioma del usuario: ${langText}
    ${symptomText}
        `.trim();


  return JSON.stringify({
    pet: petData,
    userLang: lang,
    symptomKeys,
    nivelUsuario: nivelFilter,
    algorithms: finalAlgorithms,
    clinical_details_for_species: clinicalDetailsForSpecies,
    breed_risks_for_pet: breedRisksForPet,
    knowledgeBase: filteredAlgorithms,
    context,
  });


  } catch (error: any) {
    return JSON.stringify({
      error: "Error al generar el contexto clínico.",
      details: error?.message,
    });
  }
}

function geriatricoFirst(arr: any[]) {
  // мелкая защита, чтобы не падать на не-массиве
  return Array.isArray(arr) ? arr : [];
}
