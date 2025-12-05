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
} from "react-native";
import i18n from "../i18n";

export default function AboutScreen() {
  const router = useRouter();
  const { langKey } = useLocalSearchParams();
  const normalizedLangKey = Array.isArray(langKey) ? langKey[0] : langKey ?? "default";

  const handleInstagramPress = () => {
    Linking.openURL("https://www.instagram.com/mamascota");
  };

  const handleShowOnboarding = () => {
    router.push("/onboarding");
  };

  return (
    // ⬇️ Внешняя обёртка красит фон до края экрана
    <View style={styles.screen}>
      <View key={normalizedLangKey} style={styles.container}>
        <Text style={styles.title}>{i18n.t("about.tagline")}</Text>

        <Image
          source={require("../assets/images/on2.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <Text style={styles.text}>{i18n.t("about.p1")}</Text>
        <Text style={styles.text}>{i18n.t("about.p2")}</Text>
        <Text style={styles.text}>{i18n.t("about.p3")}</Text>
        <Text style={styles.text}>{i18n.t("about.signature")}</Text>

        <TouchableOpacity
          onPress={handleShowOnboarding}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // фон на весь экран
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // контентный блок — поднят вверх
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,        // регулируешь высоту "подъёма"
    // justifyContent: "center",  ❌ не нужно, иначе будет по центру
  },
  heroImage: {
    width: "100%",
    height: 220,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  text: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
    marginBottom: 8,
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
  secondaryButtonText: {
    fontSize: 14,
    color: "#555",
  },
  iconContainer: {
    marginTop: 20,
    alignSelf: "center",
    opacity: 0.9,
  },
});
