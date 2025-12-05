import React from "react";
import { Modal, View, ActivityIndicator, Text, StyleSheet } from "react-native";
import i18n from "../../i18n";

export default function LoadingPDF({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>
            {i18n.t("pdf.generating", { defaultValue: "Generating PDF…" })}
          </Text>
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
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    width: 200,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});
