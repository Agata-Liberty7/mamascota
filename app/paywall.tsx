import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import i18n from "../i18n";

const SUPPORT_PAYMENT_LINKS = [
  {
    key: "support_199",
    label: "1,99 €",
    url: "https://buy.stripe.com/aFa8wPfAAg0M31d0I41ZS02",
  },
  {
    key: "support_499",
    label: "4,99 €",
    url: "https://buy.stripe.com/dRm8wPagg8ykcBNbmI1ZS03",
  },
  {
    key: "support_999",
    label: "9,99 €",
    url: "https://buy.stripe.com/9B65kDdsseWI8lx1M81ZS04",
  },
  {
    key: "support_1999",
    label: "19,99 €",
    url: "https://buy.stripe.com/5kQ5kDagg29W8lxduQ1ZS05",
  },
];

const CUSTOM_SUPPORT_PAYMENT_URL =
  "https://buy.stripe.com/fZueVdewwcOA45h4Yk1ZS06";

export default function PaywallScreen() {
  const router = useRouter();
  const lang = (i18n.locale || "").split("-")[0];
  const isRTL = lang === "he";

  const handleOpenPayment = async (paymentUrl: string) => {
  const url = paymentUrl;

    try {
      const currentConversationId =
        (await AsyncStorage.getItem("conversationId")) || "";

      const currentPdfConversationId =
        (await AsyncStorage.getItem("pdfConversationId")) || "";

      await AsyncStorage.multiSet([
        ["paymentReturnRoute", "/chat"],
        ["paymentReturnConversationId", currentConversationId],
        ["paymentReturnPdfConversationId", currentPdfConversationId],
      ]);
    } catch (e) {
      console.log("PAYMENT RETURN SAVE ERROR", e);
    }

    if (Platform.OS === "web") {
      window.location.href = url;
      return;
    }

    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
            {i18n.t("paywall.choose_amount", {
              defaultValue: "Choose your support amount",
            })}
          </Text>

          <View style={styles.amountGrid}>
            {SUPPORT_PAYMENT_LINKS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.amountButton}
                onPress={() => handleOpenPayment(item.url)}
              >
                <Text style={styles.amountButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleOpenPayment(CUSTOM_SUPPORT_PAYMENT_URL)}
          >
            <Text style={styles.primaryButtonText}>
              {i18n.t("paywall.custom_amount", {
                defaultValue: "Other amount",
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 96,
    justifyContent: "flex-start",
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
  amountGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  amountButton: {
    minWidth: 110,
    backgroundColor: "#43A047",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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