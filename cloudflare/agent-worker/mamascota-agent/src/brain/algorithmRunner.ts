export type AlgorithmRunnerStatus = "idle" | "triage" | "active" | "final";

export type AlgorithmRunnerStep = {
  algorithmId: string;
  nodeId: string;
  question?: string;
  answer?: string;
  nextNodeId?: string;
  isFinal?: boolean;
};

export type AlgorithmRunnerState = {
  version: 1;
  status: AlgorithmRunnerStatus;
  activeAlgorithmId: string | null;
  primaryAlgorithmId: string | null;
  candidateAlgorithmIds: string[];
  coveredSymptomKeys: string[];
  pendingSymptomKeys: string[];
  currentNodeId: string | null;
  currentQuestion: string | null;
  finalNodeId: string | null;
  finalReason: string | null;
  path: AlgorithmRunnerStep[];
};

export function createEmptyAlgorithmRunnerState(): AlgorithmRunnerState {
  return {
    version: 1,
    status: "idle",
    activeAlgorithmId: null,
    primaryAlgorithmId: null,
    candidateAlgorithmIds: [],
    coveredSymptomKeys: [],
    pendingSymptomKeys: [],
    currentNodeId: null,
    currentQuestion: null,
    finalNodeId: null,
    finalReason: null,
    path: [],
  };
}

export type AlgorithmRunnerQuestionNode = {
  nodeId: string;
  question: string;
};

function getAlgorithmSchemaNodes(algorithm: any): any[] {
  if (Array.isArray(algorithm?.esquema)) return algorithm.esquema;
  if (Array.isArray(algorithm?.nodos)) return algorithm.nodos;
  if (Array.isArray(algorithm?.nodes)) return algorithm.nodes;
  if (Array.isArray(algorithm?.arbol)) return algorithm.arbol;
  return [];
}

export function getInitialAlgorithmRunnerQuestion(
  algorithm: any
): AlgorithmRunnerQuestionNode | null {
  const nodes = getAlgorithmSchemaNodes(algorithm);

  const questionNodes = nodes
    .filter(
      (node: any) =>
        normalizeNodeType(node?.tipo) === "pregunta" &&
        typeof node?.pregunta === "string" &&
        node.pregunta.trim().length > 0
    )
    .sort((a: any, b: any) => Number(a?.id || 0) - Number(b?.id || 0));

  const first = questionNodes[0];
  if (!first) return null;

  return {
    nodeId: String(first.id),
    question: first.pregunta.trim(),
  };
}

export type RunnerOption = {
  rawKey: string;
  normalizedKey: string;
  nextNodeId: string;
};

export type AlgorithmRunnerQuestionSnapshot = {
  nodeId: string;
  question: string;
  options: RunnerOption[];
};

function normalizeRunnerText(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?¿¡()[\]{}"'“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRunnerAnswer(value: any) {
  return normalizeRunnerText(value);
}

function normalizeNodeType(value: any) {
  const normalized = normalizeRunnerText(value);

  if (normalized === "diagnostico") return "diagnostico";
  if (normalized === "accion") return "accion";

  return normalized;
}

function normalizeOptionKey(value: any) {
  const normalized = normalizeRunnerText(value);

  if (normalized.startsWith("afirmativo")) return "affirmative";
  if (normalized.startsWith("negativo")) return "negative";

  return normalized;
}

function getRunnerOptions(node: any): RunnerOption[] {
  const options = Array.isArray(node?.opciones) ? node.opciones : [];

  return options
    .flatMap((option: any) => {
      if (!option || typeof option !== "object") return [];

      return Object.entries(option)
        .map(([key, value]) => ({
          rawKey: String(key || "").trim(),
          normalizedKey: normalizeOptionKey(key),
          nextNodeId: value == null ? "" : String(value).trim(),
        }))
        .filter((option) => option.rawKey && option.normalizedKey && option.nextNodeId);
    });
}

export function getAlgorithmRunnerQuestionSnapshot(args: {
  runnerState: AlgorithmRunnerState;
  algorithm: any;
}): AlgorithmRunnerQuestionSnapshot | null {
  const { runnerState, algorithm } = args;

  if (!runnerState || runnerState.status !== "active") return null;
  if (!runnerState.currentNodeId) return null;

  const currentNode = getNodeById(algorithm, runnerState.currentNodeId);
  if (!currentNode) return null;

  const question =
    typeof currentNode?.pregunta === "string"
      ? currentNode.pregunta.trim()
      : runnerState.currentQuestion || "";

  const options = getRunnerOptions(currentNode);

  if (!question || !options.length) return null;

  return {
    nodeId: String(runnerState.currentNodeId),
    question,
    options,
  };
}

function getOrdinalOptionIndex(answer: string): number | null {
  if (
    /(^|\b)(1|primero|primera|first|premier|premiere|erste|primo|prima|первый|первая|первое|первую|ראשון|ראשונה)(\b|$)/i.test(
      answer
    )
  ) {
    return 0;
  }

  if (
    /(^|\b)(2|segundo|segunda|second|deuxieme|zweite|secondo|seconda|второй|вторая|второе|вторую|שני|שניה)(\b|$)/i.test(
      answer
    )
  ) {
    return 1;
  }

  return null;
}

function textContainsOption(answer: string, optionKey: string) {
  if (!answer || !optionKey) return false;
  if (answer === optionKey) return true;

  return ` ${answer} `.includes(` ${optionKey} `);
}

