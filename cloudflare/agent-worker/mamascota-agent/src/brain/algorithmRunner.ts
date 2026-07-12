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
