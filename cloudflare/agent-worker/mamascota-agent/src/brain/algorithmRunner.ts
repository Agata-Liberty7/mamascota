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
        String(node?.tipo || "").toLowerCase().trim() === "pregunta" &&
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

function normalizeRunnerAnswer(value: any) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function classifyRunnerAnswer(userMessage: string, question: string): "affirmative" | "negative" | null {
  const answer = normalizeRunnerAnswer(userMessage);
  const q = normalizeRunnerAnswer(question);

  if (!answer) return null;

  const affirmativePattern = /(^|\b)(да|yes|si|oui|ja|כן)(\b|$)/i;
  const negativePattern = /(^|\b)(нет|no|non|nein|לא)(\b|$)/i;

  if (affirmativePattern.test(answer)) return "affirmative";
  if (negativePattern.test(answer)) return "negative";

  if (
    q.includes("repentina") ||
    q.includes("sudden") ||
    q.includes("внезап")
  ) {
    if (
      answer.includes("внезап") ||
      answer.includes("sudden") ||
      answer.includes("repentin") ||
      answer.includes("de golpe") ||
      answer.includes("soudain")
    ) {
      return "affirmative";
    }
  }

  if (
    q.includes("boca abierta") ||
    q.includes("open mouth") ||
    q.includes("открытым ртом")
  ) {
    if (
      answer.includes("открытым ртом") ||
      answer.includes("open mouth") ||
      answer.includes("boca abierta")
    ) {
      return "affirmative";
    }
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
}): AlgorithmRunnerState {
  const { runnerState, algorithm, userMessage } = args;

  if (!runnerState || runnerState.status !== "active") return runnerState;
  if (!runnerState.activeAlgorithmId || !runnerState.currentNodeId) return runnerState;

  const currentNode = getNodeById(algorithm, runnerState.currentNodeId);
  if (!currentNode) return runnerState;

  const currentQuestion =
    typeof currentNode?.pregunta === "string"
      ? currentNode.pregunta.trim()
      : runnerState.currentQuestion || "";

  const answer = classifyRunnerAnswer(userMessage, currentQuestion);
  if (!answer) return runnerState;

  const nextNodeId = getNextNodeIdFromOptions(currentNode, answer);
  if (!nextNodeId) return runnerState;

  const nextNode = getNodeById(algorithm, nextNodeId);

  const step: AlgorithmRunnerStep = {
    algorithmId: runnerState.activeAlgorithmId,
    nodeId: String(runnerState.currentNodeId),
    question: currentQuestion || undefined,
    answer: userMessage,
    nextNodeId,
    isFinal: !!nextNode?.fin,
  };

  const nextType = String(nextNode?.tipo || "").toLowerCase().trim();
  const isQuestion =
    nextType === "pregunta" &&
    typeof nextNode?.pregunta === "string" &&
    nextNode.pregunta.trim().length > 0;

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
    status: nextNode?.fin ? "final" : runnerState.status,
    currentNodeId: nextNodeId,
    currentQuestion: null,
    finalNodeId: nextNode?.fin ? nextNodeId : runnerState.finalNodeId,
    finalReason:
      typeof nextNode?.titulo === "string"
        ? nextNode.titulo
        : runnerState.finalReason,
    path: [...(runnerState.path || []), step],
  };
}