function classifyRunnerAnswerToOption(
  userMessage: string,
  options: RunnerOption[]
): RunnerOption | null {
  const answer = normalizeRunnerAnswer(userMessage);
  if (!answer || !options.length) return null;

  const affirmativeOption = options.find((option) => option.normalizedKey === "affirmative");
  const negativeOption = options.find((option) => option.normalizedKey === "negative");

  const isBinary = !!affirmativeOption && !!negativeOption && options.length === 2;

  if (isBinary) {
    const answerWords = answer.split(" ").filter(Boolean);

    if (answerWords.length <= 2) {
      const compactAnswer = answerWords.join(" ");

      const affirmativeAnswers = new Set([
        "да",
        "yes",
        "si",
        "oui",
        "ja",
        "כן",
        "ага",
        "угу",
        "correcto",
        "claro",
      ]);

      const negativeAnswers = new Set([
        "нет",
        "no",
        "non",
        "nein",
        "לא",
      ]);

      if (affirmativeAnswers.has(compactAnswer)) return affirmativeOption;
      if (negativeAnswers.has(compactAnswer)) return negativeOption;
    }
  }

  const ordinalIndex = getOrdinalOptionIndex(answer);
  if (ordinalIndex != null && options[ordinalIndex]) {
    return options[ordinalIndex];
  }

  const directMatches = options.filter(
    (option) =>
      option.normalizedKey !== "affirmative" &&
      option.normalizedKey !== "negative" &&
      textContainsOption(answer, option.normalizedKey)
  );

  if (directMatches.length === 1) return directMatches[0];

  return null;
}

function getTerminalReasonFromNode(node: any) {
  for (const key of ["titulo", "accion", "recomendaciones", "texto", "nota"]) {
    const value = node?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getNodeById(algorithm: any, nodeId: string | null) {
  if (!nodeId) return null;

  const nodes = getAlgorithmSchemaNodes(algorithm);
  return (
    nodes.find((node: any) => String(node?.id || "").trim() === String(nodeId)) ??
    null
  );
}

function getNextNodeIdFromOptions(node: any, answer: "affirmative" | "negative") {
  const options = Array.isArray(node?.opciones) ? node.opciones : [];
  const wanted = answer === "affirmative" ? "afirmativo" : "negativo";

  for (const option of options) {
    if (!option || typeof option !== "object") continue;

    for (const [key, value] of Object.entries(option)) {
      const normalizedKey = String(key || "").toLowerCase().replace(/[:\s]/g, "");
      if (!normalizedKey.startsWith(wanted)) continue;

      const next = String(value || "").trim();
      return next || null;
    }
  }

  return null;
}

export function advanceAlgorithmRunnerState(args: {
  runnerState: AlgorithmRunnerState;
  algorithm: any;
  userMessage: string;
  selectedOptionKey?: string | null;
}): AlgorithmRunnerState {
  const {
    runnerState,
    algorithm,
    userMessage,
    selectedOptionKey,
  } = args;

  if (!runnerState || runnerState.status !== "active") return runnerState;
  if (!runnerState.activeAlgorithmId || !runnerState.currentNodeId) return runnerState;

  const currentNode = getNodeById(algorithm, runnerState.currentNodeId);
  if (!currentNode) return runnerState;

  const currentQuestion =
    typeof currentNode?.pregunta === "string"
      ? currentNode.pregunta.trim()
      : runnerState.currentQuestion || "";

  const runnerOptions = getRunnerOptions(currentNode);

  const selectedOption =
    selectedOptionKey === undefined
      ? classifyRunnerAnswerToOption(userMessage, runnerOptions)
      : selectedOptionKey
        ? runnerOptions.find(
            (option) => option.normalizedKey === selectedOptionKey
          ) ?? null
        : null;

  if (!selectedOption) return runnerState;

  const nextNodeId = selectedOption.nextNodeId;
  const nextNode = getNodeById(algorithm, nextNodeId);

  if (!nextNode) return runnerState;

  const nextType = normalizeNodeType(nextNode?.tipo);
  const isQuestion =
    nextType === "pregunta" &&
    typeof nextNode?.pregunta === "string" &&
    nextNode.pregunta.trim().length > 0;

  const isTerminal =
    !!nextNode?.fin ||
    nextType === "diagnostico" ||
    nextType === "accion";

  const step: AlgorithmRunnerStep = {
    algorithmId: runnerState.activeAlgorithmId,
    nodeId: String(runnerState.currentNodeId),
    question: currentQuestion || undefined,
    answer: userMessage,
    nextNodeId,
    isFinal: isTerminal,
  };

  if (isQuestion) {
    return {
      ...runnerState,
      currentNodeId: nextNodeId,
      currentQuestion: nextNode.pregunta.trim(),
      path: [...(runnerState.path || []), step],
    };
  }

  return {
    ...runnerState,
    status: isTerminal ? "final" : runnerState.status,
    currentNodeId: nextNodeId,
    currentQuestion: null,
    finalNodeId: isTerminal ? nextNodeId : runnerState.finalNodeId,
    finalReason: isTerminal
      ? getTerminalReasonFromNode(nextNode) || runnerState.finalReason
      : runnerState.finalReason,
    path: [...(runnerState.path || []), step],
  };
}

