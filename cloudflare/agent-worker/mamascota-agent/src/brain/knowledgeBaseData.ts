// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import kb from "./knowledgeBase.json";

export const KNOWLEDGE_BASE = kb as {
  algorithms: any[];
  clinicalDetails: any[];
  breedRisks: any[];
  petDimensions?: any[];
};
