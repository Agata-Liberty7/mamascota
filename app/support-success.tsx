import { useEffect } from "react";
import { Button, Text, View } from "react-native";
import { router } from "expo-router";
import i18n from "../i18n";

export default function SupportSuccessScreen() {

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        {i18n.t("paywall.support_success_title")}
      </Text>

      <Text
        style={{
          fontSize: 15,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {i18n.t("paywall.support_success_text")}
      </Text>

      <Button
        title={String(
          i18n.t("paywall.support_success_continue")
        )}
        onPress={() => router.replace("/")}
      />
    </View>
  );
}