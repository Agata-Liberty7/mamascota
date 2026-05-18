import React from "react";
import {
    Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import i18n from "../i18n";

export default function PaywallScreen() {
  const router = useRouter();
  const lang = (i18n.locale || "").split("-")[0];
  const isRTL = lang === "he";

  const handleOpenPayment = async () => {
    const baseUrl = process.env.EXPO_PUBLIC_PAYMENT_URL;
    const url = baseUrl ? `${baseUrl}?from=app` : null;
    if (!url) {
      return;
    }

    if (Platform.OS === "web") {
      window.location.href = url;
      return;
    }

    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {i18n.t("paywall.title", { defaultValue: "Full access" })}
          </Text>

          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
            {i18n.t("paywall.subtitle", {
              defaultValue: "Unlock all features",
            })}
          </Text>

          <View style={styles.features}>
            <Text style={styles.feature}>
              • {i18n.t("paywall.feature_1", {
                defaultValue: "PDF report for the veterinarian",
              })}
            </Text>

            <Text style={styles.feature}>
              • {i18n.t("paywall.feature_2", {
                defaultValue: "Saved consultations",
              })}
            </Text>

            <Text style={styles.feature}>
              • {i18n.t("paywall.feature_3", {
                defaultValue: "Support project development",
              })}
            </Text>

            <Text style={styles.note}>
              {i18n.t("paywall.note", {
                defaultValue: "One-time payment, not a subscription.",
              })}
            </Text>

            <Text style={styles.note}>
              {i18n.t("paywall.privacy_note", {
                defaultValue:
                  "Mamascota currently does not require registration and does not collect personal user accounts.",
              })}
            </Text>

            <Text style={styles.note}>
              {i18n.t("paywall.support_note", {
                defaultValue:
                  "Supporting the project now gives access to future features and improvements during development.",
              })}
            </Text>
          </View>

          <Text style={[styles.price, isRTL && styles.textRTL]}>
            {i18n.t("paywall.price", {
              defaultValue: "€1.99",
            })}
          </Text>

          <Text style={[styles.note, isRTL && styles.textRTL]}>
            {i18n.t("paywall.note", {
              defaultValue: "One-time payment, not a subscription.",
            })}
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenPayment}>
            <Text style={styles.primaryButtonText}>
              {i18n.t("paywall.cta", {
                defaultValue: "Unlock full access",
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (Platform.OS === "web") {
                window.history.length > 1
                  ? window.history.back()
                  : (window.location.href = "/");
                return;
              }

              router.back();
            }}

          >
            <Text style={styles.secondaryButtonText}>
              {i18n.t("cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#666",
    textAlign: "center",
  },
  features: {
    marginTop: 20,
  },
  feature: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 10,
  },
  price: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    color: "#777",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#42A5F5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  textRTL: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});