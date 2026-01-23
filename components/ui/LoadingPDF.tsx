import React from "react";
import { Modal, View, ActivityIndicator, Text, StyleSheet } from "react-native";
import i18n from "../../i18n";

type LightModePayload = {
  enabled: boolean;
  phase: "waiting_pdf";
  generatedFrom: string;
  blocks: Array<{
    titleKey: "light_now" | "light_observe" | "light_urgent";
    items: Array<{ id: string; text: string }>;
  }>;
};

export default function LoadingPDF({
  visible,
  lightMode,
}: {
  visible: boolean;
  lightMode?: LightModePayload | null;
}) {

  if (!visible) return null;
  const blocks = lightMode?.enabled ? lightMode.blocks : [];

  const titleFor = (k: "light_now" | "light_observe" | "light_urgent") => {
    if (k === "light_now") return i18n.t("light.now", { defaultValue: "What to do now" });
    if (k === "light_observe") return i18n.t("light.observe", { defaultValue: "What to observe" });
    return i18n.t("light.urgent", { defaultValue: "Go urgently if" });
  };


  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>
            {i18n.t("pdf.generating", { defaultValue: "Generating PDF…" })}
          </Text>

          {blocks.length > 0 ? (
            <View style={styles.lightWrap}>
              {blocks.map((b) => (
                <View key={b.titleKey} style={styles.lightBlock}>
                  <Text style={styles.lightTitle}>{titleFor(b.titleKey)}</Text>

                  {b.items.slice(0, 4).map((it) => (
                    <Text key={it.id} style={styles.lightItem}>
                      • {it.text}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  box: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    alignItems: "stretch",
    width: "86%",
    maxWidth: 420,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  lightWrap: {
    marginTop: 14,
  },
  lightBlock: {
    marginTop: 10,
  },
  lightTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  lightItem: {
    fontSize: 13,
    color: "#333",
    marginBottom: 2,
  },
});
