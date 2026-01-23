export type LightModeItem = {
  id: string;
  text: string;
  priority?: 1 | 2 | 3;
};

export type LightModeBlock = {
  titleKey: "light_now" | "light_observe" | "light_urgent";
  items: LightModeItem[];
};

export type LightModePayload = {
  enabled: boolean;
  phase: "waiting_pdf" | "in_dialogue";
  generatedFrom: "decision_tree_cache";
  safety: {
    uiCapabilities: {
      mediaUpload: boolean;
    };
    forbiddenSuggestions: Array<"media_upload" | "new_feature">;
  };
  blocks: LightModeBlock[];
  meta?: {
    decisionTreeVersion?: string;
    conversationId?: string;
    petId?: string;
  };
};
