import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import i18n from "../i18n";

export default function AboutScreen() {
  const router = useRouter();
  const { langKey } = useLocalSearchParams();
  const normalizedLangKey = Array.isArray(langKey) ? langKey[0] : langKey ?? "default";
  const isWeb = Platform.OS === "web";

  const handleInstagramPress = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  const handleShowOnboarding = () => {
    router.push("/onboarding");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        key={normalizedLangKey}
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          isWeb && styles.containerWeb,
        ]}
      >
        <View style={[styles.headerBlock, isWeb && styles.headerBlockWeb]}>
          <Text style={[styles.title, isWeb && styles.titleWeb]}>
            {i18n.t("about.tagline")}
          </Text>
        </View>

        <View style={[styles.imageBlock, isWeb && styles.imageBlockWeb]}>
          <Image
            source={require("../assets/images/on2.png")}
            style={[styles.heroImage, isWeb && styles.heroImageWeb]}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.textBlock, isWeb && styles.textBlockWeb]}>
          <Text style={[styles.text, isWeb && styles.textWeb]}>
            {i18n.t("about.p1")}
          </Text>
          <Text style={[styles.text, isWeb && styles.textWeb]}>
            {i18n.t("about.p2")}
          </Text>
          <Text style={[styles.text, isWeb && styles.textWeb]}>
            {i18n.t("about.p3")}
          </Text>
          <Text style={[styles.text, styles.signature, isWeb && styles.textWeb]}>
            {i18n.t("about.signature")}
          </Text>
        </View>

        <View style={[styles.actionsBlock, isWeb && styles.actionsBlockWeb]}>
          <TouchableOpacity
            onPress={handleShowOnboarding}
            style={[styles.secondaryButton, isWeb && styles.secondaryButtonWeb]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isWeb && styles.secondaryButtonTextWeb,
              ]}
            >
              {i18n.t("about.show_onboarding_again")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleInstagramPress}
            style={styles.iconContainer}
            accessibilityLabel="Instagram"
          >
            <Feather name="instagram" size={28} color="#E1306C" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    justifyContent: "flex-start",
  },
  containerWeb: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: "flex-start",
  },

  headerBlock: {
    marginBottom: 6,
  },

  headerBlockWeb: {
    marginBottom: 6,
  },

  imageBlock: {
    marginBottom: 8,
    alignItems: "center",
  },

  imageBlockWeb: {
    justifyContent: "center",
    alignItems: "center",
  },

  textBlock: {
    marginBottom: 8,
  },

  textBlockWeb: {
    maxWidth: 640,
    alignSelf: "center",
    marginBottom: 8,
  },

  actionsBlock: {
    alignItems: "center",
    marginTop: 0,
    paddingBottom: 0,
  },

  actionsBlockWeb: {
    marginTop: 12,
  },

  heroImage: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1.45,
    height: undefined,
    marginBottom: 8,
  },

  heroImageWeb: {
    width: "100%",
    maxWidth: 380,
    aspectRatio: 2.45,
    marginTop: 0,
    marginBottom: 0,
  },

  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },

  titleWeb: {
    fontSize: 28,
    marginBottom: 12,
  },

  text: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
  },

  textWeb: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },

  signature: {
    marginTop: 12,
  },

  secondaryButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },

  secondaryButtonWeb: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  secondaryButtonText: {
    fontSize: 14,
    color: "#555",
  },

  secondaryButtonTextWeb: {
    fontSize: 16,
  },

  iconContainer: {
    marginTop: 12,
    alignSelf: "center",
    opacity: 0.9,
  },
});
