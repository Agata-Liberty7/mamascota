import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import i18n from "../i18n";
import { theme } from "../src/theme";

const benefits = [
  "consultation",
  "pdf_report",
  "pdf_languages",
  "continue_consultation",
  "no_registration",
  "no_diagnosis",
] as const;

export default function FreeScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const styles = isWeb ? stylesWeb : stylesMobile;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{i18n.t("free_page.title")}</Text>

          <Text style={styles.subtitle}>{i18n.t("free_page.subtitle")}</Text>

          <View style={styles.list}>
            {benefits.map((key) => (
              <View key={key} style={styles.item}>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={theme.colors.buttonPrimaryBg}
                />
                <Text style={styles.itemText}>
                  {i18n.t(`free_page.benefits.${key}`)}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={String(i18n.t("free_page.continue"))}
          >
            <Text style={styles.buttonText}>{i18n.t("free_page.continue")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const base = {
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },

  title: {
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },

  subtitle: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },

  list: {
    width: "100%",
    gap: 14,
    marginBottom: 26,
  },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: theme.colors.textPrimary,
  },

  button: {
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: theme.colors.buttonPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
} as const;

const stylesMobile = StyleSheet.create({
  ...base,
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 28,
    justifyContent: "center",
  },
  title: {
    ...base.title,
    fontSize: 25,
  },
  subtitle: {
    ...base.subtitle,
    fontSize: 16,
    lineHeight: 23,
  },
});

const stylesWeb = StyleSheet.create({
  ...base,
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 32,
    justifyContent: "center",
  },
  title: {
    ...base.title,
    fontSize: 30,
  },
  subtitle: {
    ...base.subtitle,
    fontSize: 17,
    lineHeight: 24,
  },
});
