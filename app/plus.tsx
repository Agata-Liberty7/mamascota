import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import i18n from "@/i18n";

const PLUS_GREEN = "#14B8A6";
const PLUS_DARK = "#0F766E";

const features = [
  ["folder-outline", "plus.feature_1", "plus.feature_1_desc"],
  ["calendar-month-outline", "plus.feature_2", "plus.feature_2_desc"],
  ["file-pdf-box", "plus.feature_3", "plus.feature_3_desc"],
  ["bell-outline", "plus.feature_4", "plus.feature_4_desc"],
  ["infinity", "plus.feature_5", "plus.feature_5_desc"],
] as const;

export default function PlusScreen() {
  const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

    const handleSubscribe = () => {
    const url =
        selectedPlan === "yearly"
        ? PLUS_YEARLY_URL
        : PLUS_MONTHLY_URL;

    Linking.openURL(url);
    };

    const handleClose = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/");
        };

    const PLUS_MONTHLY_URL =
    "https://buy.stripe.com/eVqeVdbkk9Co7ht62o1ZS00";

    const PLUS_YEARLY_URL =
    "https://buy.stripe.com/fZu6oH1JKeWI0T5aiE1ZS07";

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={handleClose}>
          <MaterialCommunityIcons name="chevron-left" size={34} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.title}>{String(i18n.t("plus.title"))}</Text>

        <Text style={styles.headline}>
          {String(i18n.t("plus.headline_1"))}
          {"\n"}
          {String(i18n.t("plus.headline_2"))}
          {"\n"}
          {String(i18n.t("plus.headline_3"))}
        </Text>

        <Text style={styles.subtitle}>{String(i18n.t("plus.subtitle"))}</Text>

        <View style={styles.featuresCard}>
          {features.map(([icon, titleKey, descKey], index) => (
            <View
              key={titleKey}
              style={[
                styles.featureRow,
                index === features.length - 1 && styles.featureRowLast,
              ]}
            >
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons
                  name={icon}
                  size={24}
                  color={PLUS_DARK}
                />
              </View>

              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>
                  {String(i18n.t(titleKey))}
                </Text>
                <Text style={styles.featureDesc}>
                  {String(i18n.t(descKey))}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
        <View style={styles.planList}>
        <Pressable
            style={[
                styles.planOption,
                selectedPlan === "monthly" && styles.planOptionActive,
            ]}
            onPress={() => setSelectedPlan("monthly")}
            >
            <View>
            <Text style={styles.planTitle}>{String(i18n.t("plus.monthly"))}</Text>
            <Text style={styles.planPrice}>{String(i18n.t("plus.price_monthly"))}</Text>
            </View>
            {selectedPlan === "monthly" ? (
                <View style={styles.radioActive}>
                    <View style={styles.radioDot} />
                </View>
                ) : (
                <View style={styles.radioEmpty} />
                )}
        </Pressable>

        <Pressable
            style={[
                styles.planOption,
                selectedPlan === "yearly" && styles.planOptionActive,
            ]}
            onPress={() => setSelectedPlan("yearly")}
            >
            <View>
            <Text style={styles.planTitleActive}>{String(i18n.t("plus.yearly"))}</Text>
            <Text style={styles.planPriceActive}>{String(i18n.t("plus.price_yearly"))}</Text>
            </View>
            {selectedPlan === "yearly" ? (
            <View style={styles.radioActive}>
                <View style={styles.radioDot} />
            </View>
            ) : (
            <View style={styles.radioEmpty} />
            )}
        </Pressable>
        </View>

          <Pressable style={styles.primaryButton} onPress={handleSubscribe}>
            <Text style={styles.primaryButtonText}>
              {String(i18n.t("plus.cta"))}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryButton} onPress={handleClose}>
        <Text style={styles.secondaryButtonText}>
            {String(i18n.t("plus.continue_free"))}
        </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PLUS_GREEN,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: PLUS_GREEN,
  },

  backButton: {
    position: "absolute",
    left: 12,
    top: 14,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  diamond: {
    marginTop: 2,
    marginBottom: 2,
  },

title: {
  alignSelf: "center",
  color: "#FFFFFF",
  fontSize: 17,
  lineHeight: 22,
  fontWeight: "800",
  textAlign: "center",
  marginTop: 4,
  marginBottom: 10,
  paddingHorizontal: 18,
  paddingVertical: 5,
  borderRadius: 999,
  backgroundColor: "rgba(255, 255, 255, 0.16)",
},

  headline: {
    color: "#FFFFFF",
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#EFFFFC",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    maxWidth: 390,
  },

  featuresCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },

  featureRowLast: {
    borderBottomWidth: 0,
  },

  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PLUS_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
  },

  featureTextBlock: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: "#142222",
  },

  featureDesc: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: "#3E4A4A",
  },

  priceCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    marginBottom: 12,
  },

  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginBottom: 6,
  },

  priceText: {
    color: PLUS_DARK,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },

  cancelText: {
    textAlign: "center",
    color: "#314343",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },

  primaryButton: {
    width: "100%",
    borderRadius: 13,
    backgroundColor: PLUS_DARK,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
  },

  secondaryLink: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
planList: {
  gap: 8,
  marginBottom: 10,
},

planOption: {
  width: "100%",
  borderRadius: 14,
  paddingVertical: 10,
  paddingHorizontal: 14,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "rgba(15, 118, 110, 0.22)",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

planOptionActive: {
  backgroundColor: "rgba(20, 184, 166, 0.16)",
  borderColor: PLUS_DARK,
},

radioEmpty: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 1.5,
  borderColor: "rgba(15, 118, 110, 0.45)",
},

radioActive: {
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: PLUS_DARK,
  alignItems: "center",
  justifyContent: "center",
},

radioDot: {
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: PLUS_DARK,
},

planTitle: {
  fontSize: 13,
  fontWeight: "700",
  color: "#314343",
  textAlign: "center",
  marginBottom: 3,
},

planTitleActive: {
  fontSize: 13,
  fontWeight: "800",
  color: PLUS_DARK,
  textAlign: "center",
  marginBottom: 3,
},

planPrice: {
  fontSize: 15,
  fontWeight: "800",
  color: "#314343",
  textAlign: "center",
},

planPriceActive: {
  fontSize: 15,
  fontWeight: "800",
  color: PLUS_DARK,
  textAlign: "center",
},

secondaryButton: {
  borderRadius: 13,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.7)",
  paddingVertical: 10,
  paddingHorizontal: 22,
  backgroundColor: "rgba(255, 255, 255, 0.12)",
},

secondaryButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
  textAlign: "center",
},
});