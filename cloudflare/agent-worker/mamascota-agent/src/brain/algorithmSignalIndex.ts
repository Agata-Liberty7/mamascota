type PetDataForSignals = {
  species?: string | null;
  ageYears?: number | null;
};

type SignalCandidateInput = {
  algorithms: any[];
  symptomKeys?: string[];
  message?: string;
  petData?: PetDataForSignals;
  max?: number;
};

export type AlgorithmSignalCandidate = {
  algorithmId: string;
  algorithmName: string;
  species: string;
  group: string;
  matchedSignals: string[];
  matchedNodes: string[];
  discriminators: string[];
  score: number;
  reason: string;
  algorithm: any;
};

type IndexedAlgorithm = {
  algorithm: any;
  id: string;
  name: string;
  species: string;
  group: string;
  fullText: string;
  nodes: Array<{
    id: string;
    text: string;
  }>;
  discriminators: string[];
};

type SignalIndex = {
  records: IndexedAlgorithm[];
};

let SIGNAL_INDEX_CACHE_KEY = "";
let SIGNAL_INDEX_CACHE: SignalIndex | null = null;

const SIGNALS_BY_SYMPTOM_KEY: Record<string, string[]> = {
  breathing_difficulty: [
    "disnea",
    "dificultad respiratoria",
    "dificultad para respirar",
    "respiracion con la boca abierta",
    "respiración con la boca abierta",
    "respiracion agitada",
    "respiración agitada",
    "respiracion anormal",
    "respiración anormal",
    "boca abierta",
    "jadeo",
    "taquipnea",
    "mucosas palidas",
    "mucosas pálidas",
    "cyanosis",
    "cianosis",
    "dyspnea",
    "respiratory distress",
    "open-mouth breathing",
    "одышка",
    "затрудненное дыхание",
    "затруднённое дыхание",
    "дыхание с открытым ртом",
    "частое дыхание",
    "шумное дыхание",
  ],
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpecies(species?: string | null) {
  const s = normalizeText(species);
  if (s === "dog" || s === "perro") return "perro";
  if (s === "cat" || s === "gato") return "gato";
  return "";
}

function algorithmMatchesSpecies(algSpecies: string, petSpecies?: string | null) {
  const pet = normalizeSpecies(petSpecies);
  if (!pet) return true;

  const raw = normalizeText(algSpecies);
  if (!raw) return true;

  return raw === "perro_gato" || raw.includes(pet);
}

function collectStrings(value: any, out: string[] = []) {
  if (value == null) return out;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }

  return out;
}

function nodeText(node: any) {
  const parts = [
    node?.id,
    node?.tipo,
    node?.pregunta,
    node?.texto,
    node?.accion,
    node?.acción,
    node?.recomendacion,
    node?.recomendación,
    node?.fin,
  ];

  return collectStrings(parts).join(" ");
}

function extractNodes(algorithm: any) {
  const esquema = Array.isArray(algorithm?.esquema) ? algorithm.esquema : [];

  return esquema.map((node: any, index: number) => ({
    id: String(node?.id ?? index + 1),
    text: normalizeText(nodeText(node)),
  }));
}

function extractDiscriminators(algorithm: any) {
  const esquema = Array.isArray(algorithm?.esquema) ? algorithm.esquema : [];

  return esquema
    .filter((node: any) => normalizeText(node?.tipo) === "pregunta" && typeof node?.pregunta === "string")
    .map((node: any) => String(node.pregunta).trim())
    .filter(Boolean)
    .slice(0, 5);
}

function isUtilityAlgorithm(algorithm: any) {
  const id = normalizeText(algorithm?.id);
  const name = normalizeText(algorithm?.nombre || algorithm?.name);

  return (
    id.startsWith("matriz_") ||
    id.includes("matrix") ||
    name.includes("matriz mamascota")
  );
}

function buildSignalIndex(algorithms: any[]): SignalIndex {
  const records = (Array.isArray(algorithms) ? algorithms : [])
    .filter((algorithm: any) => !isUtilityAlgorithm(algorithm))
    .map((algorithm: any) => {
    const id = String(algorithm?.id || "");
    const name = String(algorithm?.nombre || algorithm?.name || "");
    const species = String(algorithm?.especie || "");
    const group = String(algorithm?.grupo || "");

    const nodes = extractNodes(algorithm);
    const discriminators = extractDiscriminators(algorithm);

    const fullText = normalizeText([
      id,
      name,
      species,
      group,
      collectStrings(algorithm).join(" "),
    ].join(" "));

    return {
      algorithm,
      id,
      name,
      species,
      group,
      fullText,
      nodes,
      discriminators,
    };
  });

  return { records };
}

