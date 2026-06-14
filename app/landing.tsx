import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import i18n from "../i18n";
import { theme } from "../src/theme";

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Mamascota</Text>
        <Text style={styles.subtitle}>
          {String(i18n.t("landing.subtitle"))}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/")}
        >
          <Text style={styles.primaryButtonText}>
            {String(i18n.t("landing.cta_start"))}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  hero: {
    width: "100%",
    maxWidth: 760,
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});