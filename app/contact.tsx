import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import i18n from "../i18n";
import { theme } from "../src/theme";

export default function ContactScreen() {
  const isWeb = Platform.OS === "web";
  const styles = isWeb ? stylesWeb : stylesMobile;

  const openInstagram = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  const openWhatsapp = () => {
    Linking.openURL("https://wa.me/+34666233341");
  };

  const openLinkedIn = () => {
    Linking.openURL("https://www.linkedin.com/in/irina-lukina-vet-digital");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{i18n.t("contact_page.title")}</Text>

          <Text style={styles.subtitle}>
            {i18n.t("contact_page.subtitle")}
          </Text>

          <Text style={styles.description}>
            {i18n.t("contact_page.description")}
          </Text>

          <View style={styles.links}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={openInstagram}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={String(i18n.t("contact_page.instagram"))}
            >
              <Feather name="instagram" size={20} color={theme.colors.buttonPrimaryBg} />
              <Text style={styles.linkText}>{i18n.t("contact_page.instagram")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={openWhatsapp}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={String(i18n.t("contact_page.whatsapp"))}
            >
              <Feather name="message-circle" size={20} color={theme.colors.buttonPrimaryBg} />
              <Text style={styles.linkText}>{i18n.t("contact_page.whatsapp")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={openLinkedIn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={String(i18n.t("contact_page.linkedin"))}
            >
              <Feather name="linkedin" size={20} color={theme.colors.buttonPrimaryBg} />
              <Text style={styles.linkText}>{i18n.t("contact_page.linkedin")}</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: "center",
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
    marginBottom: 10,
  },

  subtitle: {
    fontWeight: "600",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },

  description: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginBottom: 22,
  },

  links: {
    width: "100%",
    gap: 12,
  },

  linkButton: {
    width: "100%",
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "#EEF7FF",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  linkText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
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
    fontSize: 24,
  },
  subtitle: {
    ...base.subtitle,
    fontSize: 16,
    lineHeight: 22,
  },
  description: {
    ...base.description,
    fontSize: 15,
    lineHeight: 22,
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
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    ...base.description,
    fontSize: 16,
    lineHeight: 24,
  },
});
