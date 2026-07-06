type AlgorithmMatcherInput = {
  algorithms: any[];
  symptomKeys: string[];
  species?: string | null;
  ageYears?: number | null;
  max?: number;
};

const ALGORITHM_IDS_BY_SYMPTOM: Record<string, string[]> = {
  appetite_loss: ["apetito_disminuido_geriatrico", "anorexia"],
  weight_loss: ["perdida_peso_geriatrico", "perdida_peso"],

  vomiting: ["vomitos_geriatrico", "vomitos"],
  diarrhea: ["diarrea_geriatrico", "diarrea_aguda"],
  constipation: ["estrenimiento_geriatrico", "tenesmo"],

  cough: ["tos_cronica_geriatrica", "tos"],
  breathing_difficulty: ["disnea_aguda", "jadeo_geriatrico"],
  sneezing: ["secrecion_nasal"],

  limping: ["dolor_articular_geriatrico", "cojera"],
  pain_signs: ["dolor_no_especifico_geriatrico", "dolor"],
  pain_localized: ["dolor", "dolor_articular_geriatrico"],
  pain_general: ["dolor_no_especifico_geriatrico", "dolor"],

  drinking_too_much: ["pu_pd_geriatrico", "pu_pd"],
  urinating_too_often: ["pu_pd_geriatrico", "polaquiuria", "incontinencia_urinaria_geriatrica"],
  blood_in_urine: ["hematuria"],

  itching_skin: ["prurito_gatos", "prurito_perros"],
  hair_loss: ["alopecia_gato", "alopecia_perro"],
  wounds_or_ulcers: ["estomatitis_gatos", "estomatitis_perros"],

  behavior_change: ["cambios_animo_geriatrico", "desorientacion_geriatrica"],
  anxiety_stress: ["ansiedad_nocturna_geriatrica"],
  disorientation: ["desorientacion_geriatrica"],
  seizures: ["crisis_epilepticas"],
  collapse_fainting: ["perdida_consciencia", "sincope_intolerancia_ejercicio", "shock"],
};

function normalizeSpecies(species?: string | null) {
  const s = String(species || "").toLowerCase().trim();
  if (s === "dog" || s === "perro") return "perro";
  if (s === "cat" || s === "gato") return "gato";
  return "";
}

function algorithmMatchesSpecies(alg: any, species?: string | null) {
  const normalizedSpecies = normalizeSpecies(species);
  if (!normalizedSpecies) return true;

  const raw = String(alg?.especie || "").toLowerCase().trim();
  if (!raw) return true;

  const parts = raw
    .split(/[,\s/]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    raw === "perro_gato" ||
    parts.includes(normalizedSpecies) ||
    parts.includes("perro_gato")
  );
}

function uniqueAlgorithms(items: any[]) {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const alg of items) {
    const key = [
      String(alg?.id || ""),
      String(alg?.grupo || ""),
      String(alg?.nombre || ""),
      String(alg?.especie || ""),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(alg);
  }

  return result;
}

export function selectActiveAlgorithms(input: AlgorithmMatcherInput) {
  const algorithms = Array.isArray(input.algorithms) ? input.algorithms : [];
  const symptomKeys = Array.isArray(input.symptomKeys) ? input.symptomKeys : [];
  const max = typeof input.max === "number" && input.max > 0 ? input.max : 3;

  const wantedIds: string[] = [];

  for (const key of symptomKeys) {
    const mapped = ALGORITHM_IDS_BY_SYMPTOM[String(key || "").trim()];
    if (!mapped) continue;

    for (const id of mapped) {
      if (!wantedIds.includes(id)) wantedIds.push(id);
    }
  }

  if (!wantedIds.length) return [];

  const picked: any[] = [];

  for (const id of wantedIds) {
    const matches = algorithms.filter(
      (alg) =>
        String(alg?.id || "") === id &&
        algorithmMatchesSpecies(alg, input.species)
    );

    picked.push(...matches);
  }

  return uniqueAlgorithms(picked).slice(0, max);
}
