import React from "react";
import {
  Alert,
  Image,
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
import { MaterialIcons } from "@expo/vector-icons";

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
  const renderHighlightedText = (
    value: string,
    baseStyle: any
  ) => {
    const parts = String(value).split(/(\[\[.*?\]\])/g);

    return (
      <Text style={[baseStyle, isRTL && styles.textRTL]}>
        {parts.map((part, index) => {
          const match = part.match(/^\[\[(.*?)\]\]$/);
          if (!match) return part;

          const text = match[1];

          return (
            <Text
              key={`${text}-${index}`}
              style={
                text === "Mamascota"
                  ? styles.highlightBrand
                  : styles.highlightBlue
              }
            >
              {text}
            </Text>
          );
        })}
      </Text>
    );
  };
  const [selectedSupportKey, setSelectedSupportKey] =
    React.useState("support_499");

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
          <MaterialIcons
            name="favorite"
            size={42}
            color="#42A5F5"
            style={styles.heart}
          />

          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {i18n.t("paywall.thank_you_title", {
              defaultValue: "Thank you for trusting Mamascota",
            })}
          </Text>

          {renderHighlightedText(
            String(
              i18n.t("paywall.support_text", {
                defaultValue:
                  "[[Mamascota]] is an [[independent project]].\nIf the consultation was useful, you can [[support]] its development with any comfortable amount.",
              })
            ),
            styles.supportText
          )}
          <Image
            source={require("../assets/images/support-bird.png")}
            style={styles.supportBird}
            resizeMode="contain"
          />

          <View style={styles.amountGrid}>
            {SUPPORT_PAYMENT_LINKS.map((item) => {
              const isSelected = selectedSupportKey === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.amountButton,
                    isSelected && styles.amountButtonSelected,
                  ]}
                  onPress={() => setSelectedSupportKey(item.key)}
                >
                  <Text
                    style={[
                      styles.amountButtonText,
                      isSelected && styles.amountButtonTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.customAmountButton}
            onPress={() => handleOpenPayment(CUSTOM_SUPPORT_PAYMENT_URL)}
          >
            <Text style={styles.customAmountButtonText}>
              {i18n.t("paywall.custom_amount", {
                defaultValue: "Other amount",
              })}
            </Text>
          </TouchableOpacity>
        <View style={styles.divider} />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              const selected =
                SUPPORT_PAYMENT_LINKS.find(
                  (item) => item.key === selectedSupportKey
                ) ?? SUPPORT_PAYMENT_LINKS[1];

              handleOpenPayment(selected.url);
            }}
          >
          <Text style={styles.primaryButtonText}>
            {i18n.t("paywall.support_project", {
              defaultValue: "Support",
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
              {i18n.t("paywall.skip", { defaultValue: "Skip" })}
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
    paddingTop: 16,
    paddingBottom: 40,
    justifyContent: "flex-start",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#fff",
  },
  
  heart: {
    alignSelf: "center",
    marginBottom: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginTop: 18,
    marginBottom: 18,
  },

  primaryButton: {
    backgroundColor: "#2F8FD8",
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 0,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: "#666",
    textAlign: "center",
  },
  supportText: {
    marginTop: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    textAlign: "center",
  },
  highlightBrand: {
  fontWeight: "700",
  color: "#444",
},

  highlightBlue: {
    fontWeight: "700",
    color: "#2F8FD8",
  },
  supportBird: {
    width: 170,
    height: 170,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: -4,
  },
  amountGrid: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  amountButton: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B8DDF8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  amountButtonSelected: {
    backgroundColor: "#42A5F5",
    borderColor: "#42A5F5",
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2F8FD8",
    textAlign: "center",
  },

  amountButtonTextSelected: {
    color: "#FFFFFF",
  },
  customAmountButton: {
    alignSelf: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#B8DDF8",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 22,
    backgroundColor: "#FFFFFF",
  },
  customAmountButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F8FD8",
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