function getIndex(algorithms: any[]) {
  const ids = (Array.isArray(algorithms) ? algorithms : [])
    .map((alg: any) => String(alg?.id || ""))
    .join("|");

  if (SIGNAL_INDEX_CACHE && SIGNAL_INDEX_CACHE_KEY === ids) {
    return SIGNAL_INDEX_CACHE;
  }

  SIGNAL_INDEX_CACHE_KEY = ids;
  SIGNAL_INDEX_CACHE = buildSignalIndex(algorithms);
  return SIGNAL_INDEX_CACHE;
}

function getSignals(symptomKeys: string[] = [], message = "") {
  const signals: string[] = [];

  for (const key of symptomKeys) {
    const mapped = SIGNALS_BY_SYMPTOM_KEY[String(key || "").trim()] || [];
    for (const signal of mapped) signals.push(signal);
  }

  const normalizedMessage = normalizeText(message);
  for (const signal of [
    "disnea",
    "dificultad respiratoria",
    "boca abierta",
    "jadeo",
    "tos",
    "colapso",
    "тяжело дышать",
    "тяжело дышит",
    "одышка",
    "затрудненное дыхание",
    "затруднённое дыхание",
    "дыхание с открытым ртом",
    "шумное дыхание",
  ]) {
    if (normalizedMessage.includes(normalizeText(signal))) {
      signals.push(signal);
    }
  }

  const seen = new Set<string>();
  return signals
    .map((signal) => normalizeText(signal))
    .filter((signal) => {
      if (!signal || seen.has(signal)) return false;
      seen.add(signal);
      return true;
    });
}

function scoreRecord(record: IndexedAlgorithm, signals: string[], petData?: PetDataForSignals) {
  let score = 0;
  const matchedSignals: string[] = [];
  const matchedNodes: string[] = [];

  if (!algorithmMatchesSpecies(record.species, petData?.species)) {
    return null;
  }

  for (const signal of signals) {
    const inId = normalizeText(record.id).includes(signal);
    const inName = normalizeText(record.name).includes(signal);
    const inFullText = record.fullText.includes(signal);

    const nodeMatches = record.nodes
      .filter((node) => node.text.includes(signal))
      .map((node) => node.id);

    if (!inId && !inName && !inFullText && nodeMatches.length === 0) continue;

    matchedSignals.push(signal);

    if (inId) score += 60;
    if (inName) score += 50;
    if (nodeMatches.length > 0) score += 35 + nodeMatches.length * 5;
    if (inFullText) score += 15;

    for (const nodeId of nodeMatches) {
      if (!matchedNodes.includes(nodeId)) matchedNodes.push(nodeId);
    }
  }

  if (!matchedSignals.length) return null;

  const age = typeof petData?.ageYears === "number" ? petData.ageYears : null;
  if (age !== null && age >= 7 && normalizeText(record.group) === "geriatrico") {
    score += 20;
  }

  return {
    matchedSignals,
    matchedNodes,
    score,
  };
}

export function findAlgorithmSignalCandidates(input: SignalCandidateInput): AlgorithmSignalCandidate[] {
  const algorithms = Array.isArray(input.algorithms) ? input.algorithms : [];
  const max = typeof input.max === "number" && input.max > 0 ? input.max : 8;

  const signals = getSignals(input.symptomKeys || [], input.message || "");
  if (!signals.length) return [];

  const index = getIndex(algorithms);
  const candidates: AlgorithmSignalCandidate[] = [];

  for (const record of index.records) {
    const scored = scoreRecord(record, signals, input.petData);
    if (!scored) continue;

    candidates.push({
      algorithmId: record.id,
      algorithmName: record.name,
      species: record.species,
      group: record.group,
      matchedSignals: scored.matchedSignals,
      matchedNodes: scored.matchedNodes,
      discriminators: record.discriminators,
      score: scored.score,
      reason: `Matched signals: ${scored.matchedSignals.join(", ")}`,
      algorithm: record.algorithm,
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}
