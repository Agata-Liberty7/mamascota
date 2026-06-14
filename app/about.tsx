import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
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
import MenuButton from "../components/ui/MenuButton";
import SupportHeartButton from "../components/ui/SupportHeartButton";

export default function AboutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { langKey, source } = useLocalSearchParams();

  const normalizedLangKey = Array.isArray(langKey)
    ? langKey[0]
    : langKey ?? "default";

  const normalizedSource = Array.isArray(source) ? source[0] : source;
  const isPreTerms = normalizedSource === "home";
  useEffect(() => {
  navigation.setOptions({
    headerLeft: () => <SupportHeartButton disabled={isPreTerms} />,
    headerRight: () => <MenuButton disabled={isPreTerms} />,
  });
}, [navigation, isPreTerms]);

  const isWeb = Platform.OS === "web";
  const styles = isWeb ? stylesWeb : stylesMobile;
  const [openItem, setOpenItem] = useState<number | null>(1);
  const faqItems = [1, 2, 3, 4, 5, 6];

  const handleInstagramPress = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  const handleWhatsappPress = () => {
    Linking.openURL("https://wa.me/+34666233341");
  };

  const handleLinkedInPress = () => {
    Linking.openURL("https://www.linkedin.com/in/irina-lukina-vet-digital");
  };

  const handleShowOnboarding = () => {
    router.push("/onboarding");
  };

  const handleBackToStart = () => {
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        key={normalizedLangKey}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{i18n.t("about.tagline")}</Text>

        <Image
          source={require("../assets/images/faq1.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <View style={styles.faqWrap}>
          {faqItems.map((item) => {
            const opened = openItem === item;

            return (
              <View key={item} style={styles.faqCard}>
                <TouchableOpacity
                  onPress={() => setOpenItem(opened ? null : item)}
                  style={styles.faqButton}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={opened ? "chevron-down" : "chevron-right"}
                    size={18}
                    color={theme.colors.textPrimary}
                  />

                  <Text style={styles.faqQuestion}>
                    {i18n.t(`about.faq_${item}_q`)}
                  </Text>
                </TouchableOpacity>

                {opened && (
                  <Text style={styles.faqAnswer}>
                    {i18n.t(`about.faq_${item}_a`)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

      {isPreTerms ? (
        <>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBackToStart}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryButtonText}>
                {i18n.t("ok_button")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactsBlock}>
            <Text style={styles.questionFooter}>
              {i18n.t("about.still_have_questions")}
            </Text>

            <View style={styles.contactsRow}>
              <TouchableOpacity
                onPress={handleInstagramPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="instagram" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleWhatsappPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="message-circle" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLinkedInPress}
                style={styles.contactIconButton}
                activeOpacity={0.75}
              >
                <Feather name="linkedin" size={18} color={theme.colors.buttonPrimaryBg} />
                <Text style={styles.contactLink}>LinkedIn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
          <TouchableOpacity
            onPress={handleShowOnboarding}
            style={styles.secondaryButton}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryButtonText}>
              {i18n.t("about.show_onboarding_again")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const stylesMobile = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    alignItems: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },

  heroImage: {
    width: "100%",
    maxWidth: 320,
    height: undefined,
    aspectRatio: 1.367,
    marginTop: -18,
    marginBottom: 6,
  },

  faqWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: 8,
  },

  faqCard: {
    width: "100%",
    marginBottom: 7,
  },

  faqButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF7FF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontStyle: "italic",
    fontWeight: "500",
    lineHeight: 21,
    color: theme.colors.textPrimary,
  },

  faqAnswer: {
    marginTop: 10,
    paddingHorizontal: 18,
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  secondaryButton: {
    alignSelf: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  iconContainer: {
    marginTop: 12,
    alignSelf: "center",
    opacity: 0.9,
  },
  questionFooter: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  footerActions: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  contactsBlock: {
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },

  contactsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  contactIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  contactLink: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },
});

const stylesWeb = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },

  heroImage: {
    width: "100%",
    maxWidth: 420,
    height: undefined,
    aspectRatio: 1.367,
    marginTop: -35,
    marginBottom: 6,
  },

  faqWrap: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: 8,
  },

  faqCard: {
    width: "100%",
    marginBottom: 7,
  },

  faqButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF7FF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "500",
    lineHeight: 21,
    color: theme.colors.textPrimary,
  },

  faqAnswer: {
    marginTop: 10,
    paddingHorizontal: 18,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  
  secondaryButton: {
    alignSelf: "center",
    backgroundColor: theme.colors.buttonPrimaryBg,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  iconContainer: {
    marginTop: 12,
    alignSelf: "center",
    opacity: 0.9,
  },
  questionFooter: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  footerActions: {
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },

  contactsBlock: {
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },

  contactsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  contactIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  contactLink: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryBg,
  },
});